alter table public.paper_question_results
  add column if not exists paper_date date,
  add column if not exists page_index integer,
  add column if not exists mark_source text,
  add column if not exists mark_confidence numeric,
  add column if not exists question_no_source text,
  add column if not exists teacher_mark_color text;

alter table public.paper_question_results
  drop constraint if exists paper_question_results_page_index_check,
  add constraint paper_question_results_page_index_check check (page_index is null or page_index >= 1),
  drop constraint if exists paper_question_results_mark_confidence_check,
  add constraint paper_question_results_mark_confidence_check check (mark_confidence is null or (mark_confidence >= 0 and mark_confidence <= 1)),
  drop constraint if exists paper_question_results_question_no_source_check,
  add constraint paper_question_results_question_no_source_check check (question_no_source is null or question_no_source in ('explicit','inherited','unknown'));

create index if not exists paper_question_results_user_paper_date_idx
  on public.paper_question_results(user_id, paper_date desc);
