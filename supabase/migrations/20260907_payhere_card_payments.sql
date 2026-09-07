-- Automatic PayHere card checkout. Gateway sessions are server-only and never exposed via RLS.
alter table public.payments add column if not exists provider text not null default 'manual';
alter table public.payments add column if not exists provider_payment_id text;

create unique index if not exists payments_provider_payment_unique
  on public.payments(provider, provider_payment_id)
  where provider_payment_id is not null;

create table if not exists public.payment_gateway_sessions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.payments(id) on delete cascade,
  token_hash text not null unique,
  billing_name text not null,
  email text not null,
  phone text not null,
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payment_gateway_sessions enable row level security;
revoke all on table public.payment_gateway_sessions from public, anon, authenticated;
grant all on table public.payment_gateway_sessions to service_role;

insert into public.payment_methods(method_type,name,instructions,enabled,display_order)
select 'payhere_card','Credit / debit card','Visa or Mastercard via PayHere secure checkout.',false,-10
where not exists(select 1 from public.payment_methods where method_type='payhere_card');

create or replace function public.finalize_payhere_payment(
  target_payment uuid,
  payhere_payment_id text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  pay public.payments%rowtype;
  plan public.subscription_plans%rowtype;
  expiry timestamptz;
  subscription_id uuid;
begin
  select * into pay from public.payments where id=target_payment for update;
  if pay.id is null or pay.provider <> 'payhere' then raise exception 'PayHere payment not found'; end if;
  if pay.status='APPROVED' then
    return jsonb_build_object('alreadyProcessed',true);
  end if;
  if pay.status<>'PENDING' then raise exception 'Payment is not pending'; end if;

  select * into plan from public.subscription_plans where id=pay.plan_id;
  if plan.id is null then raise exception 'Subscription plan not found'; end if;
  if plan.duration_type='exam_linked' then
    expiry := make_timestamptz(extract(year from now())::int + case when extract(month from now())>=9 then 1 else 0 end,9,1,0,0,0,'Asia/Colombo');
  else
    expiry := now() + make_interval(days => coalesce(plan.duration_days,30));
  end if;

  update public.payments set status='APPROVED',provider_payment_id=payhere_payment_id,reviewed_at=now(),updated_at=now() where id=pay.id;
  update public.subscriptions set status='EXPIRED' where user_id=pay.user_id and status='ACTIVE';
  insert into public.subscriptions(user_id,plan_id,status,starts_at,expires_at,duration_source,payment_id)
  values(pay.user_id,plan.id,'ACTIVE',now(),expiry,'payment',pay.id)
  returning id into subscription_id;
  return jsonb_build_object('subscriptionId',subscription_id,'expiresAt',expiry);
end;
$$;

revoke all on function public.finalize_payhere_payment(uuid,text) from public, anon, authenticated;
grant execute on function public.finalize_payhere_payment(uuid,text) to service_role;

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  amount_lkr numeric(12,2) not null check(amount_lkr>0),
  reason text not null check(char_length(reason) between 3 and 500),
  status text not null default 'REQUESTED' check(status in ('REQUESTED','PROCESSING','COMPLETED','FAILED','CANCELLED')),
  provider_refund_id text,
  provider_message text,
  requested_by uuid not null references auth.users(id),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create unique index if not exists one_open_refund_per_payment on public.payment_refunds(payment_id) where status in ('REQUESTED','PROCESSING','COMPLETED');
create index if not exists payment_refunds_status_date_idx on public.payment_refunds(status,requested_at desc);
alter table public.payment_refunds enable row level security;
create policy "admins read refunds" on public.payment_refunds for select to authenticated using(public.is_studyarc_admin());
revoke insert,update,delete on public.payment_refunds from anon,authenticated;

insert into public.app_settings(key,value) values
  ('refund_window_days','14'::jsonb),
  ('revoke_access_on_refund','true'::jsonb)
on conflict(key) do nothing;

create or replace function public.admin_create_refund(target_payment uuid, refund_reason text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare pay public.payments%rowtype; refund_id uuid; window_days int;
begin
  if not public.is_studyarc_admin() then raise exception 'Admin access required'; end if;
  if char_length(trim(refund_reason))<3 then raise exception 'Refund reason is required'; end if;
  select * into pay from public.payments where id=target_payment and status='APPROVED';
  if pay.id is null then raise exception 'Approved payment not found'; end if;
  select coalesce((value#>>'{}')::int,14) into window_days from public.app_settings where key='refund_window_days';
  if pay.reviewed_at is not null and pay.reviewed_at < now()-make_interval(days=>window_days) then raise exception 'Payment is outside the refund window'; end if;
  insert into public.payment_refunds(payment_id,user_id,amount_lkr,reason,requested_by)
  values(pay.id,pay.user_id,pay.amount_lkr,trim(refund_reason),auth.uid()) returning id into refund_id;
  return jsonb_build_object('refundId',refund_id,'provider',pay.provider,'providerPaymentId',pay.provider_payment_id,'amountLkr',pay.amount_lkr);
end; $$;

create or replace function public.admin_remove_refund(target_refund uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.is_studyarc_admin() then raise exception 'Admin access required'; end if;
  delete from public.payment_refunds where id=target_refund and status in ('REQUESTED','FAILED','CANCELLED');
  if not found then raise exception 'Only unprocessed refund requests can be removed'; end if;
end; $$;

create or replace function public.admin_update_refund_settings(window_days int,revoke_access boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.is_studyarc_super_admin() then raise exception 'Super Admin access required'; end if;
  if window_days<1 or window_days>180 then raise exception 'Refund window must be 1 to 180 days'; end if;
  insert into public.app_settings(key,value) values('refund_window_days',to_jsonb(window_days)),('revoke_access_on_refund',to_jsonb(revoke_access)) on conflict(key) do update set value=excluded.value,updated_at=now();
end; $$;

revoke all on function public.admin_create_refund(uuid,text) from public,anon;
revoke all on function public.admin_remove_refund(uuid) from public,anon;
revoke all on function public.admin_update_refund_settings(int,boolean) from public,anon;
grant execute on function public.admin_create_refund(uuid,text),public.admin_remove_refund(uuid),public.admin_update_refund_settings(int,boolean) to authenticated;

create or replace function public.admin_monetization_stats()
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare result jsonb;
begin
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  select jsonb_build_object(
    'revenueThisMonth',coalesce((select sum(amount_lkr) from public.payments where status='APPROVED' and reviewed_at>=date_trunc('month',now())),0),
    'grossRevenue',coalesce((select sum(amount_lkr) from public.payments where status='APPROVED'),0),
    'refundedTotal',coalesce((select sum(amount_lkr) from public.payment_refunds where status='COMPLETED'),0),
    'netRevenue',coalesce((select sum(amount_lkr) from public.payments where status='APPROVED'),0)-coalesce((select sum(amount_lkr) from public.payment_refunds where status='COMPLETED'),0),
    'paymentSuccessRate',coalesce((select round(100.0*count(*) filter(where status='APPROVED')/nullif(count(*),0),1) from public.payments where status in ('APPROVED','REJECTED','CANCELLED')),0),
    'cardPayments',coalesce((select count(*) from public.payments where status='APPROVED' and provider='payhere'),0),
    'manualPayments',coalesce((select count(*) from public.payments where status='APPROVED' and provider='manual'),0),
    'pendingPayments',(select count(*) from public.payments where status='PENDING'),
    'pendingRefunds',(select count(*) from public.payment_refunds where status in ('REQUESTED','PROCESSING')),
    'activePremium',(select count(distinct user_id) from public.subscriptions where status='ACTIVE' and (expires_at is null or expires_at>now())),
    'journeyUsers',(select count(distinct s.user_id) from public.subscriptions s join public.subscription_plans p on p.id=s.plan_id where s.status='ACTIVE' and p.code='al_journey' and (s.expires_at is null or s.expires_at>now())),
    'expiringIn7Days',(select count(*) from public.subscriptions where status='ACTIVE' and expires_at between now() and now()+interval '7 days'),
    'blockedUsers',(select count(*) from public.account_access where is_blocked)
  ) into result;
  return result;
end; $$;

revoke all on function public.admin_monetization_stats() from public,anon;
grant execute on function public.admin_monetization_stats() to authenticated;
