-- Study Arc v1.1.2 academic catalog, planner health and official exam sync

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Remote academic catalog. Bundled app data remains the offline fallback.
-- ---------------------------------------------------------------------------
create table if not exists public.academic_subject_catalog (
  subject_name text primary key,
  streams text[] not null default '{}',
  paper_components text[] not null default array['Paper I','Paper II']::text[],
  enabled boolean not null default true,
  source_label text not null default 'National Institute of Education, Sri Lanka',
  source_url text not null default 'https://nie.lk/selesyll?helixMode=edit',
  verification_status text not null default 'needs_review' check (verification_status in ('verified','needs_review','draft')),
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.academic_topic_catalog (
  id uuid primary key default gen_random_uuid(),
  subject_name text not null references public.academic_subject_catalog(subject_name) on delete cascade,
  topic_key text not null,
  title_en text not null,
  title_si text,
  title_ta text,
  unit_name text,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  source_label text not null default 'National Institute of Education, Sri Lanka',
  source_url text not null default 'https://nie.lk/selesyll?helixMode=edit',
  verification_status text not null default 'needs_review' check (verification_status in ('verified','needs_review','draft')),
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique(subject_name, topic_key)
);
create index if not exists academic_topic_catalog_subject_idx on public.academic_topic_catalog(subject_name, enabled, sort_order);

-- Register every subject exposed by the current Sri Lankan A/L stream selector.
with seed(subject_name, streams) as (
  values
    ('Combined Mathematics',array['Physical Science','Commerce','Arts']::text[]),
    ('Higher Mathematics',array['Physical Science']::text[]),
    ('Physics',array['Physical Science','Biological Science']::text[]),
    ('Chemistry',array['Physical Science','Biological Science']::text[]),
    ('Biology',array['Biological Science']::text[]),
    ('Mathematics',array['Biological Science','Commerce','Engineering Technology','Biosystems Technology','Arts']::text[]),
    ('Agricultural Science',array['Biological Science','Commerce','Engineering Technology','Biosystems Technology','Arts']::text[]),
    ('Accounting',array['Commerce','Engineering Technology','Biosystems Technology','Arts']::text[]),
    ('Business Studies',array['Commerce','Engineering Technology','Biosystems Technology','Arts']::text[]),
    ('Economics',array['Commerce','Engineering Technology','Biosystems Technology','Arts']::text[]),
    ('Business Statistics',array['Commerce','Arts']::text[]),
    ('Geography',array['Commerce','Engineering Technology','Biosystems Technology','Arts']::text[]),
    ('German',array['Commerce','Arts']::text[]),
    ('History',array['Commerce','Arts']::text[]),
    ('Political Science',array['Commerce','Arts']::text[]),
    ('English',array['Commerce','Engineering Technology','Biosystems Technology','Arts']::text[]),
    ('Logic and Scientific Method',array['Commerce','Arts']::text[]),
    ('French',array['Commerce','Arts']::text[]),
    ('ICT',array['Commerce','Engineering Technology','Biosystems Technology','Arts']::text[]),
    ('Engineering Technology',array['Engineering Technology']::text[]),
    ('Biosystems Technology',array['Biosystems Technology']::text[]),
    ('Science for Technology',array['Engineering Technology','Biosystems Technology']::text[]),
    ('Home Economics',array['Engineering Technology','Biosystems Technology','Arts']::text[]),
    ('Communication and Media Studies',array['Engineering Technology','Biosystems Technology','Arts']::text[]),
    ('Art',array['Engineering Technology','Biosystems Technology','Arts']::text[]),
    ('Civil Technology',array['Arts']::text[]),
    ('Electrical Electronic and Information Technology',array['Arts']::text[]),
    ('Agro Technology',array['Arts']::text[]),
    ('Mechanical Technology',array['Arts']::text[]),
    ('Food Technology',array['Arts']::text[]),
    ('Bio-Resource Technology',array['Arts']::text[]),
    ('Buddhism',array['Arts']::text[]),('Buddhist Civilization',array['Arts']::text[]),
    ('Hinduism',array['Arts']::text[]),('Hindu Civilization',array['Arts']::text[]),
    ('Christianity',array['Arts']::text[]),('Christian Civilization',array['Arts']::text[]),
    ('Islam',array['Arts']::text[]),('Islamic Civilization',array['Arts']::text[]),
    ('Greek and Roman Civilization',array['Arts']::text[]),
    ('Dancing - Sinhala',array['Arts']::text[]),('Bharatha Natyam',array['Arts']::text[]),
    ('Oriental Music',array['Arts']::text[]),('Carnatic Music',array['Arts']::text[]),('Western Music',array['Arts']::text[]),
    ('Drama and Theatre - Sinhala',array['Arts']::text[]),('Drama and Theatre - Tamil',array['Arts']::text[]),('Drama and Theatre - English',array['Arts']::text[]),
    ('Sinhala',array['Arts']::text[]),('Tamil',array['Arts']::text[]),('Arabic',array['Arts']::text[]),
    ('Pali',array['Arts']::text[]),('Sanskrit',array['Arts']::text[]),('Chinese',array['Arts']::text[]),
    ('Hindi',array['Arts']::text[]),('Japanese',array['Arts']::text[]),('Malay',array['Arts']::text[]),('Russian',array['Arts']::text[])
)
insert into public.academic_subject_catalog(subject_name, streams, paper_components)
select subject_name, streams,
  case when subject_name in ('Physics','Chemistry','Biology','Agricultural Science') then array['MCQ','Structured / Essay']::text[]
       else array['Paper I','Paper II']::text[] end
from seed
on conflict(subject_name) do update set streams=excluded.streams;

-- ---------------------------------------------------------------------------
-- Multiple expected topics for a weekly class occurrence / paper class.
-- ---------------------------------------------------------------------------
alter table public.class_week_overrides add column if not exists topic_names text[] not null default '{}';
update public.class_week_overrides set topic_names=array[topic_name] where topic_name is not null and coalesce(array_length(topic_names,1),0)=0;

-- ---------------------------------------------------------------------------
-- Department of Examinations schedule mirror. Content admins update the mirror;
-- every student device then synchronizes its own main-exam components from it.
-- ---------------------------------------------------------------------------
create table if not exists public.official_exam_schedule (
  id uuid primary key default gen_random_uuid(),
  exam_year integer not null check (exam_year between 2020 and 2100),
  subject_name text not null,
  component_name text not null,
  exam_at timestamptz not null,
  duration_minutes integer check (duration_minutes between 15 and 600),
  source_label text not null default 'Department of Examinations, Sri Lanka',
  source_url text not null default 'https://www.doenets.lk/news',
  source_document_version text,
  amended boolean not null default false,
  published_at timestamptz,
  verified_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique(exam_year, subject_name, component_name)
);
create index if not exists official_exam_schedule_year_subject_idx on public.official_exam_schedule(exam_year, subject_name, exam_at);

create or replace function public.sync_my_main_exam_from_official()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  uid uuid:=auth.uid();
  y integer;
  choices text[];
  exam_id uuid;
  synced integer:=0;
  first_date date;
  last_date date;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select exam_year,coalesce(subject_choices,'{}'::text[]) into y,choices from public.student_profiles where user_id=uid;
  if y is null or coalesce(array_length(choices,1),0)=0 then return jsonb_build_object('synced',0,'reason','profile_incomplete'); end if;

  select min(exam_at)::date,max(exam_at)::date into first_date,last_date
  from public.official_exam_schedule
  where exam_year=y and subject_name=any(choices);
  if first_date is null then return jsonb_build_object('synced',0,'reason','official_schedule_unavailable','examYear',y); end if;

  select id into exam_id from public.exams where user_id=uid and is_main_exam=true order by updated_at desc limit 1;
  if exam_id is null then
    insert into public.exams(user_id,name,exam_type,starts_on,ends_on,is_main_exam)
    values(uid,'G.C.E. Advanced Level Examination - '||y,'G.C.E. A/L',first_date,last_date,true)
    returning id into exam_id;
  else
    update public.exams set name='G.C.E. Advanced Level Examination - '||y,exam_type='G.C.E. A/L',starts_on=first_date,ends_on=last_date,updated_at=now() where id=exam_id and user_id=uid;
  end if;

  insert into public.exam_components(user_id,exam_id,subject_name,component_name,exam_at)
  select uid,exam_id,s.subject_name,s.component_name,s.exam_at
  from public.official_exam_schedule s
  where s.exam_year=y and s.subject_name=any(choices)
  on conflict(user_id,exam_id,subject_name,component_name) do update set exam_at=excluded.exam_at;
  get diagnostics synced=row_count;
  return jsonb_build_object('synced',synced,'examId',exam_id,'examYear',y,'startsOn',first_date,'endsOn',last_date);
end;
$$;

-- ---------------------------------------------------------------------------
-- Planner health diagnostics: aggregate operational checks only.
-- ---------------------------------------------------------------------------
create or replace function public.admin_planner_health()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare result jsonb;
begin
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  select jsonb_build_object(
    'onboardedUsers',(select count(*) from public.student_profiles where onboarding_complete),
    'profilesWithoutSubjects',(select count(*) from public.student_profiles where onboarding_complete and coalesce(array_length(subject_choices,1),0)=0),
    'profilesWithoutExamYear',(select count(*) from public.student_profiles where onboarding_complete and exam_year is null),
    'usersWithoutManualCoverage',(select count(*) from public.student_profiles p where p.onboarding_complete and not exists(select 1 from public.syllabus_coverage c where c.user_id=p.user_id and c.covered and c.source='Manual')),
    'usersWithoutRecentStudy',(select count(*) from public.student_profiles p where p.onboarding_complete and not exists(select 1 from public.study_sessions s where s.user_id=p.user_id and s.started_at>=now()-interval '14 days')),
    'overlappingWeeklyClasses',(select count(*) from public.class_schedules a join public.class_schedules b on a.user_id=b.user_id and a.day_of_week=b.day_of_week and a.id<b.id and a.start_time<b.end_time and b.start_time<a.end_time),
    'catalogSubjects',(select count(*) from public.academic_subject_catalog where enabled),
    'catalogTopics',(select count(*) from public.academic_topic_catalog where enabled),
    'catalogNeedsReview',(select count(*) from public.academic_topic_catalog where enabled and verification_status<>'verified'),
    'subjectsWithoutTopics',(select count(*) from public.academic_subject_catalog s where s.enabled and not exists(select 1 from public.academic_topic_catalog t where t.subject_name=s.subject_name and t.enabled)),
    'officialScheduleRows',(select count(*) from public.official_exam_schedule),
    'officialScheduleYears',(select coalesce(jsonb_agg(distinct exam_year),'[]'::jsonb) from public.official_exam_schedule)
  ) into result;
  return result;
end;
$$;

alter table public.academic_subject_catalog enable row level security;
alter table public.academic_topic_catalog enable row level security;
alter table public.official_exam_schedule enable row level security;

drop policy if exists "read academic subject catalog" on public.academic_subject_catalog;
create policy "read academic subject catalog" on public.academic_subject_catalog for select to authenticated using(enabled or public.is_studyarc_admin());
drop policy if exists "admin manages academic subject catalog" on public.academic_subject_catalog;
create policy "admin manages academic subject catalog" on public.academic_subject_catalog for all to authenticated using(public.is_studyarc_admin()) with check(public.is_studyarc_admin());

drop policy if exists "read academic topic catalog" on public.academic_topic_catalog;
create policy "read academic topic catalog" on public.academic_topic_catalog for select to authenticated using(enabled or public.is_studyarc_admin());
drop policy if exists "admin manages academic topic catalog" on public.academic_topic_catalog;
create policy "admin manages academic topic catalog" on public.academic_topic_catalog for all to authenticated using(public.is_studyarc_admin()) with check(public.is_studyarc_admin());

drop policy if exists "read official exam schedule" on public.official_exam_schedule;
create policy "read official exam schedule" on public.official_exam_schedule for select to authenticated using(true);
drop policy if exists "admin manages official exam schedule" on public.official_exam_schedule;
create policy "admin manages official exam schedule" on public.official_exam_schedule for all to authenticated using(public.is_studyarc_admin()) with check(public.is_studyarc_admin());

grant execute on function public.sync_my_main_exam_from_official() to authenticated;
grant execute on function public.admin_planner_health() to authenticated;
