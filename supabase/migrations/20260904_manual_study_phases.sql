-- Study Arc manual study-phase settings
-- Safe to run more than once in Supabase SQL Editor.

create table if not exists public.study_phase_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phase text not null default 'Foundation',
  exam_name text not null default 'Main exam',
  exam_subjects text[] not null default '{}',
  exam_topics jsonb not null default '{}'::jsonb,
  done_subjects text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.study_phase_settings drop constraint if exists study_phase_settings_phase_check;
alter table public.study_phase_settings
  add constraint study_phase_settings_phase_check
  check (phase in ('Foundation','Strengthening','Paper Practice','Main Exam Preparation','Exam Month'));

alter table public.study_phase_settings enable row level security;

drop policy if exists "read own phase settings" on public.study_phase_settings;
create policy "read own phase settings" on public.study_phase_settings
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "insert own phase settings" on public.study_phase_settings;
create policy "insert own phase settings" on public.study_phase_settings
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "update own phase settings" on public.study_phase_settings;
create policy "update own phase settings" on public.study_phase_settings
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "delete own phase settings" on public.study_phase_settings;
create policy "delete own phase settings" on public.study_phase_settings
for delete to authenticated
using ((select auth.uid()) = user_id);
