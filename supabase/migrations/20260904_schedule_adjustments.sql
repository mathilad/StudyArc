-- Study Arc protected time + one-week class adjustments
-- Run once in Supabase SQL Editor. Safe to rerun.

create table if not exists public.protected_times (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  recurrence text not null default 'This Week',
  day_of_week integer not null check (day_of_week between 0 and 6),
  event_date date,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint protected_times_recurrence_check check (recurrence in ('Weekly','This Week')),
  constraint protected_times_valid_time check (end_time > start_time)
);

create index if not exists protected_times_user_day_idx
  on public.protected_times (user_id, day_of_week, start_time);

alter table public.protected_times enable row level security;

drop policy if exists "read own protected times" on public.protected_times;
create policy "read own protected times" on public.protected_times
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "insert own protected times" on public.protected_times;
create policy "insert own protected times" on public.protected_times
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "update own protected times" on public.protected_times;
create policy "update own protected times" on public.protected_times
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "delete own protected times" on public.protected_times;
create policy "delete own protected times" on public.protected_times
for delete to authenticated
using ((select auth.uid()) = user_id);

create table if not exists public.class_week_overrides (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.class_schedules(id) on delete cascade,
  week_start date not null,
  status text not null,
  rescheduled_date date,
  start_time time,
  end_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_week_overrides_status_check check (status in ('Missed','Rescheduled')),
  constraint class_week_overrides_reschedule_fields check (
    (status = 'Missed' and rescheduled_date is null and start_time is null and end_time is null)
    or
    (status = 'Rescheduled' and rescheduled_date is not null and start_time is not null and end_time is not null and end_time > start_time)
  ),
  unique (user_id, class_id, week_start)
);

create index if not exists class_week_overrides_user_week_idx
  on public.class_week_overrides (user_id, week_start);

alter table public.class_week_overrides enable row level security;

drop policy if exists "read own class week overrides" on public.class_week_overrides;
create policy "read own class week overrides" on public.class_week_overrides
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "insert own class week overrides" on public.class_week_overrides;
create policy "insert own class week overrides" on public.class_week_overrides
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "update own class week overrides" on public.class_week_overrides;
create policy "update own class week overrides" on public.class_week_overrides
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "delete own class week overrides" on public.class_week_overrides;
create policy "delete own class week overrides" on public.class_week_overrides
for delete to authenticated
using ((select auth.uid()) = user_id);
