-- StudyArc no longer tracks pages studied/revised.
alter table if exists public.daily_reviews
  drop column if exists pages_studied,
  drop column if exists pages_revised;
