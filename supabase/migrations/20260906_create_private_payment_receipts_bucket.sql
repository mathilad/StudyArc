-- Private receipt storage for manual payment verification.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts', 'payment-receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "payment receipts - user upload" on storage.objects;
drop policy if exists "payment receipts - user or admin read" on storage.objects;

create policy "payment receipts - user upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "payment receipts - user or admin read"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-receipts'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or (select public.is_studyarc_admin())
  )
);
