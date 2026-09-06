-- Ensures receipt uploads can be linked to the signed-in user's pending payment.
create or replace function public.submit_my_payment_receipt(target_payment uuid, object_path text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if object_path is null or split_part(object_path, '/', 1) <> uid::text then
    raise exception 'Invalid receipt path';
  end if;

  update public.payments
  set receipt_path = object_path, submitted_at = now(), updated_at = now()
  where id = target_payment and user_id = uid and status = 'PENDING';

  if not found then raise exception 'Pending payment not found'; end if;
end;
$$;

revoke all on function public.submit_my_payment_receipt(uuid, text) from public, anon;
grant execute on function public.submit_my_payment_receipt(uuid, text) to authenticated;
