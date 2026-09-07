alter table public.student_profiles
  add column if not exists morning_routine_minutes integer not null default 90;

alter table public.student_profiles
  drop constraint if exists student_profiles_morning_routine_minutes_check;
alter table public.student_profiles
  add constraint student_profiles_morning_routine_minutes_check
  check (morning_routine_minutes between 0 and 360);

alter table public.class_schedules
  alter column travel_minutes set default 90;

alter table public.class_schedules
  drop constraint if exists class_schedules_travel_minutes_check;
alter table public.class_schedules
  add constraint class_schedules_travel_minutes_check
  check (travel_minutes between 0 and 360);
