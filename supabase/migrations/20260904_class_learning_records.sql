-- Study Arc v1.1.0: class learning is tracked separately from manual syllabus coverage.
-- Safe to run more than once in Supabase SQL Editor.

create table if not exists public.class_learning_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurrence_key text not null,
  class_id uuid references public.class_schedules(id) on delete set null,
  occurrence_date date not null default current_date,
  subject_name text not null,
  topic_name text not null,
  subtopic_names text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, occurrence_key)
);

create index if not exists class_learning_records_user_date_idx
  on public.class_learning_records(user_id, occurrence_date desc, updated_at desc);

alter table public.class_learning_records enable row level security;

drop policy if exists "read own class learning" on public.class_learning_records;
create policy "read own class learning"
  on public.class_learning_records
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own class learning" on public.class_learning_records;
create policy "insert own class learning"
  on public.class_learning_records
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own class learning" on public.class_learning_records;
create policy "update own class learning"
  on public.class_learning_records
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own class learning" on public.class_learning_records;
create policy "delete own class learning"
  on public.class_learning_records
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Old versions stored class-taught subtopics inside syllabus_coverage. They are intentionally
-- left in place for compatibility, but Study Arc v1.1.0 no longer treats source='Class'
-- rows as self-covered syllabus progress. New class learning goes to class_learning_records.
