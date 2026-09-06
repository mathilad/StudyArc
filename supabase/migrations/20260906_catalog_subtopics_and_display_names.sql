alter table public.academic_subject_catalog add column if not exists display_name_en text;
alter table public.academic_subject_catalog add column if not exists display_name_si text;
alter table public.academic_subject_catalog add column if not exists display_name_ta text;
update public.academic_subject_catalog set display_name_en = subject_name where display_name_en is null or btrim(display_name_en)='';

create table if not exists public.academic_subtopic_catalog (
  id uuid primary key default gen_random_uuid(),
  subject_name text not null,
  topic_key text not null,
  subtopic_key text not null,
  title_en text not null,
  title_si text,
  title_ta text,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  source_label text not null default 'National Institute of Education, Sri Lanka',
  source_url text not null default 'https://nie.lk/selesyll?helixMode=edit',
  verification_status text not null default 'needs_review' check (verification_status in ('verified','needs_review','draft')),
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique(subject_name, topic_key, subtopic_key),
  foreign key(subject_name, topic_key) references public.academic_topic_catalog(subject_name, topic_key) on delete cascade
);
create index if not exists academic_subtopic_catalog_topic_idx on public.academic_subtopic_catalog(subject_name, topic_key, enabled, sort_order);

alter table public.academic_subtopic_catalog enable row level security;
revoke all on table public.academic_subtopic_catalog from anon, authenticated;
grant select, insert, update, delete on table public.academic_subtopic_catalog to authenticated;

drop policy if exists "read academic subtopic catalog" on public.academic_subtopic_catalog;
create policy "read academic subtopic catalog" on public.academic_subtopic_catalog for select to authenticated using (enabled or public.is_studyarc_admin());
drop policy if exists "admin inserts academic subtopic catalog" on public.academic_subtopic_catalog;
create policy "admin inserts academic subtopic catalog" on public.academic_subtopic_catalog for insert to authenticated with check (public.is_studyarc_admin());
drop policy if exists "admin updates academic subtopic catalog" on public.academic_subtopic_catalog;
create policy "admin updates academic subtopic catalog" on public.academic_subtopic_catalog for update to authenticated using (public.is_studyarc_admin()) with check (public.is_studyarc_admin());
drop policy if exists "admin deletes academic subtopic catalog" on public.academic_subtopic_catalog;
create policy "admin deletes academic subtopic catalog" on public.academic_subtopic_catalog for delete to authenticated using (public.is_studyarc_admin());
