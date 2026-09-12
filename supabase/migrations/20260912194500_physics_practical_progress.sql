create table if not exists public.physics_practical_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_name text not null,
  practical_done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_name)
);

alter table public.physics_practical_progress enable row level security;

drop policy if exists "Users can view own physics practical progress" on public.physics_practical_progress;
create policy "Users can view own physics practical progress"
on public.physics_practical_progress for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own physics practical progress" on public.physics_practical_progress;
create policy "Users can insert own physics practical progress"
on public.physics_practical_progress for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own physics practical progress" on public.physics_practical_progress;
create policy "Users can update own physics practical progress"
on public.physics_practical_progress for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own physics practical progress" on public.physics_practical_progress;
create policy "Users can delete own physics practical progress"
on public.physics_practical_progress for delete
to authenticated
using (auth.uid() = user_id);
