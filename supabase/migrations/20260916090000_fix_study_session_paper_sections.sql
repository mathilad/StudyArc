-- Keep study_sessions.paper_section aligned with every paper section the app can save.
-- The previous constraint only allowed MCQ, Essay and Full Paper, which caused
-- queued study-session upserts using newer A/L paper sections to fail forever.

alter table public.study_sessions
  drop constraint if exists study_sessions_paper_section_check;

alter table public.study_sessions
  add constraint study_sessions_paper_section_check
  check (
    paper_section is null
    or paper_section in (
      'MCQ',
      'Structured',
      'Essay',
      'Part A',
      'Part B',
      'Full Paper'
    )
  );

-- Keep manually entered past-paper history compatible with the same section set.
alter table public.past_paper_history
  drop constraint if exists past_paper_history_paper_section_check;

alter table public.past_paper_history
  add constraint past_paper_history_paper_section_check
  check (
    paper_section in (
      'MCQ',
      'Structured',
      'Essay',
      'Part A',
      'Part B',
      'Full Paper'
    )
  );
