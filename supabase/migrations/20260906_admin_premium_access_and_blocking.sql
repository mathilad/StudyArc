create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function public.is_studyarc_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid())
      and role in ('content_admin','support_admin','super_admin')
  );
$$;

create or replace function public.is_studyarc_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'super_admin'
  );
$$;

revoke execute on function public.is_studyarc_admin() from public, anon;
revoke execute on function public.is_studyarc_super_admin() from public, anon;
grant execute on function public.is_studyarc_admin() to authenticated;
grant execute on function public.is_studyarc_super_admin() to authenticated;

create table if not exists public.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_code text not null unique,
  premium_until timestamptz,
  blocked_at timestamptz,
  blocked_reason text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists user_access_premium_until_idx
  on public.user_access (premium_until)
  where premium_until is not null;
create index if not exists user_access_blocked_at_idx
  on public.user_access (blocked_at)
  where blocked_at is not null;
create index if not exists user_access_updated_by_idx
  on public.user_access (updated_by);

alter table public.user_access enable row level security;
grant select on public.user_access to authenticated;
revoke insert, update, delete on public.user_access from anon, authenticated;

drop policy if exists "users read own access" on public.user_access;
create policy "users read own access"
on public.user_access for select to authenticated
using ((select auth.uid()) = user_id or (select public.is_studyarc_admin()));

create or replace function private.studyarc_access_code(p_user_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'SA-' || upper(substr(md5(p_user_id::text), 1, 10));
$$;

revoke execute on function private.studyarc_access_code(uuid) from public, anon, authenticated;

insert into public.user_access (user_id, access_code)
select id, private.studyarc_access_code(id)
from auth.users
on conflict (user_id) do nothing;

create or replace function private.create_studyarc_user_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_access (user_id, access_code)
  values (new.id, private.studyarc_access_code(new.id))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function private.create_studyarc_user_access() from public, anon, authenticated;

drop trigger if exists on_auth_user_access_created on auth.users;
create trigger on_auth_user_access_created
after insert on auth.users
for each row execute function private.create_studyarc_user_access();

insert into public.app_settings (key, value)
values
  ('paid_app_enabled', 'false'::jsonb),
  ('monthly_price_lkr', '500'::jsonb)
on conflict (key) do nothing;

create or replace function private.has_studyarc_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_studyarc_admin()
    or (
      not exists (
        select 1 from public.user_access ua
        where ua.user_id = (select auth.uid()) and ua.blocked_at is not null
      )
      and (
        coalesce(
          (select (value #>> '{}')::boolean from public.app_settings where key = 'paid_app_enabled'),
          false
        ) = false
        or exists (
          select 1 from public.user_access ua
          where ua.user_id = (select auth.uid())
            and ua.premium_until > now()
            and ua.blocked_at is null
        )
      )
    );
$$;

revoke execute on function private.has_studyarc_access() from public, anon;
grant execute on function private.has_studyarc_access() to authenticated;

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  access_code text,
  premium_until timestamptz,
  blocked boolean,
  blocked_reason text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_studyarc_admin() then
    raise exception 'Admin access required';
  end if;
  return query
  select
    u.id,
    u.email::text,
    coalesce(sp.full_name, ''),
    ua.access_code,
    ua.premium_until,
    ua.blocked_at is not null,
    ua.blocked_reason,
    coalesce(ur.role, 'student'),
    u.created_at
  from auth.users u
  left join public.student_profiles sp on sp.user_id = u.id
  left join public.user_access ua on ua.user_id = u.id
  left join public.user_roles ur on ur.user_id = u.id
  order by u.created_at desc;
end;
$$;

revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_set_user_access(
  p_user_id uuid,
  p_premium_until timestamptz,
  p_blocked boolean,
  p_blocked_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  if not public.is_studyarc_admin() then
    raise exception 'Admin access required';
  end if;
  if p_user_id = (select auth.uid()) and p_blocked then
    raise exception 'You cannot block your own admin account';
  end if;

  select to_jsonb(ua) into v_before
  from public.user_access ua where ua.user_id = p_user_id;

  insert into public.user_access (
    user_id, access_code, premium_until, blocked_at, blocked_reason, updated_at, updated_by
  )
  values (
    p_user_id,
    private.studyarc_access_code(p_user_id),
    p_premium_until,
    case when p_blocked then now() else null end,
    case when p_blocked then nullif(trim(p_blocked_reason), '') else null end,
    now(),
    (select auth.uid())
  )
  on conflict (user_id) do update set
    premium_until = excluded.premium_until,
    blocked_at = excluded.blocked_at,
    blocked_reason = excluded.blocked_reason,
    updated_at = now(),
    updated_by = (select auth.uid());

  select to_jsonb(ua) into v_after
  from public.user_access ua where ua.user_id = p_user_id;

  insert into public.admin_audit_log (
    admin_user_id, action, entity_type, entity_key, before_value, after_value
  ) values (
    (select auth.uid()), 'set_user_access', 'user', p_user_id::text, v_before, v_after
  );
end;
$$;

revoke execute on function public.admin_set_user_access(uuid,timestamptz,boolean,text) from public, anon;
grant execute on function public.admin_set_user_access(uuid,timestamptz,boolean,text) to authenticated;

create or replace function public.admin_set_paid_mode(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
begin
  if not public.is_studyarc_super_admin() then
    raise exception 'Super admin access required';
  end if;
  select value into v_before from public.app_settings where key = 'paid_app_enabled';
  insert into public.app_settings (key, value, updated_at, updated_by)
  values ('paid_app_enabled', to_jsonb(p_enabled), now(), (select auth.uid()))
  on conflict (key) do update set
    value = excluded.value,
    updated_at = now(),
    updated_by = (select auth.uid());

  insert into public.admin_audit_log (
    admin_user_id, action, entity_type, entity_key, before_value, after_value
  ) values (
    (select auth.uid()), 'set_paid_mode', 'app_setting', 'paid_app_enabled',
    v_before, to_jsonb(p_enabled)
  );
end;
$$;

revoke execute on function public.admin_set_paid_mode(boolean) from public, anon;
grant execute on function public.admin_set_paid_mode(boolean) to authenticated;

do $$
declare
  r record;
begin
  for r in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'user_id'
      and t.table_type = 'BASE TABLE'
      and c.table_name not in ('user_access','user_roles')
  loop
    execute format('drop policy if exists "studyarc account access" on public.%I', r.table_name);
    execute format(
      'create policy "studyarc account access" on public.%I as restrictive for all to authenticated using ((select private.has_studyarc_access())) with check ((select private.has_studyarc_access()))',
      r.table_name
    );
  end loop;
end $$;