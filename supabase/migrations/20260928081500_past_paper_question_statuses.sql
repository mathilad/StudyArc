alter table public.past_paper_item_ticks
  add column if not exists status text not null default 'completed';

alter table public.past_paper_item_ticks
  drop constraint if exists past_paper_item_ticks_status_check;

alter table public.past_paper_item_ticks
  add constraint past_paper_item_ticks_status_check
  check (status in ('completed','incorrect','review'));

create index if not exists past_paper_item_ticks_status_idx
  on public.past_paper_item_ticks(user_id, subject_name, status, paper_year desc);