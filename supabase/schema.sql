-- Study Arc production schema for Supabase
-- Safe to re-run. Supabase Dashboard -> SQL Editor -> New query -> Run.

create extension if not exists pgcrypto;

-- ============================================================
-- STUDY SESSIONS + LAPS
-- ============================================================
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_name text not null,
  topic_name text not null,
  study_type text not null,
  started_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);

alter table public.study_sessions add column if not exists focus_rating integer;
alter table public.study_sessions add column if not exists understanding_rating integer;
alter table public.study_sessions add column if not exists paper_year integer;
alter table public.study_sessions add column if not exists paper_section text;
alter table public.study_sessions add column if not exists attempt_no integer;
alter table public.study_sessions add column if not exists session_note text;

alter table public.study_sessions drop constraint if exists study_sessions_study_type_check;
alter table public.study_sessions add constraint study_sessions_study_type_check
  check (study_type in ('Tute Questions', 'Past Papers', 'Study Session', 'Revision'));

alter table public.study_sessions drop constraint if exists study_sessions_focus_rating_check;
alter table public.study_sessions add constraint study_sessions_focus_rating_check
  check (focus_rating is null or focus_rating between 1 and 5);

alter table public.study_sessions drop constraint if exists study_sessions_understanding_rating_check;
alter table public.study_sessions add constraint study_sessions_understanding_rating_check
  check (understanding_rating is null or understanding_rating between 1 and 5);

alter table public.study_sessions drop constraint if exists study_sessions_paper_section_check;
alter table public.study_sessions add constraint study_sessions_paper_section_check
  check (paper_section is null or paper_section in ('MCQ', 'Essay', 'Full Paper'));

create table if not exists public.study_laps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lap_number integer not null check (lap_number > 0),
  duration_milliseconds bigint not null check (duration_milliseconds >= 0),
  total_milliseconds bigint not null check (total_milliseconds >= 0),
  created_at timestamptz not null default now(),
  unique (session_id, lap_number)
);

-- ============================================================
-- STUDENT PROFILE / ONBOARDING
-- ============================================================
create table if not exists public.student_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  school text,
  district text,
  exam_year integer,
  wake_time text not null default '06:00',
  sleep_time text not null default '22:30',
  self_study_hours numeric(4,1) not null default 3.0,
  subject_choices text[] not null default '{}',
  avatar_url text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- WEEKLY CLASSES
-- day_of_week: 0 Sunday ... 6 Saturday
-- Physical classes default to 90-minute travel buffers in the app.
-- ============================================================
create table if not exists public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_name text not null,
  title text not null default 'Class',
  class_type text not null default 'Theory' check (class_type in ('Theory', 'Revision', 'Paper', 'Extra Class')),
  delivery_mode text not null default 'Physical' check (delivery_mode in ('Physical', 'Online')),
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time text not null,
  end_time text not null,
  pre_review_minutes integer not null default 30 check (pre_review_minutes between 0 and 180),
  travel_minutes integer not null default 90 check (travel_minutes between 0 and 240),
  created_at timestamptz not null default now()
);

-- Keep the class-type constraint current when this schema is re-run on an existing project.
alter table public.class_schedules drop constraint if exists class_schedules_class_type_check;
alter table public.class_schedules
  add constraint class_schedules_class_type_check
  check (class_type in ('Theory', 'Revision', 'Paper', 'Extra Class'));

-- ============================================================
-- TEST MARKS (MCQ + Essay stored separately)
-- ============================================================
create table if not exists public.test_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_name text not null,
  test_date date not null default current_date,
  title text not null default 'Class test',
  mcq_percent numeric(5,2) check (mcq_percent is null or (mcq_percent between 0 and 100)),
  essay_percent numeric(5,2) check (essay_percent is null or (essay_percent between 0 and 100)),
  weak_topics text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.test_marks add column if not exists mcq_score numeric(10,2);
alter table public.test_marks add column if not exists mcq_total numeric(10,2);
alter table public.test_marks add column if not exists essay_score numeric(10,2);
alter table public.test_marks add column if not exists essay_total numeric(10,2);

alter table public.test_marks drop constraint if exists test_marks_mcq_raw_check;
alter table public.test_marks add constraint test_marks_mcq_raw_check
  check (
    (mcq_score is null and mcq_total is null)
    or (mcq_score >= 0 and mcq_total > 0 and mcq_score <= mcq_total)
  );

alter table public.test_marks drop constraint if exists test_marks_essay_raw_check;
alter table public.test_marks add constraint test_marks_essay_raw_check
  check (
    (essay_score is null and essay_total is null)
    or (essay_score >= 0 and essay_total > 0 and essay_score <= essay_total)
  );

