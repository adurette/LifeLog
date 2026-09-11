alter table public.metrics
  add column notes_enabled boolean not null default false;
