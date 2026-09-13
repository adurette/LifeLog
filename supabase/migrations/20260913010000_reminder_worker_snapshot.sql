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
    'push_subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', subscription.id,
        'user_id', subscription.user_id,
        'endpoint', subscription.endpoint,
        'p256dh', subscription.p256dh,
        'auth', subscription.auth
      ))
      from public.push_subscriptions as subscription
      where subscription.user_id = profile.id
    ), '[]'::jsonb),
    'metrics', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', metric.id,
        'user_id', metric.user_id,
        'name', metric.name,
        'schedule', metric.schedule,
        'weekdays', metric.weekdays,
        'frequency', metric.frequency,
        'interval_hours', metric.interval_hours,
        'schedule_times', metric.schedule_times
      ))
      from public.metrics as metric
      where metric.user_id = profile.id
        and metric.notifications_enabled
        and metric.archived_at is null
    ), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'metric_id', entry.metric_id,
        'slot_key', entry.slot_key
      ))
      from public.entries as entry
      where entry.user_id = profile.id
        and entry.local_date = (now() at time zone profile.timezone)::date
    ), '[]'::jsonb),
    'deliveries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'metric_id', delivery.metric_id,
        'slot_key', delivery.slot_key
      ))
      from public.metric_reminder_deliveries as delivery
      where delivery.user_id = profile.id
        and delivery.local_date = (now() at time zone profile.timezone)::date
    ), '[]'::jsonb)
  )), '[]'::jsonb)
  from public.profiles as profile
  where profile.reminders_enabled
    and exists (
      select 1 from public.push_subscriptions as subscription
      where subscription.user_id = profile.id
    )
    and exists (
      select 1 from public.metrics as metric
      where metric.user_id = profile.id
        and metric.notifications_enabled
        and metric.archived_at is null
    );
$$;

revoke all on function public.get_reminder_worker_snapshot() from public, anon, authenticated;
grant execute on function public.get_reminder_worker_snapshot() to service_role;
