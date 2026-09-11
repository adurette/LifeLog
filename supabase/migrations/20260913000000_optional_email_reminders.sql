alter table public.profiles
  add column email_reminders_enabled boolean not null default false,
  add column email_reminder_time time not null default '20:00',
  add column last_email_reminded_on date;