-- ============================================================
-- TOPIC MASTERY / RECALL SCHEDULE
-- ============================================================
create table if not exists public.topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_name text not null,
  topic_name text not null,
  coverage integer not null default 0 check (coverage between 0 and 100),
  knowledge integer not null default 0 check (knowledge between 0 and 100),
  memory integer not null default 0 check (memory between 0 and 100),
  performance integer not null default 0 check (performance between 0 and 100),
  last_studied_at timestamptz,
  next_recall_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, subject_name, topic_name)
);


-- ============================================================
-- MANUAL SYLLABUS / SUBTOPIC COVERAGE
-- The learner explicitly marks subtopics as covered or not covered.
-- source records whether the change came from the lesson screen or class-end flow.
-- ============================================================
create table if not exists public.syllabus_coverage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_name text not null,
  topic_name text not null,
  subtopic_name text not null,
  covered boolean not null default false,
  source text not null default 'Manual' check (source in ('Manual', 'Class')),
  covered_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, subject_name, topic_name, subtopic_name)
);



-- ============================================================
-- PAST-PAPER HISTORY ENTERED MANUALLY
-- Lets students record papers completed before installing the app.
-- New stopwatch attempts remain separate study_sessions rows.
-- ============================================================
create table if not exists public.past_paper_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_name text not null,
  paper_year integer not null check (paper_year between 1950 and 2100),
  paper_section text not null check (paper_section in ('MCQ', 'Essay', 'Full Paper')),
  attempts integer not null default 1 check (attempts >= 0 and attempts <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, subject_name, paper_year, paper_section)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists study_sessions_user_started_idx on public.study_sessions(user_id, started_at desc);
create index if not exists study_laps_session_number_idx on public.study_laps(session_id, lap_number);
create index if not exists class_schedules_user_day_idx on public.class_schedules(user_id, day_of_week, start_time);
create index if not exists test_marks_user_date_idx on public.test_marks(user_id, test_date desc);
create index if not exists topic_progress_user_subject_idx on public.topic_progress(user_id, subject_name);
create index if not exists syllabus_coverage_user_subject_idx on public.syllabus_coverage(user_id, subject_name, topic_name);
create index if not exists past_paper_history_user_subject_year_idx on public.past_paper_history(user_id, subject_name, paper_year desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.study_sessions enable row level security;
alter table public.study_laps enable row level security;
alter table public.student_profiles enable row level security;
alter table public.class_schedules enable row level security;
alter table public.test_marks enable row level security;
alter table public.topic_progress enable row level security;
alter table public.syllabus_coverage enable row level security;
alter table public.past_paper_history enable row level security;

-- helper pattern: each authenticated user can CRUD only rows they own.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['study_sessions','study_laps','class_schedules','test_marks','topic_progress','syllabus_coverage','past_paper_history'] loop
    execute format('drop policy if exists "read own %s" on public.%I', tbl, tbl);
    execute format('create policy "read own %s" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', tbl, tbl);
    execute format('drop policy if exists "insert own %s" on public.%I', tbl, tbl);
    execute format('create policy "insert own %s" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', tbl, tbl);
    execute format('drop policy if exists "update own %s" on public.%I', tbl, tbl);
    execute format('create policy "update own %s" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', tbl, tbl);
    execute format('drop policy if exists "delete own %s" on public.%I', tbl, tbl);
    execute format('create policy "delete own %s" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', tbl, tbl);
  end loop;
end $$;

-- Profiles use user_id as the primary key.
drop policy if exists "read own profile" on public.student_profiles;
create policy "read own profile" on public.student_profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "insert own profile" on public.student_profiles;
create policy "insert own profile" on public.student_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "update own profile" on public.student_profiles;
create policy "update own profile" on public.student_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Extra integrity for lap insert: lap must point at one of the user's sessions.
drop policy if exists "insert own study_laps" on public.study_laps;
create policy "insert own study_laps" on public.study_laps for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.study_sessions s where s.id = session_id and s.user_id = (select auth.uid()))
);

