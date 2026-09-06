-- Admin-published in-app notices for downloadable Study Arc releases.
create table if not exists public.app_update_notifications (
  id uuid primary key default gen_random_uuid(),
  version text not null check (char_length(trim(version)) between 1 and 40),
  title text not null check (char_length(trim(title)) between 1 and 120),
  message text not null check (char_length(trim(message)) between 1 and 500),
  download_url text not null check (download_url ~ '^https?://'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists app_update_notifications_created_at_idx on public.app_update_notifications(created_at desc);
alter table public.app_update_notifications enable row level security;
revoke all on public.app_update_notifications from public, anon;
grant select on public.app_update_notifications to authenticated;
create policy "read app update notifications" on public.app_update_notifications for select to authenticated using (true);

create or replace function public.admin_publish_app_update(p_version text, p_title text, p_message text, p_download_url text)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare notification_id uuid;
begin
  if not public.is_studyarc_super_admin() then raise exception 'Super Admin access required'; end if;
  if trim(coalesce(p_version,''))='' or trim(coalesce(p_title,''))='' or trim(coalesce(p_message,''))='' then raise exception 'Version, title and message are required'; end if;
  if coalesce(p_download_url,'') !~ '^https?://' then raise exception 'Enter a valid https:// or http:// download link'; end if;
  insert into public.app_update_notifications(version,title,message,download_url,created_by)
  values(trim(p_version),trim(p_title),trim(p_message),trim(p_download_url),auth.uid())
  returning id into notification_id;
  return notification_id;
end;
$$;
revoke all on function public.admin_publish_app_update(text,text,text,text) from public, anon;
grant execute on function public.admin_publish_app_update(text,text,text,text) to authenticated;
