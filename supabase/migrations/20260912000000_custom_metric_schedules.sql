create type public.frequency_type as enum ('once', 'times', 'interval');

alter table public.metrics
  add column frequency public.frequency_type not null default 'once',
  add column times_per_day smallint not null default 1 check (times_per_day between 1 and 12),
  add column interval_hours smallint not null default 1 check (interval_hours between 1 and 24),
  add column schedule_times text[] not null default '{}',
  add column notifications_enabled boolean not null default false;

create table public.metric_reminder_deliveries (
  metric_id uuid not null references public.metrics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  slot_key text not null,
  delivered_at timestamptz not null default now(),
  primary key (metric_id, local_date, slot_key)
);

alter table public.metric_reminder_deliveries enable row level security;
create policy "reminder deliveries are private" on public.metric_reminder_deliveries
  for select using (auth.uid() = user_id);

create or replace function public.validate_entry() returns trigger language plpgsql security invoker set search_path = '' as $$
declare metric_record public.metrics%rowtype;
begin
  select * into metric_record from public.metrics where id = new.metric_id and user_id = new.user_id;
  if not found then raise exception 'Metric not found'; end if;
  if metric_record.archived_at is not null then raise exception 'Metric is archived'; end if;
  if metric_record.logging_mode = 'event' and new.slot_key = 'daily' then raise exception 'Event metric requires unique slot'; end if;
  if metric_record.type in ('number', 'rating') and jsonb_typeof(new.value) <> 'number' then raise exception 'Numeric value required'; end if;
  if metric_record.type = 'boolean' and jsonb_typeof(new.value) <> 'boolean' then raise exception 'Boolean value required'; end if;
  if metric_record.type in ('choice', 'text') and jsonb_typeof(new.value) <> 'string' then raise exception 'Text value required'; end if;
  new.updated_at = now(); return new;
end; $$;
