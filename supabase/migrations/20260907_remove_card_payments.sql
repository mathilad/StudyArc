delete from public.payment_methods where method_type='payhere_card';
drop function if exists public.finalize_payhere_payment(uuid,text);
drop table if exists public.payment_gateway_sessions;
alter table public.payments drop column if exists provider_payment_id;
alter table public.payments drop column if exists provider;

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
    'pendingPayments',(select count(*) from public.payments where status='PENDING'),
    'pendingRefunds',(select count(*) from public.payment_refunds where status in ('REQUESTED','PROCESSING')),
    'activePremium',(select count(distinct user_id) from public.subscriptions where status='ACTIVE' and (expires_at is null or expires_at>now())),
    'journeyUsers',(select count(distinct s.user_id) from public.subscriptions s join public.subscription_plans p on p.id=s.plan_id where s.status='ACTIVE' and p.code='al_journey' and (s.expires_at is null or s.expires_at>now())),
    'expiringIn7Days',(select count(*) from public.subscriptions where status='ACTIVE' and expires_at between now() and now()+interval '7 days'),
    'blockedUsers',(select count(*) from public.account_access where is_blocked)
  ) into result;
  return result;
end; $$;
