grant usage on schema public to service_role;

grant select on table
  public.profiles,
  public.metrics,
  public.entries,
  public.push_subscriptions,
  public.metric_reminder_deliveries
to service_role;

grant insert on table public.metric_reminder_deliveries to service_role;
grant delete on table public.push_subscriptions to service_role;
