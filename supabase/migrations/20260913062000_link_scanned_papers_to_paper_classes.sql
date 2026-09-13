alter table public.paper_question_results
  add column if not exists source_class_id uuid null
  references public.class_schedules(id) on delete set null;

create index if not exists paper_question_results_source_class_id_idx
  on public.paper_question_results(source_class_id);
