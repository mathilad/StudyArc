create table if not exists public.planning_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.planning_preferences enable row level security;

drop policy if exists "Users can read own planning preferences" on public.planning_preferences;
create policy "Users can read own planning preferences"
on public.planning_preferences for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own planning preferences" on public.planning_preferences;
create policy "Users can insert own planning preferences"
on public.planning_preferences for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own planning preferences" on public.planning_preferences;
create policy "Users can update own planning preferences"
on public.planning_preferences for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own planning preferences" on public.planning_preferences;
create policy "Users can delete own planning preferences"
on public.planning_preferences for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.planning_preferences to authenticated;
