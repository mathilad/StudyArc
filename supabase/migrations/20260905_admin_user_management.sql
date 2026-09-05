-- Admin-only user/access reporting for Study Arc.

create or replace function public.admin_list_users(search_text text default null, max_rows integer default 100)
returns table(
  user_id uuid,
  email text,
  created_at timestamptz,
  stream text,
  exam_year integer,
  role text,
  is_blocked boolean,
  access_state text,
  plan_name text,
  premium_expires_at timestamptz,
  payment_reference text,
  activation_code text
)
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  return query
  with users_base as (
    select u.id,u.email,u.created_at,sp.stream,sp.exam_year,coalesce(ur.role,'student') role,
           coalesce(aa.is_blocked,false) blocked,coalesce(aa.grandfathered,false) grandfathered
    from auth.users u
    left join public.student_profiles sp on sp.user_id=u.id
    left join public.user_roles ur on ur.user_id=u.id
    left join public.account_access aa on aa.user_id=u.id
    where search_text is null or trim(search_text)='' or lower(coalesce(u.email,'')) like '%'||lower(trim(search_text))||'%' or u.id::text like '%'||trim(search_text)||'%'
    order by u.created_at desc
    limit greatest(1,least(max_rows,500))
  )
  select ub.id,ub.email,ub.created_at,ub.stream,ub.exam_year,ub.role,ub.blocked,
    case
      when ub.blocked then 'BLOCKED'
      when ub.role in ('content_admin','support_admin','super_admin') then 'ADMIN'
      when active_sub.id is not null then 'PREMIUM'
      when ub.grandfathered then 'GRANDFATHERED'
      when pending.id is not null then 'PAYMENT_PENDING'
      when public.studyarc_setting_bool('paid_mode_enabled',false) then 'PAYMENT_REQUIRED'
      else 'ACTIVE_FREE'
    end as access_state,
    active_plan.name,
    active_sub.expires_at,
    pending.payment_reference,
    code_row.code
  from users_base ub
  left join lateral (
    select s.id,s.plan_id,s.expires_at from public.subscriptions s
    where s.user_id=ub.id and s.status='ACTIVE' and (s.expires_at is null or s.expires_at>now())
    order by s.expires_at desc nulls first limit 1
  ) active_sub on true
  left join public.subscription_plans active_plan on active_plan.id=active_sub.plan_id
  left join lateral (
    select p.id,p.payment_reference from public.payments p where p.user_id=ub.id and p.status='PENDING' order by p.submitted_at desc limit 1
  ) pending on true
  left join lateral (
    select c.code from public.activation_codes c where c.user_id=ub.id and c.status='AVAILABLE' order by c.created_at desc limit 1
  ) code_row on true;
end;$$;

grant execute on function public.admin_list_users(text,integer) to authenticated;

create or replace function public.admin_monetization_stats()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare result jsonb;
begin
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  select jsonb_build_object(
    'revenueThisMonth', coalesce((select sum(amount_lkr) from public.payments where status='APPROVED' and reviewed_at>=date_trunc('month',now())),0),
    'pendingPayments', (select count(*) from public.payments where status='PENDING'),
    'activePremium', (select count(distinct user_id) from public.subscriptions where status='ACTIVE' and (expires_at is null or expires_at>now())),
    'journeyUsers', (select count(distinct s.user_id) from public.subscriptions s join public.subscription_plans p on p.id=s.plan_id where s.status='ACTIVE' and p.code='al_journey' and (s.expires_at is null or s.expires_at>now())),
    'expiringIn7Days', (select count(*) from public.subscriptions where status='ACTIVE' and expires_at between now() and now()+interval '7 days'),
    'blockedUsers', (select count(*) from public.account_access where is_blocked),
    'paymentRequiredUsers', (select count(*) from auth.users u where not exists(select 1 from public.subscriptions s where s.user_id=u.id and s.status='ACTIVE' and (s.expires_at is null or s.expires_at>now())) and not exists(select 1 from public.account_access a where a.user_id=u.id and (a.is_blocked or a.grandfathered)))
  ) into result;
  return result;
end;$$;

grant execute on function public.admin_monetization_stats() to authenticated;
