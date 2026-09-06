-- Let administrators search user accounts by profile name as well as email and ID.
create or replace function public.admin_list_users(search_text text default null, max_rows integer default 100)
returns table(user_id uuid,email text,created_at timestamptz,stream text,exam_year integer,role text,is_blocked boolean,access_state text,plan_name text,premium_expires_at timestamptz,payment_reference text,activation_code text)
language plpgsql security definer set search_path=public,auth as $$
begin
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  return query
  with users_base as (
    select u.id,u.email,u.created_at,sp.stream,sp.exam_year,coalesce(ur.role,'student') user_role,coalesce(aa.is_blocked,false) blocked,coalesce(aa.grandfathered,false) grandfathered
    from auth.users u left join public.student_profiles sp on sp.user_id=u.id left join public.user_roles ur on ur.user_id=u.id left join public.account_access aa on aa.user_id=u.id
    where search_text is null or trim(search_text)='' or lower(coalesce(u.email,'')) like '%'||lower(trim(search_text))||'%' or lower(coalesce(sp.full_name,'')) like '%'||lower(trim(search_text))||'%' or u.id::text like '%'||trim(search_text)||'%'
    order by u.created_at desc limit greatest(1,least(max_rows,500))
  )
  select ub.id,ub.email,ub.created_at,ub.stream,ub.exam_year,ub.user_role,ub.blocked,
    case when ub.blocked then 'BLOCKED' when ub.user_role in ('content_admin','support_admin','super_admin') then 'ADMIN' when active_sub.id is not null then 'PREMIUM' when ub.grandfathered then 'GRANDFATHERED' when pending.id is not null then 'PAYMENT_PENDING' when public.studyarc_setting_bool('paid_mode_enabled',false) then 'PAYMENT_REQUIRED' else 'ACTIVE_FREE' end,
    active_plan.name,active_sub.expires_at,pending.payment_reference,code_row.code
  from users_base ub
  left join lateral (select s.id,s.plan_id,s.expires_at from public.subscriptions s where s.user_id=ub.id and s.status='ACTIVE' and (s.expires_at is null or s.expires_at>now()) order by s.expires_at desc nulls first limit 1) active_sub on true
  left join public.subscription_plans active_plan on active_plan.id=active_sub.plan_id
  left join lateral (select p.id,p.payment_reference from public.payments p where p.user_id=ub.id and p.status='PENDING' order by p.submitted_at desc limit 1) pending on true
  left join lateral (select c.code from public.activation_codes c where c.user_id=ub.id and c.status='AVAILABLE' order by c.created_at desc limit 1) code_row on true;
end;$$;
revoke all on function public.admin_list_users(text,integer) from public,anon;
grant execute on function public.admin_list_users(text,integer) to authenticated;
