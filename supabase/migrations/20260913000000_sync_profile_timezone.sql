create or replace function public.sync_profile_timezone_from_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set timezone = new.timezone,
      updated_at = now()
  where id = new.user_id
    and timezone is distinct from new.timezone;
  return new;
end;
$$;

drop trigger if exists sync_profile_timezone_after_entry on public.entries;
create trigger sync_profile_timezone_after_entry
after insert or update of timezone on public.entries
for each row execute function public.sync_profile_timezone_from_entry();

with latest_entry as (
  select distinct on (user_id) user_id, timezone
  from public.entries
  order by user_id, occurred_at desc
)
update public.profiles as profile
set timezone = latest_entry.timezone,
    updated_at = now()
from latest_entry
where profile.id = latest_entry.user_id
  and profile.timezone is distinct from latest_entry.timezone;
