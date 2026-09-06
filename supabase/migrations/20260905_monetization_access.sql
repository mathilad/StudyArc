-- Study Arc monetization and access-control layer
-- Apply after 20260905_platform_upgrade.sql

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Global monetization configuration
-- ---------------------------------------------------------------------------
insert into public.app_settings(key,value) values
  ('paid_mode_enabled', 'false'::jsonb),
  ('paid_mode_new_users_only', 'true'::jsonb),
  ('paid_mode_cutoff', to_jsonb(now()::text)),
  ('al_journey_grace_days', '30'::jsonb),
  ('currency', to_jsonb('LKR'::text)),
  ('payment_instructions', to_jsonb('Include your Study Arc payment reference when making a transfer.'::text))
on conflict(key) do nothing;

-- ---------------------------------------------------------------------------
-- Plans. Prices are data, not app constants, so admins can change them live.
-- ---------------------------------------------------------------------------
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price_lkr integer not null check (price_lkr >= 0),
  duration_type text not null check (duration_type in ('fixed_days','exam_linked')),
  duration_days integer check (duration_days is null or duration_days > 0),
  featured boolean not null default false,
  enabled boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.subscription_plans(code,name,description,price_lkr,duration_type,duration_days,featured,enabled,display_order) values
  ('month_1','1 Month','Study Arc Premium for one month',499,'fixed_days',30,false,true,10),
  ('month_3','3 Months','Study Arc Premium for three months',1299,'fixed_days',90,false,true,20),
  ('month_6','6 Months','Study Arc Premium for six months',2399,'fixed_days',180,false,true,30),
  ('year_1','1 Year','Study Arc Premium for one year',3999,'fixed_days',365,false,true,40),
  ('al_journey','Entire A/L Journey','Premium until the student completes the selected A/L examination, plus the configured post-exam grace period.',7999,'exam_linked',null,true,true,50)
on conflict(code) do nothing;

-- ---------------------------------------------------------------------------
-- Account access / blocking
-- ---------------------------------------------------------------------------
create table if not exists public.account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_blocked boolean not null default false,
  blocked_at timestamptz,
  blocked_by uuid references auth.users(id) on delete set null,
  internal_block_reason text,
  public_block_message text,
  pause_subscription_while_blocked boolean not null default false,
  grandfathered boolean not null default false,
  grandfathered_at timestamptz,
  access_override text check (access_override is null or access_override in ('free','premium')),
  override_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Subscriptions / entitlements
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','EXPIRED','CANCELLED','REVOKED')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  duration_source text not null default 'payment' check (duration_source in ('payment','admin_grant','activation_code','store','grandfathered')),
  payment_id uuid,
  granted_by_admin uuid references auth.users(id) on delete set null,
  grant_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_status_idx on public.subscriptions(user_id,status,expires_at desc);

-- ---------------------------------------------------------------------------
-- Payment methods and manual bank-transfer workflow
-- ---------------------------------------------------------------------------
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  method_type text not null default 'bank_transfer',
  name text not null,
  bank_name text,
  branch_name text,
  account_holder text,
  account_number text,
  instructions text,
  enabled boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  amount_lkr integer not null check(amount_lkr >= 0),
  payment_reference text not null unique,
  status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED','CANCELLED')),
  receipt_path text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_user_status_idx on public.payments(user_id,status,submitted_at desc);
create index if not exists payments_status_idx on public.payments(status,submitted_at asc);

alter table public.subscriptions drop constraint if exists subscriptions_payment_id_fkey;
alter table public.subscriptions add constraint subscriptions_payment_id_fkey foreign key(payment_id) references public.payments(id) on delete set null;

