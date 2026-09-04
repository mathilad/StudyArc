-- Study Arc 2026-09-04 application fixes
-- Run this once in Supabase SQL Editor for an existing Study Arc project.

alter table public.student_profiles
  add column if not exists medium text not null default 'English';

alter table public.student_profiles
  drop constraint if exists student_profiles_medium_check;

alter table public.student_profiles
  add constraint student_profiles_medium_check
  check (medium in ('English', 'Sinhala'));

-- Ensure class type supports Extra Class on existing projects.
alter table public.class_schedules
  drop constraint if exists class_schedules_class_type_check;

alter table public.class_schedules
  add constraint class_schedules_class_type_check
  check (class_type in ('Theory', 'Revision', 'Paper', 'Extra Class'));

-- Profile image storage. Each authenticated user can only write inside avatars/<uid>/...
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "avatar upload own folder" on storage.objects;
create policy "avatar upload own folder" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "avatar update own folder" on storage.objects;
create policy "avatar update own folder" on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "avatar delete own folder" on storage.objects;
create policy "avatar delete own folder" on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Reassert profile CRUD RLS for the signed-in user.
alter table public.student_profiles enable row level security;
drop policy if exists "read own profile" on public.student_profiles;
create policy "read own profile" on public.student_profiles
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "insert own profile" on public.student_profiles;
create policy "insert own profile" on public.student_profiles
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "update own profile" on public.student_profiles;
create policy "update own profile" on public.student_profiles
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
