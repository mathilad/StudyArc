-- Study Arc platform upgrade - 2026-09-05
-- Safe to run after the existing Study Arc migrations.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles / onboarding
-- ---------------------------------------------------------------------------
alter table public.student_profiles add column if not exists stream text;
alter table public.student_profiles add column if not exists notification_preferences jsonb not null default '{"next_session":true,"class_reminders":true,"revision_reminders":true,"paper_reminders":true,"missed_plan_reminders":true}'::jsonb;

alter table public.student_profiles drop constraint if exists student_profiles_medium_check;
alter table public.student_profiles add constraint student_profiles_medium_check
  check (medium in ('English', 'Sinhala', 'Tamil'));

-- ---------------------------------------------------------------------------
-- Unified academic activity types. Existing study_sessions remains the source
-- of truth, but it can now represent classes, discussion and review work too.
-- ---------------------------------------------------------------------------
alter table public.study_sessions drop constraint if exists study_sessions_study_type_check;
alter table public.study_sessions add constraint study_sessions_study_type_check
  check (study_type in (
    'Tute Questions', 'Past Papers', 'Study Session', 'Revision',
    'Class', 'Paper Discussion', 'Paper Review', 'Paper Correction'
  ));

alter table public.study_sessions add column if not exists source_class_id uuid references public.class_schedules(id) on delete set null;
alter table public.study_sessions add column if not exists occurrence_key text;
create unique index if not exists study_sessions_user_occurrence_key_uq
  on public.study_sessions(user_id, occurrence_key)
  where occurrence_key is not null;

-- ---------------------------------------------------------------------------
-- Classes
-- ---------------------------------------------------------------------------
alter table public.class_schedules add column if not exists break_minutes integer not null default 0;
alter table public.class_schedules add column if not exists planned_topics text[] not null default '{}';
alter table public.class_schedules drop constraint if exists class_schedules_break_minutes_check;
alter table public.class_schedules add constraint class_schedules_break_minutes_check
  check (break_minutes between 0 and 360);

-- A completed class occurrence may contain multiple subjects and/or topics.
-- The previous unique(user_id, occurrence_key) constraint prevented that.
alter table public.class_learning_records
  drop constraint if exists class_learning_records_user_id_occurrence_key_key;
create unique index if not exists class_learning_records_occurrence_subject_topic_uq
  on public.class_learning_records(user_id, occurrence_key, subject_name, topic_name);

-- ---------------------------------------------------------------------------
-- Class homework / assignments
-- ---------------------------------------------------------------------------
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_class_id uuid references public.class_schedules(id) on delete set null,
  title text not null,
  subject_name text not null,
  topic_name text,
  due_at timestamptz,
  estimated_minutes integer not null default 60 check (estimated_minutes between 5 and 1440),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assignments_user_due_idx on public.assignments(user_id, completed, due_at);

-- ---------------------------------------------------------------------------
-- Exams and separately scheduled paper components (MCQ / essay etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  exam_type text not null default 'School Test',
  starts_on date,
  ends_on date,
  is_main_exam boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_components (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  subject_name text not null,
  component_name text not null,
  exam_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, exam_id, subject_name, component_name)
);
create index if not exists exam_components_user_date_idx on public.exam_components(user_id, exam_at);

-- Topic weakness/mastery can be supplied manually or from paper review.
create table if not exists public.paper_topic_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_name text not null,
  topic_name text not null,
  paper_label text,
  performance_percent numeric(5,2) check (performance_percent between 0 and 100),
  weakness_percent numeric(5,2) check (weakness_percent between 0 and 100),
  source text not null default 'Manual' check (source in ('Manual','Paper','Test')),
  recorded_at timestamptz not null default now()
);
create index if not exists paper_topic_results_user_subject_idx on public.paper_topic_results(user_id, subject_name, topic_name, recorded_at desc);

-- ---------------------------------------------------------------------------
-- Admin roles and remotely configurable app settings
-- ---------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student','content_admin','support_admin','super_admin')),
  updated_at timestamptz not null default now()
);

create or replace function public.is_studyarc_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('content_admin','support_admin','super_admin')
  );
$$;

create or replace function public.is_studyarc_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'super_admin'
  );
$$;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.app_settings(key,value) values
  ('contact_email', to_jsonb('studyarc.arcdex@gmail.com'::text)),
  ('website_url', to_jsonb('https://mathilad.github.io/studyarcweb/'::text)),
  ('buy_me_a_coffee_url', to_jsonb('https://buymeacoffee.com/mathiladinimuthu'::text)),
  ('test_a_margin_percent', '65'::jsonb),
  ('readiness_weights', '{"coverage":0.30,"paperPractice":0.25,"topicMastery":0.20,"consistency":0.15,"recentRevision":0.10}'::jsonb),
  ('feature_flags', '{"globalRanking":true,"catchUpMode":true,"freeTimeMode":true,"readiness":true,"monthlyReports":true}'::jsonb)
on conflict(key) do nothing;

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_key text,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log(created_at desc);

-- Aggregate-only admin dashboard. It does not expose student notes or individual study history.
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  result jsonb;
begin
  if not public.is_studyarc_admin() then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'users', (select count(*) from auth.users),
    'onboardedUsers', (select count(*) from public.student_profiles where onboarding_complete),
    'activeToday', (select count(distinct user_id) from public.study_sessions where started_at >= current_date),
    'sessionsToday', (select count(*) from public.study_sessions where started_at >= current_date),
    'studySecondsToday', (select coalesce(sum(duration_seconds),0) from public.study_sessions where started_at >= current_date),
    'classesConfigured', (select count(*) from public.class_schedules),
    'classLearningRecords', (select count(*) from public.class_learning_records),
    'paperSessions', (select count(*) from public.study_sessions where study_type in ('Past Papers','Paper Discussion','Paper Review','Paper Correction')),
    'testsRecorded', (select count(*) from public.test_marks),
    'pendingAssignments', (select count(*) from public.assignments where not completed)
  ) into result;
  return result;
end;
$$;

-- Allow a signed-in user to permanently delete their own auth account and all
-- child rows that use ON DELETE CASCADE.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id = uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.assignments enable row level security;
alter table public.exams enable row level security;
alter table public.exam_components enable row level security;
alter table public.paper_topic_results enable row level security;
alter table public.user_roles enable row level security;
alter table public.app_settings enable row level security;
alter table public.admin_audit_log enable row level security;

-- Own-data policies
create policy "assignments own all" on public.assignments for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "exams own all" on public.exams for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "exam components own all" on public.exam_components for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "paper topic results own all" on public.paper_topic_results for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Role/settings policies
create policy "read own role" on public.user_roles for select to authenticated using (auth.uid()=user_id or public.is_studyarc_admin());
create policy "super admin manages roles" on public.user_roles for all to authenticated using (public.is_studyarc_super_admin()) with check (public.is_studyarc_super_admin());
create policy "authenticated reads settings" on public.app_settings for select to authenticated using (true);
create policy "admin writes settings" on public.app_settings for all to authenticated using (public.is_studyarc_admin()) with check (public.is_studyarc_admin());
create policy "admin reads audit" on public.admin_audit_log for select to authenticated using (public.is_studyarc_admin());
create policy "admin inserts audit" on public.admin_audit_log for insert to authenticated with check (public.is_studyarc_admin() and admin_user_id=auth.uid());

-- Grants for security-definer functions.
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
