import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

export const dynamic = "force-dynamic";

type SubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string };
type ProfileRow = { id: string; timezone: string; reminder_time: string; last_reminded_on: string | null; push_subscriptions: SubscriptionRow[] };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY; const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!url || !serviceKey || !publicKey || !privateKey) return Response.json({ error: "Reminder environment is incomplete" }, { status: 503 });
  webPush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", publicKey, privateKey);
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("profiles").select("id, timezone, reminder_time, last_reminded_on, push_subscriptions(id, endpoint, p256dh, auth)").eq("reminders_enabled", true);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const now = new Date(); let sent = 0;
  for (const profile of (data ?? []) as ProfileRow[]) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: profile.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
    const localDate = `${part("year")}-${part("month")}-${part("day")}`; const localMinutes = Number(part("hour")) * 60 + Number(part("minute")); const [hour, minute] = profile.reminder_time.split(":").map(Number); const targetMinutes = hour * 60 + minute;
    if (profile.last_reminded_on === localDate || Math.abs(localMinutes - targetMinutes) > 14) continue;
    let delivered = false;
    for (const subscription of profile.push_subscriptions) {
      try {
        await webPush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: "A moment for your LifeLog", body: "Take a minute to notice how your day felt.", url: "/" })); delivered = true; sent += 1;
      } catch (pushError) {
        const status = typeof pushError === "object" && pushError && "statusCode" in pushError ? Number(pushError.statusCode) : 0;
        if (status === 404 || status === 410) await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
      }
    }
    if (delivered) await supabase.from("profiles").update({ last_reminded_on: localDate }).eq("id", profile.id);
  }
  return Response.json({ sent, checked: data?.length ?? 0 });
}
