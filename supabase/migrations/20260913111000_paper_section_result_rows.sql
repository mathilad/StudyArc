-- Section-wise paper/test marks used by Paper classes and local recognition.
create table if not exists public.paper_section_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_name text not null,
  paper_date date not null,
  paper_title text not null,
  section text not null check (section in ('MCQ','Structured','Essay')),
  score numeric not null check (score >= 0),
  total numeric not null check (total > 0 and score <= total),
  percent numeric generated always as ((score / total) * 100) stored,
  source text not null default 'Manual' check (source in ('Manual','Local OCR','Paper class','Scan review')),
  source_class_id uuid references public.class_schedules(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.paper_section_results enable row level security;

drop policy if exists "paper section results own all" on public.paper_section_results;
create policy "paper section results own all"
on public.paper_section_results
as permissive
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists paper_section_results_user_date_idx
  on public.paper_section_results(user_id, paper_date desc);
create index if not exists paper_section_results_user_subject_idx
  on public.paper_section_results(user_id, subject_name);
create index if not exists paper_section_results_source_class_idx
  on public.paper_section_results(source_class_id)
  where source_class_id is not null;
