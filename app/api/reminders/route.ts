import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

export const dynamic = "force-dynamic";

type SubscriptionRow = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };
type MetricRow = { id: string; user_id: string; name: string; schedule: "daily" | "weekdays" | "flexible"; weekdays: number[] | null; frequency: "once" | "times" | "interval"; interval_hours: number; schedule_times: string[] };
type ProfileRow = { id: string; timezone: string; push_subscriptions: SubscriptionRow[]; metrics: MetricRow[] };

function localNow(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, minutes: Number(part("hour")) * 60 + Number(part("minute")) };
}

function reminderTimes(metric: MetricRow) {
  if (metric.frequency !== "interval") return metric.schedule_times;
  const start = metric.schedule_times[0]; if (!start) return [];
  const first = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5)); const step = Math.max(1, metric.interval_hours) * 60;
  return Array.from({ length: Math.ceil((1440 - first) / step) }, (_, index) => { const minutes = first + index * step; return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY; const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!url || !serviceKey || !publicKey || !privateKey) return Response.json({ error: "Reminder environment is incomplete" }, { status: 503 });
  webPush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", publicKey, privateKey);
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: profileRows, error: profileError } = await supabase.from("profiles").select("id, timezone").eq("reminders_enabled", true);
  if (profileError) return Response.json({ error: profileError.message }, { status: 500 });
  if (!profileRows?.length) return Response.json({ sent: 0, checked: 0 });
  const userIds = profileRows.map((profile) => profile.id);
  const [{ data: subscriptionRows, error: subscriptionError }, { data: metricRows, error: metricError }] = await Promise.all([
    supabase.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds),
    supabase.from("metrics").select("id, user_id, name, schedule, weekdays, frequency, interval_hours, schedule_times").in("user_id", userIds).eq("notifications_enabled", true).is("archived_at", null),
  ]);
  if (subscriptionError || metricError) return Response.json({ error: subscriptionError?.message ?? metricError?.message }, { status: 500 });
  const data: ProfileRow[] = profileRows.map((profile) => ({
    ...profile,
    push_subscriptions: (subscriptionRows as SubscriptionRow[] | null)?.filter((subscription) => subscription.user_id === profile.id) ?? [],
    metrics: (metricRows as MetricRow[] | null)?.filter((metric) => metric.user_id === profile.id) ?? [],
  }));
  const now = new Date(); let sent = 0;
  for (const profile of data) {
    const local = localNow(now, profile.timezone); const weekday = new Date(`${local.date}T12:00:00Z`).getUTCDay();
    const { data: entries } = await supabase.from("entries").select("metric_id, slot_key").eq("user_id", profile.id).eq("local_date", local.date);
    const { data: deliveries } = await supabase.from("metric_reminder_deliveries").select("metric_id, slot_key").eq("user_id", profile.id).eq("local_date", local.date);
    for (const metric of profile.metrics) {
      if (metric.schedule === "weekdays" && !metric.weekdays?.includes(weekday)) continue;
      for (const time of reminderTimes(metric)) {
        const [hour, minute] = time.split(":").map(Number); const target = hour * 60 + minute;
        if (local.minutes < target || local.minutes - target > 14 || entries?.some((entry) => entry.metric_id === metric.id && entry.slot_key === time) || deliveries?.some((delivery) => delivery.metric_id === metric.id && delivery.slot_key === time)) continue;
        let delivered = false;
        for (const subscription of profile.push_subscriptions) {
          try {
            await webPush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: `Time to log ${metric.name}`, body: "Your scheduled LifeLog check-in is ready.", url: "/" })); delivered = true; sent += 1;
          } catch (pushError) {
            const status = typeof pushError === "object" && pushError && "statusCode" in pushError ? Number(pushError.statusCode) : 0;
            if (status === 404 || status === 410) await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
          }
        }
        if (delivered) await supabase.from("metric_reminder_deliveries").insert({ metric_id: metric.id, user_id: profile.id, local_date: local.date, slot_key: time });
      }
    }
  }
  return Response.json({ sent, checked: data.length });
}
