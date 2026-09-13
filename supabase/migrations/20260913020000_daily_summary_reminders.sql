alter table public.profiles
  add column if not exists daily_reminder_enabled boolean not null default false;

create or replace function public.get_reminder_worker_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', profile.id,
    'timezone', profile.timezone,
    'daily_reminder_enabled', profile.daily_reminder_enabled,
    'reminder_time', to_char(profile.reminder_time, 'HH24:MI'),
    'last_reminded_on', profile.last_reminded_on,
    'push_subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object('id', subscription.id, 'user_id', subscription.user_id, 'endpoint', subscription.endpoint, 'p256dh', subscription.p256dh, 'auth', subscription.auth))
      from public.push_subscriptions as subscription where subscription.user_id = profile.id
    ), '[]'::jsonb),
    'metrics', coalesce((
      select jsonb_agg(jsonb_build_object('id', metric.id, 'user_id', metric.user_id, 'name', metric.name, 'schedule', metric.schedule, 'weekdays', metric.weekdays, 'frequency', metric.frequency, 'interval_hours', metric.interval_hours, 'schedule_times', metric.schedule_times))
      from public.metrics as metric
      where metric.user_id = profile.id and metric.notifications_enabled and metric.archived_at is null
    ), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object('metric_id', entry.metric_id, 'slot_key', entry.slot_key))
      from public.entries as entry
      where entry.user_id = profile.id and entry.local_date = (now() at time zone profile.timezone)::date
    ), '[]'::jsonb),
    'deliveries', coalesce((
      select jsonb_agg(jsonb_build_object('metric_id', delivery.metric_id, 'slot_key', delivery.slot_key))
      from public.metric_reminder_deliveries as delivery
      where delivery.user_id = profile.id and delivery.local_date = (now() at time zone profile.timezone)::date
    ), '[]'::jsonb)
  )), '[]'::jsonb)
  from public.profiles as profile
  where profile.reminders_enabled
    and exists (select 1 from public.push_subscriptions as subscription where subscription.user_id = profile.id)
    and (profile.daily_reminder_enabled or exists (
      select 1 from public.metrics as metric
      where metric.user_id = profile.id and metric.notifications_enabled and metric.archived_at is null
    ));
$$;

create or replace function public.mark_daily_reminder_delivered(target_user_id uuid, target_date date)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set last_reminded_on = target_date, updated_at = now()
  where id = target_user_id and daily_reminder_enabled;
$$;

revoke all on function public.get_reminder_worker_snapshot() from public, anon, authenticated;
revoke all on function public.mark_daily_reminder_delivered(uuid, date) from public, anon, authenticated;
grant execute on function public.get_reminder_worker_snapshot() to service_role;
grant execute on function public.mark_daily_reminder_delivered(uuid, date) to service_role;
