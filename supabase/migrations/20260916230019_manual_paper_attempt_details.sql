-- Manual attempts use the existing account-owned session and offline queue.
alter table public.study_sessions
  add column if not exists is_manual_paper boolean not null default false,
  add column if not exists paper_question_no text,
  add column if not exists paper_marks_awarded numeric,
  add column if not exists paper_marks_total numeric;
alter table public.study_sessions drop constraint if exists study_sessions_manual_marks_check;
alter table public.study_sessions add constraint study_sessions_manual_marks_check check (
  (paper_marks_awarded is null and paper_marks_total is null) or
  (paper_marks_awarded is not null and paper_marks_total is not null and
   paper_marks_total > 0 and paper_marks_awarded >= 0 and paper_marks_awarded <= paper_marks_total)
);
