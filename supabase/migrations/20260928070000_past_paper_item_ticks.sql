create table if not exists public.past_paper_item_ticks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_name text not null,
  paper_year integer not null check (paper_year between 1950 and 2100),
  paper_section text not null,
  item_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, subject_name, paper_year, paper_section, item_key)
);

create index if not exists past_paper_item_ticks_user_lookup_idx
  on public.past_paper_item_ticks(user_id, subject_name, paper_section, paper_year desc);

alter table public.past_paper_item_ticks enable row level security;
revoke all on table public.past_paper_item_ticks from anon, authenticated;
grant select, insert, delete on table public.past_paper_item_ticks to authenticated;

drop policy if exists "read own past paper item ticks" on public.past_paper_item_ticks;
create policy "read own past paper item ticks" on public.past_paper_item_ticks
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "insert own past paper item ticks" on public.past_paper_item_ticks;
create policy "insert own past paper item ticks" on public.past_paper_item_ticks
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "delete own past paper item ticks" on public.past_paper_item_ticks;
create policy "delete own past paper item ticks" on public.past_paper_item_ticks
for delete to authenticated using ((select auth.uid()) = user_id);
