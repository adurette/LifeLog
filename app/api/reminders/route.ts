import { createClient } from "@supabase/supabase-js";
import { after } from "next/server";
import webPush from "web-push";

export const dynamic = "force-dynamic";

type SubscriptionRow = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };
type MetricRow = { id: string; user_id: string; name: string; schedule: "daily" | "weekdays" | "flexible"; weekdays: number[] | null; frequency: "once" | "times" | "interval"; interval_hours: number; schedule_times: string[] };
type EntryRow = { metric_id: string; slot_key: string };
type ProfileRow = { id: string; timezone: string; daily_reminder_enabled: boolean; reminder_time: string; last_reminded_on: string | null; push_subscriptions: SubscriptionRow[]; metrics: MetricRow[]; entries: EntryRow[]; deliveries: EntryRow[] };
type QueryResult = { error: { message: string } | null };

async function withGatewayRetry<T extends QueryResult>(query: () => PromiseLike<T>, attempts = 3): Promise<T> {
  let result = await query();
  for (let attempt = 1; result.error?.message === "Gateway Timeout" && attempt < attempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    result = await query();
  }
  return result;
}

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

export function checkInIsComplete(metric: MetricRow, time: string, entries: EntryRow[]) {
  return entries.some((entry) => entry.metric_id === metric.id && (metric.frequency === "once" || entry.slot_key === time));
}

async function processReminders(url: string, serviceKey: string, publicKey: string, privateKey: string) {
  webPush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", publicKey, privateKey);
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: snapshot, error: snapshotError } = await withGatewayRetry(() => supabase.rpc("get_reminder_worker_snapshot"));
  if (snapshotError) throw new Error(`Reminder snapshot query failed: ${snapshotError.message}`);
  const data = (Array.isArray(snapshot) ? snapshot : []) as ProfileRow[];
  if (!data.length) { console.info("Reminder worker finished", { sent: 0, checked: 0 }); return; }
  const now = new Date(); let sent = 0;
  for (const profile of data) {
    const local = localNow(now, profile.timezone); const weekday = new Date(`${local.date}T12:00:00Z`).getUTCDay();
    const [dailyHour, dailyMinute] = profile.reminder_time.split(":").map(Number); const dailyTarget = dailyHour * 60 + dailyMinute;
    if (profile.daily_reminder_enabled && profile.last_reminded_on !== local.date && local.minutes >= dailyTarget && local.minutes - dailyTarget <= 14) {
      let delivered = false;
      for (const subscription of profile.push_subscriptions) {
        try {
          await webPush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: "Time for your LifeLog", body: "Take a moment to fill out today’s metrics.", url: "/", tag: `daily-${profile.id}-${local.date}` }), { timeout: 1500 }); delivered = true; sent += 1;
        } catch (pushError) {
          console.error("Daily reminder push failed", pushError);
          const status = typeof pushError === "object" && pushError && "statusCode" in pushError ? Number(pushError.statusCode) : 0;
          if (status === 404 || status === 410) await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
        }
      }
      if (delivered) {
        const { error: deliveryError } = await withGatewayRetry(() => supabase.rpc("mark_daily_reminder_delivered", { target_user_id: profile.id, target_date: local.date }));
        if (deliveryError) console.error("Daily reminder delivery record failed", deliveryError);
      }
    }
    for (const metric of profile.metrics) {
      if (metric.schedule === "flexible" || (metric.schedule === "weekdays" && !metric.weekdays?.includes(weekday))) continue;
      for (const time of reminderTimes(metric)) {
        const [hour, minute] = time.split(":").map(Number); const target = hour * 60 + minute;
        if (local.minutes < target || local.minutes - target > 14 || checkInIsComplete(metric, time, profile.entries) || profile.deliveries.some((delivery) => delivery.metric_id === metric.id && delivery.slot_key === time)) continue;
        let delivered = false;
        for (const subscription of profile.push_subscriptions) {
          try {
            await webPush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: `Time to log ${metric.name}`, body: "Your scheduled LifeLog check-in is ready.", url: "/", tag: `metric-${metric.id}-${local.date}-${time}` }), { timeout: 1500 }); delivered = true; sent += 1;
          } catch (pushError) {
            console.error("Reminder push failed", pushError);
            const status = typeof pushError === "object" && pushError && "statusCode" in pushError ? Number(pushError.statusCode) : 0;
            if (status === 404 || status === 410) await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
          }
        }
        if (delivered) {
          const { error: deliveryError } = await withGatewayRetry(() => supabase.from("metric_reminder_deliveries").upsert({ metric_id: metric.id, user_id: profile.id, local_date: local.date, slot_key: time }, { onConflict: "metric_id,local_date,slot_key", ignoreDuplicates: true }));
          if (deliveryError) console.error("Reminder delivery record failed", deliveryError);
        }
      }
    }
  }
  console.info("Reminder worker finished", { sent, checked: data.length });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY; const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!url || !serviceKey || !publicKey || !privateKey) return Response.json({ error: "Reminder environment is incomplete" }, { status: 503 });
  after(() => processReminders(url, serviceKey, publicKey, privateKey));
  return Response.json({ queued: true });
}
