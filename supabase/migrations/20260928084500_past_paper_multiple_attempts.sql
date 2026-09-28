alter table public.past_paper_item_ticks
  add column if not exists attempt_no integer not null default 1 check (attempt_no >= 1);

alter table public.past_paper_item_ticks
  drop constraint if exists past_paper_item_ticks_user_id_subject_name_paper_year_paper_key;

create unique index if not exists past_paper_item_ticks_attempt_unique_idx
  on public.past_paper_item_ticks(user_id, subject_name, paper_year, paper_section, item_key, attempt_no);

create index if not exists past_paper_item_ticks_created_idx
  on public.past_paper_item_ticks(user_id, created_at desc);