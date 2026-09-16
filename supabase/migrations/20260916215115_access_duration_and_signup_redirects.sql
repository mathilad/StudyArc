alter table public.activation_codes add column if not exists premium_months integer check (premium_months between 1 and 120);

create or replace function public.admin_extend_premium(target_user uuid, target_plan uuid, premium_months integer default null, reason text default null)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare p public.subscription_plans%rowtype; expiry timestamptz; base timestamptz; sid uuid;
begin
  if auth.uid() is null or not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  if premium_months is not null and premium_months not between 1 and 120 then raise exception 'Invalid premium duration'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_user::text,0));
  select * into p from public.subscription_plans where id=target_plan;
  if p.id is null then raise exception 'Plan not found'; end if;
  select greatest(now(),coalesce(max(expires_at),now())) into base from public.subscriptions where user_id=target_user and status='ACTIVE';
  if premium_months is not null then expiry:=base+make_interval(months=>premium_months);
  elsif p.duration_type='exam_linked' then expiry:=greatest(base,public.studyarc_exam_access_end(target_user));
  else expiry:=base+make_interval(days=>coalesce(p.duration_days,30)); end if;
  insert into public.subscriptions(user_id,plan_id,status,starts_at,expires_at,duration_source,granted_by_admin,grant_reason) values(target_user,p.id,'ACTIVE',now(),expiry,'admin_grant',auth.uid(),reason) returning id into sid;
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_key,after_value) values(auth.uid(),'premium_extended','subscription',sid::text,jsonb_build_object('userId',target_user,'months',premium_months,'expiresAt',expiry,'reason',reason));
  return jsonb_build_object('subscriptionId',sid,'expiresAt',expiry);
end;$$;

create or replace function public.admin_generate_timed_activation_code(target_user uuid, target_plan uuid, valid_days integer default 30, premium_months integer default null)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  if premium_months is not null and premium_months not between 1 and 120 then raise exception 'Invalid premium duration'; end if;
  if valid_days is null or valid_days not between 1 and 365 then raise exception 'Invalid redemption window'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_user::text,0));
  result:=public.admin_generate_activation_code(target_user,target_plan,valid_days);
  update public.activation_codes set premium_months=admin_generate_timed_activation_code.premium_months where id=(result->>'id')::uuid;
  return result||jsonb_build_object('premiumMonths',premium_months);
end;$$;

create or replace function public.redeem_my_activation_code(submitted_code text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare uid uuid:=auth.uid(); c public.activation_codes%rowtype; p public.subscription_plans%rowtype; expiry timestamptz; base timestamptz; sid uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if exists(select 1 from public.account_access where user_id=uid and is_blocked) then raise exception 'Account is blocked'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into c from public.activation_codes where user_id=uid and upper(code)=upper(trim(submitted_code)) and status='AVAILABLE' limit 1 for update;
  if c.id is null then raise exception 'Invalid activation code'; end if;
  if c.expires_at is not null and c.expires_at<=now() then raise exception 'Activation code expired'; end if;
  select * into p from public.subscription_plans where id=c.plan_id;
  if p.id is null then raise exception 'Plan not found'; end if;
  select greatest(now(),coalesce(max(expires_at),now())) into base from public.subscriptions where user_id=uid and status='ACTIVE';
  if c.premium_months is not null then expiry:=base+make_interval(months=>c.premium_months);
  elsif p.duration_type='exam_linked' then expiry:=greatest(base,public.studyarc_exam_access_end(uid));
  else expiry:=base+make_interval(days=>coalesce(p.duration_days,30)); end if;
  insert into public.subscriptions(user_id,plan_id,status,starts_at,expires_at,duration_source) values(uid,p.id,'ACTIVE',now(),expiry,'activation_code') returning id into sid;
  update public.activation_codes set status='REDEEMED',redeemed_at=now() where id=c.id;
  return jsonb_build_object('subscriptionId',sid,'planName',p.name,'expiresAt',expiry);
end;$$;
revoke all on function public.admin_extend_premium(uuid,uuid,integer,text) from public,anon;
revoke all on function public.admin_generate_timed_activation_code(uuid,uuid,integer,integer) from public,anon;
grant execute on function public.admin_extend_premium(uuid,uuid,integer,text) to authenticated;
grant execute on function public.admin_generate_timed_activation_code(uuid,uuid,integer,integer) to authenticated;
revoke all on function public.redeem_my_activation_code(text) from public,anon;
grant execute on function public.redeem_my_activation_code(text) to authenticated;

insert into public.app_settings(key,value) values
('signup_app_url','"studyarc://login"'::jsonb),
('signup_web_url','"https://mathilad.github.io/StudyArc/login"'::jsonb)
on conflict(key) do nothing;
-- Expose only these two non-sensitive destinations to the pre-login callback.
create policy "public signup destinations" on public.app_settings for select to anon using (key in ('signup_app_url','signup_web_url'));
grant select on public.app_settings to anon;
