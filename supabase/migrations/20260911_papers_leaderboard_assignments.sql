-- Study Arc: lesson past papers, subject-correct paper formats, leaderboard privacy,
-- assignment reminders/timetable support, and finer Applied/Physics lesson hierarchy.

alter table public.study_sessions drop constraint if exists study_sessions_paper_section_check;
alter table public.study_sessions add constraint study_sessions_paper_section_check
check (paper_section is null or paper_section in (
  'MCQ','Structured','Essay','Full MCQ Paper','Full Essay Paper',
  'Part A','Part B','Paper I','Paper II','Full Paper'
));

alter table public.past_paper_history drop constraint if exists past_paper_history_paper_section_check;
alter table public.past_paper_history add constraint past_paper_history_paper_section_check
check (paper_section in (
  'MCQ','Structured','Essay','Full MCQ Paper','Full Essay Paper',
  'Part A','Part B','Paper I','Paper II','Full Paper'
));

create index if not exists study_laps_user_session_number_idx
  on public.study_laps(user_id,session_id,lap_number);
comment on table public.study_laps is 'Per-session stopwatch lap durations and cumulative times. Saved with general and past-paper sessions.';

-- Leaderboard privacy is enforced in PostgreSQL as well as the settings UI.
alter table public.social_profiles
  add column if not exists show_on_leaderboard boolean not null default true;

drop policy if exists "read daily rankings" on public.daily_study_rankings;
create policy "read daily rankings" on public.daily_study_rankings
for select to authenticated
using (exists (
  select 1 from public.social_profiles p
  where p.user_id=daily_study_rankings.user_id
    and p.show_on_leaderboard=true
));

create or replace function public.enforce_leaderboard_visibility()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if exists (
    select 1 from public.social_profiles p
    where p.user_id=new.user_id and p.show_on_leaderboard=false
  ) then
    return null;
  end if;
  return new;
end $$;

drop trigger if exists trg_enforce_leaderboard_visibility on public.daily_study_rankings;
create trigger trg_enforce_leaderboard_visibility
before insert or update on public.daily_study_rankings
for each row execute function public.enforce_leaderboard_visibility();

create or replace function public.clear_hidden_leaderboard_rows()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.show_on_leaderboard=false and old.show_on_leaderboard is distinct from new.show_on_leaderboard then
    delete from public.daily_study_rankings where user_id=new.user_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_clear_hidden_leaderboard_rows on public.social_profiles;
create trigger trg_clear_hidden_leaderboard_rows
after update of show_on_leaderboard on public.social_profiles
for each row execute function public.clear_hidden_leaderboard_rows();

-- Subject-specific paper labels used by exams/admin catalog.
update public.academic_subject_catalog
set paper_components=array['Part A','Part B','Full Paper']::text[],updated_at=now()
where subject_name in ('Combined Mathematics','Pure Mathematics','Applied Mathematics');

update public.academic_subject_catalog
set paper_components=array['MCQ','Structured','Essay','Full MCQ Paper','Full Essay Paper']::text[],updated_at=now()
where subject_name in ('Physics','Chemistry','Biology','Agricultural Science');

update public.academic_subject_catalog
set paper_components=array['Paper I','Paper II','Full Paper']::text[],updated_at=now()
where subject_name in ('Engineering Technology','Biosystems Technology','Science for Technology');

-- Applied Mathematics: Dynamics / ගති විද්‍යාව becomes four main lesson rows.
update public.academic_topic_catalog
set enabled=false,updated_at=now()
where subject_name='Applied Mathematics' and topic_key='AM-04';

insert into public.academic_topic_catalog
(subject_name,topic_key,title_en,title_si,unit_name,sort_order,enabled,verification_status)
values
('Applied Mathematics','AM-04A','Newton''s Laws','නිව්ටන් නියම','II-04A',40,true,'needs_review'),
('Applied Mathematics','AM-04B','Connected Particles','සම්බන්ධිත අංශු','II-04B',41,true,'needs_review'),
('Applied Mathematics','AM-04C','Friction','ඝර්ෂණය','II-04C',42,true,'needs_review'),
('Applied Mathematics','AM-04D','Variable Forces','විචල්‍ය බල','II-04D',43,true,'needs_review')
on conflict(subject_name,topic_key) do update set
 title_en=excluded.title_en,title_si=excluded.title_si,unit_name=excluded.unit_name,
 sort_order=excluded.sort_order,enabled=true,updated_at=now();