-- ---------------------------------------------------------------------------
-- User-bound activation codes. Codes are created only by trusted admin RPCs.
-- ---------------------------------------------------------------------------
create table if not exists public.activation_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  code text not null unique,
  status text not null default 'AVAILABLE' check(status in ('AVAILABLE','REDEEMED','REVOKED','EXPIRED')),
  expires_at timestamptz,
  redeemed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists activation_codes_user_idx on public.activation_codes(user_id,status,created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.studyarc_setting_text(setting_key text, fallback text)
returns text language sql stable security definer set search_path=public as $$
  select coalesce((select trim(both '"' from value::text) from public.app_settings where key=setting_key), fallback);
$$;

create or replace function public.studyarc_setting_bool(setting_key text, fallback boolean)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare raw jsonb;
begin
  select value into raw from public.app_settings where key=setting_key;
  if raw is null then return fallback; end if;
  return coalesce((raw::text)::boolean, fallback);
exception when others then return fallback;
end;
$$;

create or replace function public.studyarc_setting_int(setting_key text, fallback integer)
returns integer language plpgsql stable security definer set search_path=public as $$
declare raw jsonb;
begin
  select value into raw from public.app_settings where key=setting_key;
  if raw is null then return fallback; end if;
  return coalesce((raw::text)::integer, fallback);
exception when others then return fallback;
end;
$$;

create or replace function public.studyarc_make_reference(prefix text)
returns text language sql volatile as $$
  select upper(prefix || '-' || substr(encode(gen_random_bytes(6),'hex'),1,10));
$$;

-- Last configured main-exam component for the student. Fallback is August 31
-- of the selected exam year until the student enters exact component dates.
create or replace function public.studyarc_exam_access_end(uid uuid)
returns timestamptz language plpgsql stable security definer set search_path=public as $$
declare exact_end timestamptz; y integer; grace integer;
begin
  select max(ec.exam_at) into exact_end
  from public.exam_components ec join public.exams e on e.id=ec.exam_id
  where ec.user_id=uid and e.is_main_exam=true and ec.exam_at is not null;
  grace := public.studyarc_setting_int('al_journey_grace_days',30);
  if exact_end is not null then return exact_end + make_interval(days=>grace); end if;
  select exam_year into y from public.student_profiles where user_id=uid;
  if y is null then return null; end if;
  return make_timestamptz(y,8,31,23,59,59,'Asia/Colombo') + make_interval(days=>grace);
end;
$$;

-- ---------------------------------------------------------------------------
-- Central access decision used by the app at startup.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_access_status()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  uid uuid := auth.uid();
  role_name text := 'student';
  access_row public.account_access%rowtype;
  premium_row record;
  pending_row record;
  paid boolean;
  new_only boolean;
  cutoff timestamptz;
  created timestamptz;
  state text;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select coalesce(role,'student') into role_name from public.user_roles where user_id=uid;
  if role_name is null then role_name := 'student'; end if;

  insert into public.account_access(user_id) values(uid) on conflict(user_id) do nothing;
  select * into access_row from public.account_access where user_id=uid;

  if access_row.is_blocked then
    return jsonb_build_object('state','BLOCKED','blocked',true,'publicMessage',coalesce(access_row.public_block_message,'Account access has been restricted. Please contact Study Arc support.'),'role',role_name);
  end if;

  if role_name in ('content_admin','support_admin','super_admin') then
    return jsonb_build_object('state','ADMIN','blocked',false,'role',role_name,'paidMode',public.studyarc_setting_bool('paid_mode_enabled',false));
  end if;

  if access_row.access_override='premium' and (access_row.override_expires_at is null or access_row.override_expires_at>now()) then
    return jsonb_build_object('state','PREMIUM','blocked',false,'role',role_name,'source','override','expiresAt',access_row.override_expires_at);
  end if;
  if access_row.access_override='free' and (access_row.override_expires_at is null or access_row.override_expires_at>now()) then
    return jsonb_build_object('state','ACTIVE_FREE','blocked',false,'role',role_name,'source','override');
  end if;

  select s.id,s.expires_at,p.code,p.name,p.duration_type into premium_row
  from public.subscriptions s left join public.subscription_plans p on p.id=s.plan_id
  where s.user_id=uid and s.status='ACTIVE' and (s.expires_at is null or s.expires_at>now())
  order by s.expires_at desc nulls first limit 1;
  if premium_row.id is not null then
    return jsonb_build_object('state','PREMIUM','blocked',false,'role',role_name,'planCode',premium_row.code,'planName',premium_row.name,'expiresAt',premium_row.expires_at);
  end if;

  paid := public.studyarc_setting_bool('paid_mode_enabled',false);
  if not paid then return jsonb_build_object('state','ACTIVE_FREE','blocked',false,'role',role_name,'paidMode',false); end if;

  if access_row.grandfathered then return jsonb_build_object('state','GRANDFATHERED','blocked',false,'role',role_name,'paidMode',true); end if;

  new_only := public.studyarc_setting_bool('paid_mode_new_users_only',true);
  if new_only then
    begin cutoff := public.studyarc_setting_text('paid_mode_cutoff',now()::text)::timestamptz; exception when others then cutoff:=now(); end;
    select created_at into created from auth.users where id=uid;
    if created is not null and created < cutoff then
      update public.account_access set grandfathered=true,grandfathered_at=now(),updated_at=now() where user_id=uid;
      return jsonb_build_object('state','GRANDFATHERED','blocked',false,'role',role_name,'paidMode',true);
    end if;
  end if;

  select p.id,p.payment_reference,sp.name into pending_row
  from public.payments p join public.subscription_plans sp on sp.id=p.plan_id
  where p.user_id=uid and p.status='PENDING' order by p.submitted_at desc limit 1;
  if pending_row.id is not null then
    return jsonb_build_object('state','PAYMENT_PENDING','blocked',false,'role',role_name,'paymentReference',pending_row.payment_reference,'planName',pending_row.name,'paidMode',true);
  end if;

  return jsonb_build_object('state','PAYMENT_REQUIRED','blocked',false,'role',role_name,'paidMode',true);
end;
$$;

-- ---------------------------------------------------------------------------
-- User payment RPC
-- ---------------------------------------------------------------------------
create or replace function public.create_my_payment_request(requested_plan_id uuid, requested_method_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare uid uuid:=auth.uid(); plan_row public.subscription_plans%rowtype; ref text; payment_id uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if exists(select 1 from public.account_access where user_id=uid and is_blocked) then raise exception 'Account is blocked'; end if;
  select * into plan_row from public.subscription_plans where id=requested_plan_id and enabled=true;
  if plan_row.id is null then raise exception 'Plan unavailable'; end if;
  loop
    ref:=public.studyarc_make_reference('SA-PAY');
    exit when not exists(select 1 from public.payments where payment_reference=ref);
  end loop;
  insert into public.payments(user_id,plan_id,payment_method_id,amount_lkr,payment_reference)
  values(uid,plan_row.id,requested_method_id,plan_row.price_lkr,ref) returning id into payment_id;
  return jsonb_build_object('paymentId',payment_id,'reference',ref,'amountLkr',plan_row.price_lkr,'planName',plan_row.name);
end;
$$;

create or replace function public.redeem_my_activation_code(submitted_code text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare uid uuid:=auth.uid(); c public.activation_codes%rowtype; p public.subscription_plans%rowtype; expiry timestamptz; sid uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if exists(select 1 from public.account_access where user_id=uid and is_blocked) then raise exception 'Account is blocked'; end if;
  select * into c from public.activation_codes where user_id=uid and upper(code)=upper(trim(submitted_code)) and status='AVAILABLE' limit 1 for update;
  if c.id is null then raise exception 'Invalid activation code'; end if;
  if c.expires_at is not null and c.expires_at<=now() then update public.activation_codes set status='EXPIRED' where id=c.id; raise exception 'Activation code expired'; end if;
  select * into p from public.subscription_plans where id=c.plan_id;
  if p.duration_type='exam_linked' then expiry:=public.studyarc_exam_access_end(uid); else expiry:=now()+make_interval(days=>coalesce(p.duration_days,30)); end if;
  insert into public.subscriptions(user_id,plan_id,status,starts_at,expires_at,duration_source) values(uid,p.id,'ACTIVE',now(),expiry,'activation_code') returning id into sid;
  update public.activation_codes set status='REDEEMED',redeemed_at=now() where id=c.id;
  return jsonb_build_object('subscriptionId',sid,'planName',p.name,'expiresAt',expiry);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin monetization RPCs
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_paid_mode(enabled boolean, new_users_only boolean, cutoff timestamptz default now())
returns void language plpgsql security definer set search_path=public,auth as $$
begin
  if not public.is_studyarc_super_admin() then raise exception 'Not authorized'; end if;
  insert into public.app_settings(key,value,updated_by) values('paid_mode_enabled',to_jsonb(enabled),auth.uid()) on conflict(key) do update set value=excluded.value,updated_at=now(),updated_by=auth.uid();
  insert into public.app_settings(key,value,updated_by) values('paid_mode_new_users_only',to_jsonb(new_users_only),auth.uid()) on conflict(key) do update set value=excluded.value,updated_at=now(),updated_by=auth.uid();
  insert into public.app_settings(key,value,updated_by) values('paid_mode_cutoff',to_jsonb(cutoff::text),auth.uid()) on conflict(key) do update set value=excluded.value,updated_at=now(),updated_by=auth.uid();
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_key,after_value) values(auth.uid(),'paid_mode_updated','app_setting','paid_mode',jsonb_build_object('enabled',enabled,'newUsersOnly',new_users_only,'cutoff',cutoff));
end;$$;

create or replace function public.admin_update_plan(plan_id uuid, new_price_lkr integer, new_enabled boolean, new_featured boolean)
returns void language plpgsql security definer set search_path=public,auth as $$
declare before_row jsonb; after_row jsonb;
begin
  if not public.is_studyarc_super_admin() then raise exception 'Not authorized'; end if;
  if new_price_lkr<0 then raise exception 'Invalid price'; end if;
  select to_jsonb(p) into before_row from public.subscription_plans p where id=plan_id;
  update public.subscription_plans set price_lkr=new_price_lkr,enabled=new_enabled,featured=new_featured,updated_at=now() where id=plan_id;
  if not found then raise exception 'Plan not found'; end if;
  select to_jsonb(p) into after_row from public.subscription_plans p where id=plan_id;
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_key,before_value,after_value) values(auth.uid(),'plan_updated','subscription_plan',plan_id::text,before_row,after_row);
end;$$;

create or replace function public.admin_block_user(target_user uuid, internal_reason text default null, public_message text default null, pause_subscription boolean default false)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  if target_user=auth.uid() then raise exception 'Cannot block your own admin account'; end if;
  insert into public.account_access(user_id,is_blocked,blocked_at,blocked_by,internal_block_reason,public_block_message,pause_subscription_while_blocked,updated_at)
  values(target_user,true,now(),auth.uid(),internal_reason,public_message,pause_subscription,now())
  on conflict(user_id) do update set is_blocked=true,blocked_at=now(),blocked_by=auth.uid(),internal_block_reason=excluded.internal_block_reason,public_block_message=excluded.public_block_message,pause_subscription_while_blocked=excluded.pause_subscription_while_blocked,updated_at=now();
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_key,after_value) values(auth.uid(),'user_blocked','account_access',target_user::text,jsonb_build_object('internalReason',internal_reason,'pauseSubscription',pause_subscription));
end;$$;

