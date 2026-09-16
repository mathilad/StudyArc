-- Keep study_sessions.paper_section aligned with every paper section the app can save.
-- This intentionally preserves the complete section vocabulary introduced by
-- 20260911_papers_leaderboard_assignments.sql so queued/offline sessions cannot
-- fail merely because they use a subject-specific paper format.

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
      'Full MCQ Paper',
      'Full Essay Paper',
      'Part A',
      'Part B',
      'Paper I',
      'Paper II',
      'Full Paper'
    )
  );

-- Keep manually entered past-paper history compatible with exactly the same set.
alter table public.past_paper_history
  drop constraint if exists past_paper_history_paper_section_check;

alter table public.past_paper_history
  add constraint past_paper_history_paper_section_check
  check (
    paper_section in (
      'MCQ',
      'Structured',
      'Essay',
      'Full MCQ Paper',
      'Full Essay Paper',
      'Part A',
      'Part B',
      'Paper I',
      'Paper II',
      'Full Paper'
    )
  );
