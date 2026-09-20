create table if not exists public.planned_tasks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  planned_date date,
  planned_time time,
  estimated_minutes integer not null default 30 check (estimated_minutes between 1 and 1440),
  completed boolean not null default false,
  assignment_id uuid references public.assignments(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists planned_tasks_user_date_idx on public.planned_tasks(user_id,planned_date,sort_order);
create unique index if not exists planned_tasks_assignment_active_idx on public.planned_tasks(user_id,assignment_id) where assignment_id is not null and completed=false;
alter table public.planned_tasks enable row level security;
drop policy if exists "planned_tasks_owner_all" on public.planned_tasks;
create policy "planned_tasks_owner_all" on public.planned_tasks for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