create or replace function public.admin_unblock_user(target_user uuid)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  update public.account_access set is_blocked=false,blocked_at=null,blocked_by=null,internal_block_reason=null,public_block_message=null,updated_at=now() where user_id=target_user;
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_key) values(auth.uid(),'user_unblocked','account_access',target_user::text);
end;$$;

create or replace function public.admin_grant_premium(target_user uuid, target_plan uuid, custom_days integer default null, reason text default null)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare p public.subscription_plans%rowtype; expiry timestamptz; sid uuid;
begin
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  select * into p from public.subscription_plans where id=target_plan;
  if p.id is null then raise exception 'Plan not found'; end if;
  if custom_days is not null then expiry:=now()+make_interval(days=>greatest(1,custom_days));
  elsif p.duration_type='exam_linked' then expiry:=public.studyarc_exam_access_end(target_user);
  else expiry:=now()+make_interval(days=>coalesce(p.duration_days,30)); end if;
  insert into public.subscriptions(user_id,plan_id,status,starts_at,expires_at,duration_source,granted_by_admin,grant_reason) values(target_user,p.id,'ACTIVE',now(),expiry,'admin_grant',auth.uid(),reason) returning id into sid;
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_key,after_value) values(auth.uid(),'premium_granted','subscription',sid::text,jsonb_build_object('userId',target_user,'plan',p.code,'expiresAt',expiry,'reason',reason));
  return jsonb_build_object('subscriptionId',sid,'expiresAt',expiry);