insert into public.academic_subtopic_catalog
(subject_name,topic_key,subtopic_key,title_en,title_si,sort_order,enabled,verification_status)
values
('Applied Mathematics','AM-04A','AM-04A-1','Free-body diagrams','නිදහස් දේහ රූප සටහන්',10,true,'needs_review'),
('Applied Mathematics','AM-04A','AM-04A-2','Newton''s equations of motion','නිව්ටන් චලිත සමීකරණ',20,true,'needs_review'),
('Applied Mathematics','AM-04B','AM-04B-1','Strings and connected systems','තන්තු හා සම්බන්ධිත පද්ධති',10,true,'needs_review'),
('Applied Mathematics','AM-04B','AM-04B-2','Pulleys and constraints','පූලි හා සීමා',20,true,'needs_review'),
('Applied Mathematics','AM-04C','AM-04C-1','Limiting friction','සීමා ඝර්ෂණය',10,true,'needs_review'),
('Applied Mathematics','AM-04C','AM-04C-2','Rough planes','රළු තල',20,true,'needs_review'),
('Applied Mathematics','AM-04D','AM-04D-1','Motion under variable force','විචල්‍ය බල යටතේ චලිතය',10,true,'needs_review'),
('Applied Mathematics','AM-04D','AM-04D-2','Force as a function of time or position','කාලය හෝ පිහිටීම අනුව බලය',20,true,'needs_review')
on conflict(subject_name,topic_key,subtopic_key) do update set
 title_en=excluded.title_en,title_si=excluded.title_si,sort_order=excluded.sort_order,
 enabled=true,updated_at=now();

-- Physics: split the existing Forces / බල lesson into main topic lessons.
update public.academic_topic_catalog
set enabled=false,updated_at=now()
where subject_name='Physics' and topic_key='PHY-02B';

insert into public.academic_topic_catalog
(subject_name,topic_key,title_en,title_si,unit_name,sort_order,enabled,verification_status)
values
('Physics','PHY-02B1','Newton''s Laws and Forces','නිව්ටන් නියම හා බල','Unit 02B-1',21,true,'needs_review'),
('Physics','PHY-02B2','Friction','ඝර්ෂණය','Unit 02B-2',22,true,'needs_review'),
('Physics','PHY-02B3','Equilibrium of Forces','බල සමතුලිතතාව','Unit 02B-3',23,true,'needs_review')
on conflict(subject_name,topic_key) do update set
 title_en=excluded.title_en,title_si=excluded.title_si,unit_name=excluded.unit_name,
 sort_order=excluded.sort_order,enabled=true,updated_at=now();

insert into public.academic_subtopic_catalog
(subject_name,topic_key,subtopic_key,title_en,title_si,sort_order,enabled,verification_status)
values
('Physics','PHY-02B1','PHY-02B1-1','Force diagrams','බල රූප සටහන්',10,true,'needs_review'),
('Physics','PHY-02B1','PHY-02B1-2','Newton''s first, second and third laws','නිව්ටන් පළමු, දෙවන හා තෙවන නියම',20,true,'needs_review'),
('Physics','PHY-02B2','PHY-02B2-1','Static and kinetic friction','ස්ථිතික හා චාලක ඝර්ෂණය',10,true,'needs_review'),
('Physics','PHY-02B2','PHY-02B2-2','Friction on inclined planes','ඇල තලවල ඝර්ෂණය',20,true,'needs_review'),
('Physics','PHY-02B3','PHY-02B3-1','Resultant force','ප්‍රතිඵල බලය',10,true,'needs_review'),
('Physics','PHY-02B3','PHY-02B3-2','Translational equilibrium','ස්ථානික සමතුලිතතාව',20,true,'needs_review')
on conflict(subject_name,topic_key,subtopic_key) do update set
 title_en=excluded.title_en,title_si=excluded.title_si,sort_order=excluded.sort_order,
 enabled=true,updated_at=now();
