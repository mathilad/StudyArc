alter table public.test_marks
  add column if not exists source_class_id uuid null
  references public.class_schedules(id) on delete set null;

create index if not exists test_marks_source_class_id_idx
  on public.test_marks(source_class_id);