end;$$;

create or replace function public.admin_generate_activation_code(target_user uuid, target_plan uuid, valid_days integer default 30)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare code_value text; code_id uuid;
begin
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  update public.activation_codes set status='REVOKED' where user_id=target_user and status='AVAILABLE';
  loop
    code_value:=public.studyarc_make_reference('SA');
    exit when not exists(select 1 from public.activation_codes where code=code_value);
  end loop;
  insert into public.activation_codes(user_id,plan_id,code,status,expires_at,created_by) values(target_user,target_plan,code_value,'AVAILABLE',now()+make_interval(days=>greatest(1,valid_days)),auth.uid()) returning id into code_id;
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_key,after_value) values(auth.uid(),'activation_code_generated','activation_code',code_id::text,jsonb_build_object('userId',target_user,'planId',target_plan));
  return jsonb_build_object('id',code_id,'code',code_value,'expiresAt',now()+make_interval(days=>greatest(1,valid_days)));
end;$$;

create or replace function public.admin_approve_payment(target_payment uuid)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare pay public.payments%rowtype; p public.subscription_plans%rowtype; existing_expiry timestamptz; start_base timestamptz; expiry timestamptz; sid uuid;
begin
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  select * into pay from public.payments where id=target_payment for update;
  if pay.id is null then raise exception 'Payment not found'; end if;
  if pay.status<>'PENDING' then raise exception 'Payment already reviewed'; end if;
  select * into p from public.subscription_plans where id=pay.plan_id;
  select max(expires_at) into existing_expiry from public.subscriptions where user_id=pay.user_id and status='ACTIVE' and expires_at>now();
  if p.duration_type='exam_linked' then expiry:=public.studyarc_exam_access_end(pay.user_id);
  else start_base:=greatest(now(),coalesce(existing_expiry,now())); expiry:=start_base+make_interval(days=>coalesce(p.duration_days,30)); end if;
  update public.payments set status='APPROVED',reviewed_at=now(),reviewed_by=auth.uid(),updated_at=now() where id=pay.id;
  insert into public.subscriptions(user_id,plan_id,status,starts_at,expires_at,duration_source,payment_id) values(pay.user_id,p.id,'ACTIVE',now(),expiry,'payment',pay.id) returning id into sid;
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_key,after_value) values(auth.uid(),'payment_approved','payment',pay.id::text,jsonb_build_object('userId',pay.user_id,'subscriptionId',sid,'expiresAt',expiry));
  return jsonb_build_object('subscriptionId',sid,'expiresAt',expiry);
