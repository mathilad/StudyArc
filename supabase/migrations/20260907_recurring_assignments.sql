alter table public.assignments
  add column if not exists repeat_pattern text not null default 'None',
  add column if not exists series_id uuid;

alter table public.assignments
  drop constraint if exists assignments_repeat_pattern_check;
alter table public.assignments
  add constraint assignments_repeat_pattern_check
  check (repeat_pattern in ('None','Daily','Weekly'));

create unique index if not exists assignments_series_due_uq
  on public.assignments(user_id,series_id,due_at)
  where series_id is not null and due_at is not null;
