alter table public.profiles
  add column if not exists reminders_enabled boolean not null default false,
  add column if not exists reminder_time time not null default '20:00',
  add column if not exists last_reminded_on date;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.beta_invites (
  email text primary key,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  beta_mode boolean not null default false
);
insert into public.app_settings (id, beta_mode) values (true, false) on conflict (id) do nothing;

create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  stack text,
  digest text,
  page text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.beta_invites enable row level security;
alter table public.app_settings enable row level security;
alter table public.app_errors enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.metrics, public.entries, public.push_subscriptions to authenticated;
grant insert on public.app_errors to anon, authenticated;
grant usage, select on sequence public.app_errors_id_seq to anon, authenticated;

create policy "subscriptions are private" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can report errors" on public.app_errors for insert with check (auth.uid() = user_id or user_id is null);

create or replace function public.enforce_beta_invite() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select beta_mode from public.app_settings where id = true) and not exists (select 1 from public.beta_invites where lower(email) = lower(new.email)) then
    raise exception 'This private beta requires an invitation.';
  end if;
  return new;
end; $$;

drop trigger if exists enforce_beta_invite_before_signup on auth.users;
create trigger enforce_beta_invite_before_signup before insert on auth.users for each row execute function public.enforce_beta_invite();

create or replace function public.accept_beta_invite() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.beta_invites set accepted_at = now() where lower(email) = lower(new.email);
  return new;
end; $$;

drop trigger if exists accept_beta_invite_after_signup on auth.users;
create trigger accept_beta_invite_after_signup after insert on auth.users for each row execute function public.accept_beta_invite();
