-- StudyArc paper-class results: preserve MCQ, Structured and Essay marks separately.
alter table public.test_marks
  add column if not exists structured_score numeric,
  add column if not exists structured_total numeric,
  add column if not exists structured_percent numeric,
  add column if not exists overall_percent numeric;

alter table public.test_marks drop constraint if exists test_marks_structured_score_valid;
alter table public.test_marks add constraint test_marks_structured_score_valid
check (
  structured_score is null
  or (structured_score >= 0 and structured_total is not null and structured_total > 0 and structured_score <= structured_total)
);

alter table public.test_marks drop constraint if exists test_marks_structured_total_valid;
alter table public.test_marks add constraint test_marks_structured_total_valid
check (structured_total is null or structured_total > 0);

alter table public.test_marks drop constraint if exists test_marks_structured_percent_valid;
alter table public.test_marks add constraint test_marks_structured_percent_valid
check (structured_percent is null or (structured_percent >= 0 and structured_percent <= 100));

alter table public.test_marks drop constraint if exists test_marks_overall_percent_valid;
alter table public.test_marks add constraint test_marks_overall_percent_valid
check (overall_percent is null or (overall_percent >= 0 and overall_percent <= 100));

comment on column public.test_marks.structured_score is 'Marks earned in the structured section.';
comment on column public.test_marks.structured_total is 'Maximum marks for the structured section.';
comment on column public.test_marks.structured_percent is 'Structured section percentage calculated by the client.';
comment on column public.test_marks.overall_percent is 'Combined percentage across every entered paper section.';
