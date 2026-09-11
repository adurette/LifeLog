import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

export const dynamic = "force-dynamic";

type SubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string };
type MetricRow = { id: string; name: string; schedule: "daily" | "weekdays" | "flexible"; weekdays: number[] | null; frequency: "once" | "times" | "interval"; interval_hours: number; schedule_times: string[] };
type ProfileRow = { id: string; timezone: string; reminders_enabled: boolean; email_reminders_enabled: boolean; email_reminder_time: string; last_email_reminded_on: string | null; push_subscriptions: SubscriptionRow[]; metrics: MetricRow[] };

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

const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY; const privateKey = process.env.VAPID_PRIVATE_KEY; const resendKey = process.env.RESEND_API_KEY; const emailFrom = process.env.REMINDER_EMAIL_FROM;
  if (!url || !serviceKey) return Response.json({ error: "Reminder environment is incomplete" }, { status: 503 });
  if (publicKey && privateKey) webPush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", publicKey, privateKey);
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("profiles").select("id, timezone, reminders_enabled, email_reminders_enabled, email_reminder_time, last_email_reminded_on, push_subscriptions(id, endpoint, p256dh, auth), metrics!inner(id, name, schedule, weekdays, frequency, interval_hours, schedule_times)").or("reminders_enabled.eq.true,email_reminders_enabled.eq.true").eq("metrics.notifications_enabled", true).is("metrics.archived_at", null);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const now = new Date(); let pushSent = 0; let emailSent = 0;
  for (const profile of (data ?? []) as ProfileRow[]) {
    const local = localNow(now, profile.timezone); const weekday = new Date(`${local.date}T12:00:00Z`).getUTCDay();
    const { data: entries } = await supabase.from("entries").select("metric_id, slot_key").eq("user_id", profile.id).eq("local_date", local.date);
    const { data: deliveries } = await supabase.from("metric_reminder_deliveries").select("metric_id, slot_key").eq("user_id", profile.id).eq("local_date", local.date);
    const unfinished: string[] = [];
    for (const metric of profile.metrics) {
      if (metric.schedule === "weekdays" && !metric.weekdays?.includes(weekday)) continue;
      const times = reminderTimes(metric);
      if (times.some((time) => !entries?.some((entry) => entry.metric_id === metric.id && entry.slot_key === time))) unfinished.push(metric.name);
      for (const time of times) {
        const [hour, minute] = time.split(":").map(Number); const target = hour * 60 + minute;
        if (local.minutes < target || local.minutes - target > 14 || entries?.some((entry) => entry.metric_id === metric.id && entry.slot_key === time) || deliveries?.some((delivery) => delivery.metric_id === metric.id && delivery.slot_key === time)) continue;
        let delivered = false;
        for (const subscription of profile.reminders_enabled && publicKey && privateKey ? profile.push_subscriptions : []) {
          try {
            await webPush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: `Time to log ${metric.name}`, body: "Your scheduled LifeLog check-in is ready.", url: "/" })); delivered = true; pushSent += 1;
          } catch (pushError) {
            const status = typeof pushError === "object" && pushError && "statusCode" in pushError ? Number(pushError.statusCode) : 0;
            if (status === 404 || status === 410) await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
          }
        }
        if (delivered) await supabase.from("metric_reminder_deliveries").insert({ metric_id: metric.id, user_id: profile.id, local_date: local.date, slot_key: time });
      }
    }
    const [emailHour, emailMinute] = profile.email_reminder_time.split(":").map(Number); const emailTarget = emailHour * 60 + emailMinute;
    if (profile.email_reminders_enabled && resendKey && emailFrom && unfinished.length && profile.last_email_reminded_on !== local.date && local.minutes >= emailTarget && local.minutes - emailTarget <= 14) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id); const email = authUser.user?.email;
      if (email) {
        const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json", "idempotency-key": `lifelog-${profile.id}-${local.date}`, "user-agent": "LifeLog reminders" }, body: JSON.stringify({ from: emailFrom, to: [email], subject: "Your LifeLog check-ins are waiting", html: `<p>You still have scheduled check-ins for today:</p><ul>${[...new Set(unfinished)].map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul><p><a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL ?? "https://lifelog.app")}">Open LifeLog</a></p>` }) });
        if (response.ok) { await supabase.from("profiles").update({ last_email_reminded_on: local.date }).eq("id", profile.id); emailSent += 1; }
      }
    }
  }
  return Response.json({ pushSent, emailSent, checked: data?.length ?? 0 });
}
