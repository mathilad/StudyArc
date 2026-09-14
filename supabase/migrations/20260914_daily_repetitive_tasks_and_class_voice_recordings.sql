alter table public.protected_times drop constraint if exists protected_times_recurrence_check;
alter table public.protected_times add constraint protected_times_recurrence_check
  check (recurrence in ('Daily','Weekly','This Week'));

create table if not exists public.class_voice_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.class_schedules(id) on delete set null,
  occurrence_date date not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  source text not null default 'Uploaded' check (source in ('Uploaded','Recorded')),
  compression_profile text,
  created_at timestamptz not null default now(),
  unique (user_id, storage_path)
);

create index if not exists class_voice_recordings_user_date_idx
  on public.class_voice_recordings (user_id, occurrence_date desc);
create index if not exists class_voice_recordings_class_date_idx
  on public.class_voice_recordings (class_id, occurrence_date desc);

alter table public.class_voice_recordings enable row level security;
grant select, insert, update, delete on public.class_voice_recordings to authenticated;

drop policy if exists "read own class voice recordings" on public.class_voice_recordings;
create policy "read own class voice recordings" on public.class_voice_recordings
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "insert own class voice recordings" on public.class_voice_recordings;
create policy "insert own class voice recordings" on public.class_voice_recordings
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "update own class voice recordings" on public.class_voice_recordings;
create policy "update own class voice recordings" on public.class_voice_recordings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "delete own class voice recordings" on public.class_voice_recordings;
create policy "delete own class voice recordings" on public.class_voice_recordings
  for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'class-voice-recordings',
  'class-voice-recordings',
  false,
  6291456,
  array['audio/m4a','audio/mp4','audio/mpeg','audio/aac','audio/webm','audio/ogg','audio/3gpp','audio/x-m4a']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "class voice insert own folder" on storage.objects;
create policy "class voice insert own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'class-voice-recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "class voice read own folder" on storage.objects;
create policy "class voice read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'class-voice-recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "class voice delete own folder" on storage.objects;
create policy "class voice delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'class-voice-recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);