end;$$;

create or replace function public.admin_reject_payment(target_payment uuid, note text default null)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  update public.payments set status='REJECTED',reviewed_at=now(),reviewed_by=auth.uid(),review_note=note,updated_at=now() where id=target_payment and status='PENDING';
  if not found then raise exception 'Pending payment not found'; end if;
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_key,after_value) values(auth.uid(),'payment_rejected','payment',target_payment::text,jsonb_build_object('note',note));
end;$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.subscription_plans enable row level security;
alter table public.account_access enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_methods enable row level security;
alter table public.payments enable row level security;
alter table public.activation_codes enable row level security;

create policy "read enabled plans" on public.subscription_plans for select to authenticated using(enabled or public.is_studyarc_admin());
create policy "admin manages plans" on public.subscription_plans for all to authenticated using(public.is_studyarc_super_admin()) with check(public.is_studyarc_super_admin());
create policy "read own access" on public.account_access for select to authenticated using(user_id=auth.uid() or public.is_studyarc_admin());
create policy "admin manages access" on public.account_access for all to authenticated using(public.is_studyarc_admin()) with check(public.is_studyarc_admin());
create policy "read own subscriptions" on public.subscriptions for select to authenticated using(user_id=auth.uid() or public.is_studyarc_admin());
create policy "admin manages subscriptions" on public.subscriptions for all to authenticated using(public.is_studyarc_admin()) with check(public.is_studyarc_admin());
create policy "read enabled payment methods" on public.payment_methods for select to authenticated using(enabled or public.is_studyarc_admin());
create policy "admin manages payment methods" on public.payment_methods for all to authenticated using(public.is_studyarc_admin()) with check(public.is_studyarc_admin());
create policy "read own payments" on public.payments for select to authenticated using(user_id=auth.uid() or public.is_studyarc_admin());
create policy "create own payments" on public.payments for insert to authenticated with check(user_id=auth.uid());
create policy "admin manages payments" on public.payments for all to authenticated using(public.is_studyarc_admin()) with check(public.is_studyarc_admin());
create policy "admin reads activation codes" on public.activation_codes for select to authenticated using(public.is_studyarc_admin());
create policy "admin manages activation codes" on public.activation_codes for all to authenticated using(public.is_studyarc_admin()) with check(public.is_studyarc_admin());

grant execute on function public.get_my_access_status() to authenticated;
grant execute on function public.create_my_payment_request(uuid,uuid) to authenticated;
grant execute on function public.redeem_my_activation_code(text) to authenticated;
grant execute on function public.admin_set_paid_mode(boolean,boolean,timestamptz) to authenticated;
grant execute on function public.admin_update_plan(uuid,integer,boolean,boolean) to authenticated;
grant execute on function public.admin_block_user(uuid,text,text,boolean) to authenticated;
grant execute on function public.admin_unblock_user(uuid) to authenticated;
grant execute on function public.admin_grant_premium(uuid,uuid,integer,text) to authenticated;
grant execute on function public.admin_generate_activation_code(uuid,uuid,integer) to authenticated;
grant execute on function public.admin_approve_payment(uuid) to authenticated;
grant execute on function public.admin_reject_payment(uuid,text) to authenticated;