-- ============================================================
-- PROFILE AVATARS (Supabase Storage)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "avatar upload own folder" on storage.objects;
create policy "avatar upload own folder" on storage.objects
for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatar update own folder" on storage.objects;
create policy "avatar update own folder" on storage.objects
for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatar delete own folder" on storage.objects;
create policy "avatar delete own folder" on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ============================================================
-- SOCIAL PROFILE / DAILY STUDY RANKING
-- Public social data is intentionally minimal: name, avatar, friend code,
-- daily study total, and studying-now presence. Private sessions/marks stay private.
-- ============================================================
create table if not exists public.social_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Student',
  avatar_url text,
  friend_code text not null unique,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_study_rankings (
  user_id uuid not null references auth.users(id) on delete cascade,
  study_date date not null,
  study_seconds integer not null default 0 check (study_seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, study_date)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create table if not exists public.study_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_studying boolean not null default false,
  subject_name text,
  topic_name text,
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists daily_study_rankings_date_seconds_idx
  on public.daily_study_rankings(study_date, study_seconds desc);
create index if not exists friendships_requester_idx on public.friendships(requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id, status);
create unique index if not exists friendships_pair_unique_idx on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists study_presence_updated_idx on public.study_presence(updated_at desc);
create index if not exists contact_messages_user_created_idx on public.contact_messages(user_id, created_at desc);

alter table public.social_profiles enable row level security;
alter table public.daily_study_rankings enable row level security;
alter table public.friendships enable row level security;
alter table public.study_presence enable row level security;
alter table public.contact_messages enable row level security;

-- Authenticated students can see the minimal public profile needed by ranking/friends.
drop policy if exists "read social profiles" on public.social_profiles;
create policy "read social profiles" on public.social_profiles
for select to authenticated using (true);
drop policy if exists "insert own social profile" on public.social_profiles;
create policy "insert own social profile" on public.social_profiles
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "update own social profile" on public.social_profiles;
create policy "update own social profile" on public.social_profiles
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Daily leaderboard is visible to signed-in users, but each user can only write their own total.
drop policy if exists "read daily rankings" on public.daily_study_rankings;
create policy "read daily rankings" on public.daily_study_rankings
for select to authenticated using (true);
drop policy if exists "insert own daily ranking" on public.daily_study_rankings;
create policy "insert own daily ranking" on public.daily_study_rankings
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "update own daily ranking" on public.daily_study_rankings;
create policy "update own daily ranking" on public.daily_study_rankings
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Friend rows are visible only to either side of the relationship.
drop policy if exists "read own friendships" on public.friendships;
create policy "read own friendships" on public.friendships
for select to authenticated using ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);
drop policy if exists "request friendship" on public.friendships;
create policy "request friendship" on public.friendships
for insert to authenticated with check ((select auth.uid()) = requester_id and requester_id <> addressee_id);
drop policy if exists "recipient updates friendship" on public.friendships;
create policy "recipient updates friendship" on public.friendships
for update to authenticated using ((select auth.uid()) = addressee_id)
with check ((select auth.uid()) = addressee_id);
drop policy if exists "either side deletes friendship" on public.friendships;
create policy "either side deletes friendship" on public.friendships
for delete to authenticated using ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);

-- Presence can be read by signed-in users; the app only surfaces it for accepted friends.
drop policy if exists "read study presence" on public.study_presence;
create policy "read study presence" on public.study_presence
for select to authenticated using (true);
drop policy if exists "insert own study presence" on public.study_presence;
create policy "insert own study presence" on public.study_presence
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "update own study presence" on public.study_presence;
create policy "update own study presence" on public.study_presence
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Support messages are private to the sender. Dashboard admins can access them with service-role tooling.
drop policy if exists "insert own contact message" on public.contact_messages;
create policy "insert own contact message" on public.contact_messages
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "read own contact messages" on public.contact_messages;
create policy "read own contact messages" on public.contact_messages
for select to authenticated using ((select auth.uid()) = user_id);

-- Add realtime tables idempotently. Supabase's default realtime publication is supabase_realtime.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='daily_study_rankings') then
      alter publication supabase_realtime add table public.daily_study_rankings;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='friendships') then
      alter publication supabase_realtime add table public.friendships;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='study_presence') then
      alter publication supabase_realtime add table public.study_presence;
    end if;
  end if;
end $$;

-- ============================================================
-- DAILY END-OF-DAY REVIEWS
-- Offline-first: the app caches these locally and syncs later.
-- ============================================================
create table if not exists public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_date date not null,
  pages_studied integer not null default 0 check (pages_studied >= 0),
  pages_revised integer not null default 0 check (pages_revised >= 0),
  completed_blocks integer not null default 0 check (completed_blocks >= 0),
  day_rating integer not null default 3 check (day_rating between 1 and 5),
  attention_topics text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, review_date)
);

create index if not exists daily_reviews_user_date_idx on public.daily_reviews(user_id, review_date desc);
alter table public.daily_reviews enable row level security;
drop policy if exists "read own daily_reviews" on public.daily_reviews;
create policy "read own daily_reviews" on public.daily_reviews for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "insert own daily_reviews" on public.daily_reviews;
create policy "insert own daily_reviews" on public.daily_reviews for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "update own daily_reviews" on public.daily_reviews;
create policy "update own daily_reviews" on public.daily_reviews for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "delete own daily_reviews" on public.daily_reviews;
create policy "delete own daily_reviews" on public.daily_reviews for delete to authenticated using ((select auth.uid()) = user_id);
