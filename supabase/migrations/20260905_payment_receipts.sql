-- Private Study Arc payment receipt storage.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('payment-receipts','payment-receipts',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

-- Users may upload only inside their own uid folder.
create policy "upload own payment receipts" on storage.objects
for insert to authenticated
with check(bucket_id='payment-receipts' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "read own payment receipts" on storage.objects
for select to authenticated
using(bucket_id='payment-receipts' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_studyarc_admin()));

create policy "admin delete payment receipts" on storage.objects
for delete to authenticated
using(bucket_id='payment-receipts' and public.is_studyarc_admin());

create or replace function public.submit_my_payment_receipt(target_payment uuid, object_path text)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if object_path is null or split_part(object_path,'/',1)<>uid::text then raise exception 'Invalid receipt path'; end if;
  update public.payments
  set receipt_path=object_path,submitted_at=now(),updated_at=now()
  where id=target_payment and user_id=uid and status='PENDING';
  if not found then raise exception 'Pending payment not found'; end if;
end;$$;

grant execute on function public.submit_my_payment_receipt(uuid,text) to authenticated;
