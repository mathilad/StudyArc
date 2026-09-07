create table if not exists public.active_app_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null,
  claimed_at timestamptz not null default now()
);
alter table public.active_app_sessions enable row level security;
revoke all on table public.active_app_sessions from anon, authenticated;
grant select on table public.active_app_sessions to authenticated;
drop policy if exists "users read own active app session" on public.active_app_sessions;
create policy "users read own active app session" on public.active_app_sessions for select to authenticated using ((select auth.uid())=user_id);

create or replace function public.claim_my_app_session()
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare uid uuid := auth.uid(); sid uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  sid := nullif(auth.jwt()->>'session_id','')::uuid;
  if sid is null or not exists(select 1 from auth.sessions where id=sid and user_id=uid) then raise exception 'Invalid authenticated session'; end if;
  insert into public.active_app_sessions(user_id,session_id,claimed_at) values(uid,sid,now())
  on conflict(user_id) do update set session_id=excluded.session_id,claimed_at=excluded.claimed_at;
  return sid;
end $$;

create or replace function public.is_my_app_session_current()
returns boolean language sql stable security definer set search_path=public,auth as $$
  select exists(select 1 from public.active_app_sessions where user_id=auth.uid() and session_id=nullif(auth.jwt()->>'session_id','')::uuid)
$$;
revoke all on function public.claim_my_app_session() from public,anon;
revoke all on function public.is_my_app_session_current() from public,anon;
grant execute on function public.claim_my_app_session() to authenticated;
grant execute on function public.is_my_app_session_current() to authenticated;

do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='active_app_sessions') then
   alter publication supabase_realtime add table public.active_app_sessions;
 end if;
end $$;
