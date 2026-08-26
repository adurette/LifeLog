create extension if not exists "pgcrypto";
create type public.metric_type as enum ('number', 'rating', 'boolean', 'choice', 'text');
create type public.logging_mode as enum ('daily', 'event');
create type public.schedule_type as enum ('daily', 'weekdays', 'flexible');
create type public.metric_color as enum ('sage', 'amber', 'blue', 'rose', 'violet');
create type public.event_aggregation as enum ('sum', 'count', 'average');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.metrics (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80), description text check (description is null or char_length(description) <= 240),
  type public.metric_type not null, unit text check (unit is null or char_length(unit) <= 30), logging_mode public.logging_mode not null,
  schedule public.schedule_type not null, weekdays smallint[], color public.metric_color not null default 'sage', rating_min smallint, rating_max smallint,
  options jsonb not null default '[]'::jsonb, aggregation public.event_aggregation, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (type <> 'rating' or (rating_min is not null and rating_max > rating_min)), check (type <> 'choice' or jsonb_array_length(options) >= 2)
);
create table public.entries (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, metric_id uuid not null references public.metrics(id) on delete cascade,
  value jsonb not null, occurred_at timestamptz not null, local_date date not null, timezone text not null, slot_key text not null,
  note text check (note is null or char_length(note) <= 500), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, metric_id, local_date, slot_key)
);
create index metrics_user_active_idx on public.metrics(user_id, archived_at, created_at);
create index entries_user_date_idx on public.entries(user_id, local_date desc);
create index entries_metric_date_idx on public.entries(metric_id, local_date);
alter table public.profiles enable row level security; alter table public.metrics enable row level security; alter table public.entries enable row level security;
create policy "profiles are private" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "metrics are private" on public.metrics for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "entries are private" on public.entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create function public.validate_entry() returns trigger language plpgsql security invoker set search_path = '' as $$
declare metric_record public.metrics%rowtype;
begin
  select * into metric_record from public.metrics where id = new.metric_id and user_id = new.user_id;
  if not found then raise exception 'Metric not found'; end if;
  if metric_record.archived_at is not null then raise exception 'Metric is archived'; end if;
  if metric_record.logging_mode = 'daily' and new.slot_key <> 'daily' then raise exception 'Daily metric requires daily slot'; end if;
  if metric_record.logging_mode = 'event' and new.slot_key = 'daily' then raise exception 'Event metric requires unique slot'; end if;
  if metric_record.type in ('number', 'rating') and jsonb_typeof(new.value) <> 'number' then raise exception 'Numeric value required'; end if;
  if metric_record.type = 'boolean' and jsonb_typeof(new.value) <> 'boolean' then raise exception 'Boolean value required'; end if;
  if metric_record.type in ('choice', 'text') and jsonb_typeof(new.value) <> 'string' then raise exception 'Text value required'; end if;
  new.updated_at = now(); return new;
end; $$;
create trigger validate_entry_before_write before insert or update on public.entries for each row execute function public.validate_entry();
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles (id) values (new.id); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.delete_my_account() returns void language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
