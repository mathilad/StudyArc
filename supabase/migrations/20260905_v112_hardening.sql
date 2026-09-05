-- Study Arc v1.1.2 hardening
-- Apply after the 20260905 monetization/admin migrations.

-- Payments must be created through create_my_payment_request(), which fixes the
-- user, amount and plan from trusted server-side data. Do not permit arbitrary
-- client inserts into the payments table.
drop policy if exists "create own payments" on public.payments;

-- Ensure an explicitly selected manual payment method exists and is enabled.
create or replace function public.create_my_payment_request(requested_plan_id uuid, requested_method_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  uid uuid:=auth.uid();
  plan_row public.subscription_plans%rowtype;
  ref text;
  payment_id uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if exists(select 1 from public.account_access where user_id=uid and is_blocked) then raise exception 'Account is blocked'; end if;

  select * into plan_row from public.subscription_plans where id=requested_plan_id and enabled=true;
  if plan_row.id is null then raise exception 'Plan unavailable'; end if;

  if requested_method_id is not null and not exists(
    select 1 from public.payment_methods where id=requested_method_id and enabled=true
  ) then
    raise exception 'Payment method unavailable';
  end if;

  loop
    ref:=public.studyarc_make_reference('SA-PAY');
    exit when not exists(select 1 from public.payments where payment_reference=ref);
  end loop;

  insert into public.payments(user_id,plan_id,payment_method_id,amount_lkr,payment_reference,status)
  values(uid,plan_row.id,requested_method_id,plan_row.price_lkr,ref,'PENDING')
  returning id into payment_id;

  return jsonb_build_object(
    'paymentId',payment_id,
    'reference',ref,
    'amountLkr',plan_row.price_lkr,
    'planName',plan_row.name
  );
end;
$$;

-- Only one plan is visually featured at a time.
create or replace function public.admin_update_plan(plan_id uuid, new_price_lkr integer, new_enabled boolean, new_featured boolean)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare before_row jsonb; after_row jsonb;
begin
  if not public.is_studyarc_super_admin() then raise exception 'Not authorized'; end if;
  if new_price_lkr < 0 then raise exception 'Invalid price'; end if;

  select to_jsonb(p) into before_row from public.subscription_plans p where id=plan_id;
  if before_row is null then raise exception 'Plan not found'; end if;

  if new_featured then
    update public.subscription_plans
       set featured=false, updated_at=now()
     where id<>plan_id and featured=true;
  end if;

  update public.subscription_plans
     set price_lkr=new_price_lkr,
         enabled=new_enabled,
         featured=new_featured,
         updated_at=now()
   where id=plan_id;

  select to_jsonb(p) into after_row from public.subscription_plans p where id=plan_id;
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_key,before_value,after_value)
  values(auth.uid(),'plan_updated','subscription_plan',plan_id::text,before_row,after_row);
end;
$$;

-- If an admin explicitly chose to pause premium while the account was blocked,
-- restore the blocked interval on unblocking. Otherwise subscription time keeps
-- running normally.
create or replace function public.admin_unblock_user(target_user uuid)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  access_row public.account_access%rowtype;
  blocked_for interval;
begin
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;

  select * into access_row
    from public.account_access
   where user_id=target_user
   for update;

  if access_row.user_id is not null
     and access_row.is_blocked
     and access_row.pause_subscription_while_blocked
     and access_row.blocked_at is not null then
    blocked_for := greatest(interval '0 seconds', now() - access_row.blocked_at);
    update public.subscriptions
       set expires_at = case when expires_at is null then null else expires_at + blocked_for end,
           updated_at = now()
     where user_id=target_user
       and status='ACTIVE'
       and (expires_at is null or expires_at>access_row.blocked_at);
  end if;

  update public.account_access
     set is_blocked=false,
         blocked_at=null,
         blocked_by=null,
         internal_block_reason=null,
         public_block_message=null,
         pause_subscription_while_blocked=false,
         updated_at=now()
   where user_id=target_user;

  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_key,after_value)
  values(auth.uid(),'user_unblocked','account_access',target_user::text,
    jsonb_build_object('premiumPauseRestored',coalesce(access_row.pause_subscription_while_blocked,false)));
end;
$$;

grant execute on function public.create_my_payment_request(uuid,uuid) to authenticated;
grant execute on function public.admin_update_plan(uuid,integer,boolean,boolean) to authenticated;
grant execute on function public.admin_unblock_user(uuid) to authenticated;
