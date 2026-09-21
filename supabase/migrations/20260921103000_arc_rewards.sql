-- Arc Coins, XP, levels, store ownership and equipped cosmetics.
create table if not exists public.reward_catalog (
  id text primary key,
  category text not null,
  name text not null,
  price integer not null check (price between 250 and 1000),
  level_required integer not null default 0 check (level_required >= 0),
  active boolean not null default true
);

create table if not exists public.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  kind text not null,
  coins_delta integer not null default 0,
  xp_delta integer not null default 0 check (xp_delta >= 0),
  label text not null,
  item_id text references public.reward_catalog(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(user_id,event_key)
);
create index if not exists reward_ledger_user_created_idx on public.reward_ledger(user_id,created_at desc);

create table if not exists public.reward_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.reward_catalog(id) on delete cascade,
  price_paid integer not null,
  purchased_at timestamptz not null default now(),
  primary key(user_id,item_id)
);

create table if not exists public.reward_loadout (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  item_id text not null references public.reward_catalog(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key(user_id,category)
);

alter table public.reward_catalog enable row level security;
alter table public.reward_ledger enable row level security;
alter table public.reward_inventory enable row level security;
alter table public.reward_loadout enable row level security;

drop policy if exists "reward_catalog_read" on public.reward_catalog;
create policy "reward_catalog_read" on public.reward_catalog for select to authenticated using (active=true);
drop policy if exists "reward_ledger_owner_read" on public.reward_ledger;
create policy "reward_ledger_owner_read" on public.reward_ledger for select to authenticated using (auth.uid()=user_id);
drop policy if exists "reward_inventory_owner_read" on public.reward_inventory;
create policy "reward_inventory_owner_read" on public.reward_inventory for select to authenticated using (auth.uid()=user_id);
drop policy if exists "reward_loadout_owner_read" on public.reward_loadout;
create policy "reward_loadout_owner_read" on public.reward_loadout for select to authenticated using (auth.uid()=user_id);

insert into public.reward_catalog(id,category,name,price,level_required,active) values
('clock-faces:classic-digital','clock-faces','Classic Digital',300,0,true),
('clock-faces:precision','clock-faces','Precision',325,0,true),
('clock-faces:minimal-line','clock-faces','Minimal Line',325,0,true),
('clock-faces:analog-arc','clock-faces','Analog Arc',350,0,true),
('clock-faces:flip-board','clock-faces','Flip Board',375,0,true),
('clock-faces:arc-ring','clock-faces','Arc Ring',375,0,true),
('clock-faces:segment','clock-faces','Segment',400,0,true),
('clock-faces:neon-grid','clock-faces','Neon Grid',425,0,true),
('clock-faces:aurora','clock-faces','Aurora',425,0,true),
('clock-faces:academic','clock-faces','Academic',450,0,true),
('clock-faces:deep-space','clock-faces','Deep Space',475,0,true),
('clock-faces:nature-dial','clock-faces','Nature Dial',475,10,true),
('clock-faces:glass','clock-faces','Glass',500,10,true),
('clock-faces:retro-lcd','clock-faces','Retro LCD',525,20,true),
('clock-faces:cyber','clock-faces','Cyber',525,20,true),
('clock-faces:focus','clock-faces','Focus',550,30,true),
('stopwatch-layouts:classic','stopwatch-layouts','Classic',450,0,true),
('stopwatch-layouts:circular','stopwatch-layouts','Circular',475,0,true),
('stopwatch-layouts:digital-deck','stopwatch-layouts','Digital Deck',500,0,true),
('stopwatch-layouts:lap-studio','stopwatch-layouts','Lap Studio',525,0,true),
('stopwatch-layouts:ring-workspace','stopwatch-layouts','Ring Workspace',550,0,true),
('stopwatch-layouts:neon-console','stopwatch-layouts','Neon Console',600,10,true),
('stopwatch-layouts:split-focus','stopwatch-layouts','Split Focus',625,10,true),
('stopwatch-layouts:wide-desk','stopwatch-layouts','Wide Desk',650,20,true),
('stopwatch-layouts:compact-flow','stopwatch-layouts','Compact Flow',675,20,true),
('stopwatch-layouts:zen-timer','stopwatch-layouts','Zen Timer',700,30,true),
('themes:midnight','themes','Midnight',700,0,true),
('themes:aurora','themes','Aurora',725,0,true),
('themes:forest','themes','Forest',750,0,true),
('themes:ocean','themes','Ocean',775,0,true),
('themes:cosmic','themes','Cosmic',800,0,true),
('themes:neon','themes','Neon',825,0,true),
('themes:ember','themes','Ember',875,0,true),
('themes:minimal','themes','Minimal',900,10,true),
('themes:paper','themes','Paper',925,10,true),
('themes:glass','themes','Glass',950,20,true),
('themes:monochrome','themes','Monochrome',975,20,true),
('themes:studyarc-signature','themes','StudyArc Signature',1000,30,true),
('page-themes:timer-night','page-themes','Timer Night',550,0,true),
('page-themes:planner-aurora','page-themes','Planner Aurora',575,0,true),
('page-themes:subjects-archive','page-themes','Subjects Archive',575,0,true),
('page-themes:paper-lab-pro','page-themes','Paper Lab Pro',600,0,true),
('page-themes:journey-glow','page-themes','Journey Glow',625,0,true),
('page-themes:revise-calm','page-themes','Revise Calm',625,10,true),
('page-themes:assignments-grid','page-themes','Assignments Grid',650,10,true),
('page-themes:statistics-glass','page-themes','Statistics Glass',675,20,true),
('page-themes:study-hub-focus','page-themes','Study Hub Focus',675,20,true),
('page-themes:exam-room','page-themes','Exam Room',700,30,true),
('completion-effects:arc-spark','completion-effects','Arc Spark',250,0,true),
('completion-effects:confetti','completion-effects','Confetti',275,0,true),
('completion-effects:glow-burst','completion-effects','Glow Burst',300,0,true),
('completion-effects:arc-wave','completion-effects','Arc Wave',325,0,true),
('completion-effects:stars','completion-effects','Stars',350,0,true),
('completion-effects:fireworks','completion-effects','Fireworks',375,0,true),
('completion-effects:pulse-bloom','completion-effects','Pulse Bloom',375,0,true),
('completion-effects:ribbon-sweep','completion-effects','Ribbon Sweep',400,10,true),
('completion-effects:crystal-pop','completion-effects','Crystal Pop',425,10,true),
('completion-effects:orbit-burst','completion-effects','Orbit Burst',450,20,true),
('completion-effects:comet-trail','completion-effects','Comet Trail',475,20,true),
('completion-effects:gold-finish','completion-effects','Gold Finish',500,30,true),
('focus-effects:soft-glow','focus-effects','Soft Glow',300,0,true),
('focus-effects:circle-fill','focus-effects','Circle Fill',325,0,true),
('focus-effects:energy-wave','focus-effects','Energy Wave',350,0,true),
('focus-effects:calm-fade','focus-effects','Calm Fade',375,0,true),
('focus-effects:minimal','focus-effects','Minimal',400,0,true),
('focus-effects:breathing-halo','focus-effects','Breathing Halo',450,10,true),
('focus-effects:study-beam','focus-effects','Study Beam',475,10,true),
('focus-effects:deep-focus','focus-effects','Deep Focus',500,20,true),
('focus-effects:orbit','focus-effects','Orbit',525,20,true),
('focus-effects:quiet-pulse','focus-effects','Quiet Pulse',550,30,true),
('timer-animations:filling-circle','timer-animations','Filling Circle',350,0,true),
('timer-animations:gradient-flow','timer-animations','Gradient Flow',375,0,true),
('timer-animations:particle-ring','timer-animations','Particle Ring',400,0,true),
('timer-animations:nature-bloom','timer-animations','Nature Bloom',425,0,true),
('timer-animations:wave-motion','timer-animations','Wave Motion',450,0,true),
('timer-animations:minimal-tick','timer-animations','Minimal Tick',500,10,true),
('timer-animations:arc-sweep','timer-animations','Arc Sweep',525,10,true),
('timer-animations:orbit-clock','timer-animations','Orbit Clock',550,20,true),
('timer-animations:liquid-fill','timer-animations','Liquid Fill',575,20,true),
('timer-animations:focus-grid','timer-animations','Focus Grid',600,30,true),
('focus-sounds:rain','focus-sounds','Rain',250,0,true),
('focus-sounds:forest','focus-sounds','Forest',275,0,true),
('focus-sounds:library','focus-sounds','Library',275,0,true),
('focus-sounds:ocean','focus-sounds','Ocean',300,0,true),
('focus-sounds:cafe','focus-sounds','Cafe',325,0,true),
('focus-sounds:brown-noise','focus-sounds','Brown Noise',350,0,true),
('focus-sounds:fireplace','focus-sounds','Fireplace',350,0,true),
('focus-sounds:night-rain','focus-sounds','Night Rain',375,10,true),
('focus-sounds:river','focus-sounds','River',400,10,true),
('focus-sounds:wind','focus-sounds','Wind',425,20,true),
('focus-sounds:soft-train','focus-sounds','Soft Train',425,20,true),
('focus-sounds:deep-noise','focus-sounds','Deep Noise',450,30,true),
('loading-screens:arc-rise','loading-screens','Arc Rise',350,0,true),
('loading-screens:orbit','loading-screens','Orbit',400,10,true),
('loading-screens:study-desk','loading-screens','Study Desk',450,10,true),
('loading-screens:constellation','loading-screens','Constellation',500,20,true),
('loading-screens:minimal-line','loading-screens','Minimal Line',550,20,true),
('loading-screens:aurora-load','loading-screens','Aurora Load',600,30,true),
('milestone-effects:level-arc','milestone-effects','Level Arc',400,0,true),
('milestone-effects:trophy-burst','milestone-effects','Trophy Burst',450,10,true),
('milestone-effects:crown-glow','milestone-effects','Crown Glow',525,10,true),
('milestone-effects:constellation-win','milestone-effects','Constellation Win',575,20,true),
('milestone-effects:mastery-ring','milestone-effects','Mastery Ring',650,20,true),
('milestone-effects:signature-ascend','milestone-effects','Signature Ascend',700,30,true)
on conflict(id) do update set category=excluded.category,name=excluded.name,price=excluded.price,level_required=excluded.level_required,active=excluded.active;

create or replace function public.studyarc_reward_level(p_xp bigint)
returns integer
language plpgsql
immutable
as $$
declare
  v_level integer := 1;
  v_required bigint;
begin
  loop
    v_required := 25 * v_level * v_level + 125 * v_level;
    exit when p_xp < v_required or v_level >= 100;
    v_level := v_level + 1;
  end loop;
  return v_level;
end;
$$;

create or replace function public.apply_studyarc_reward_event(
  p_event_key text,
  p_kind text,
  p_source_id text,
  p_label text
)
returns table(coins_delta integer,xp_delta integer,event_key text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_coins integer := 0;
  v_xp integer := 0;
  v_duration integer := 0;
  v_type text;
  v_section text;
  v_ok boolean := false;
  v_n integer;
  v_score numeric;
  v_previous numeric;
  v_subject text;
  v_coverage numeric;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if exists(select 1 from public.reward_ledger where user_id=v_user and reward_ledger.event_key=p_event_key) then
    return query select l.coins_delta,l.xp_delta,l.event_key from public.reward_ledger l where l.user_id=v_user and l.event_key=p_event_key limit 1;
    return;
  end if;

  case p_kind
    when 'study_session' then
      select duration_seconds,study_type,paper_section into v_duration,v_type,v_section
      from public.study_sessions where user_id=v_user and id::text=p_source_id limit 1;
      if coalesce(v_duration,0) >= 600 then
        v_duration := least(v_duration,21600);
        v_coins := floor(v_duration/450.0);
        v_xp := floor(v_duration/90.0);
        if v_type='Revision' and v_duration>=1500 then v_coins:=v_coins+4;v_xp:=v_xp+12;
        elsif v_type='Past Papers' and v_duration>=1800 then
          if lower(coalesce(v_section,'')) like '%full%' then v_coins:=v_coins+20;v_xp:=v_xp+60;
          elsif lower(coalesce(v_section,'')) like any(array['%essay%','%part b%','%structured%']) then v_coins:=v_coins+12;v_xp:=v_xp+36;
          else v_coins:=v_coins+10;v_xp:=v_xp+30; end if;
        elsif v_type in ('Paper Review','Paper Correction','Paper Discussion') and v_duration>=1200 then v_coins:=v_coins+4;v_xp:=v_xp+12;
        end if;
        v_ok := true;
      end if;

    when 'assignment_completion' then
      select completed into v_ok from public.assignments where user_id=v_user and id::text=p_source_id limit 1;
      if coalesce(v_ok,false) then v_coins:=8;v_xp:=25; end if;

    when 'task_completion' then
      select (completed and assignment_id is null) into v_ok from public.planned_tasks where user_id=v_user and id::text=p_source_id limit 1;
      if coalesce(v_ok,false) then v_coins:=3;v_xp:=10; end if;

    when 'daily_plan' then
      select count(*) into v_n from public.planned_tasks where user_id=v_user and planned_date::text=p_source_id;
      select coalesce(bool_and(completed),false) into v_ok from public.planned_tasks where user_id=v_user and planned_date::text=p_source_id;
      if v_n>=2 and v_ok then v_coins:=8;v_xp:=20; else v_ok:=false; end if;

    when 'test_personal_best' then
      select subject_name,
        case when mcq_percent is not null and essay_percent is not null then (mcq_percent+essay_percent)/2 else coalesce(mcq_percent,essay_percent) end
      into v_subject,v_score
      from public.test_marks where user_id=v_user and id::text=p_source_id limit 1;
      select max(case when mcq_percent is not null and essay_percent is not null then (mcq_percent+essay_percent)/2 else coalesce(mcq_percent,essay_percent) end)
      into v_previous
      from public.test_marks where user_id=v_user and subject_name=v_subject and id::text<>p_source_id;
      if v_score is not null and v_previous is not null and v_score>v_previous then v_ok:=true;v_coins:=10;v_xp:=30; end if;

    when 'milestone' then
      if p_source_id like 'hours:%' then
        v_n:=split_part(p_source_id,':',2)::integer;
        select coalesce(sum(duration_seconds),0)>=v_n*3600 into v_ok from public.study_sessions where user_id=v_user;
        if v_n=10 then v_coins:=25;v_xp:=80;
        elsif v_n=50 then v_coins:=75;v_xp:=180;
        elsif v_n=100 then v_coins:=125;v_xp:=300;
        elsif v_n=250 then v_coins:=200;v_xp:=500;
        elsif v_n=500 then v_coins:=300;v_xp:=800;
        elsif v_n=1000 then v_coins:=500;v_xp:=1500;
        else v_ok:=false; end if;
      elsif p_source_id like 'streak:%' then
        v_n:=split_part(p_source_id,':',2)::integer;
        select count(distinct started_at::date)>=v_n into v_ok from public.study_sessions
          where user_id=v_user and started_at::date between current_date-(v_n-1) and current_date;
        if v_n=3 then v_coins:=10;v_xp:=30;
        elsif v_n=7 then v_coins:=25;v_xp:=80;
        elsif v_n=14 then v_coins:=40;v_xp:=140;
        elsif v_n=30 then v_coins:=75;v_xp:=280;
        elsif v_n=60 then v_coins:=120;v_xp:=450;
        elsif v_n=100 then v_coins:=200;v_xp:=800;
        else v_ok:=false; end if;
      elsif p_source_id like 'syllabus:%' then
        v_n:=split_part(p_source_id,':',2)::integer;
        select coalesce(avg(coverage),0) into v_coverage from public.topic_progress where user_id=v_user;
        v_ok:=v_coverage>=v_n;
        if v_n=25 then v_coins:=40;v_xp:=120;
        elsif v_n=50 then v_coins:=75;v_xp:=220;
        elsif v_n=75 then v_coins:=110;v_xp:=360;
        elsif v_n=100 then v_coins:=175;v_xp:=600;
        else v_ok:=false; end if;
      elsif p_source_id='first-paper' then
        select exists(select 1 from public.study_sessions where user_id=v_user and study_type='Past Papers') into v_ok;
        if v_ok then v_coins:=15;v_xp:=40; end if;
      end if;
  end case;

  if not v_ok or (v_coins<=0 and v_xp<=0) then return; end if;
  insert into public.reward_ledger(user_id,event_key,kind,coins_delta,xp_delta,label)
  values(v_user,p_event_key,
    case when p_kind='milestone' then 'milestone' when p_kind='study_session' then case when v_type='Past Papers' then 'paper' else 'study' end
      when p_kind='assignment_completion' then 'assignment' when p_kind='task_completion' then 'task'
      when p_kind='daily_plan' then 'daily' when p_kind='test_personal_best' then 'test' else 'study' end,
    v_coins,v_xp,coalesce(nullif(p_label,''),'StudyArc reward'))
  on conflict(user_id,event_key) do nothing;
  return query select l.coins_delta,l.xp_delta,l.event_key from public.reward_ledger l where l.user_id=v_user and l.event_key=p_event_key limit 1;
end;
$$;

create or replace function public.purchase_studyarc_reward(p_item_id text)
returns table(new_balance integer,item_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_price integer;
  v_level_required integer;
  v_balance integer;
  v_xp bigint;
  v_level integer;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if exists(select 1 from public.reward_inventory where user_id=v_user and reward_inventory.item_id=p_item_id) then
    select coalesce(sum(coins_delta),0) into v_balance from public.reward_ledger where user_id=v_user;
    return query select greatest(v_balance,0),p_item_id; return;
  end if;
  select price,level_required into v_price,v_level_required from public.reward_catalog where id=p_item_id and active=true;
  if v_price is null then raise exception 'Store item unavailable'; end if;
  select coalesce(sum(coins_delta),0),coalesce(sum(xp_delta),0) into v_balance,v_xp from public.reward_ledger where user_id=v_user;
  v_level:=public.studyarc_reward_level(v_xp);
  if v_level<v_level_required then raise exception 'Level % required',v_level_required; end if;
  if v_balance<v_price then raise exception 'Not enough Arc Coins'; end if;
  insert into public.reward_inventory(user_id,item_id,price_paid) values(v_user,p_item_id,v_price);
  insert into public.reward_ledger(user_id,event_key,kind,coins_delta,xp_delta,label,item_id)
  values(v_user,'purchase:'||p_item_id,'purchase',-v_price,0,'Purchased '||(select name from public.reward_catalog where id=p_item_id),p_item_id)
  on conflict(user_id,event_key) do nothing;
  return query select greatest(v_balance-v_price,0),p_item_id;
end;
$$;

create or replace function public.equip_studyarc_reward(p_item_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_category text;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if not exists(select 1 from public.reward_inventory where user_id=v_user and item_id=p_item_id) then raise exception 'Item is not owned'; end if;
  select category into v_category from public.reward_catalog where id=p_item_id and active=true;
  if v_category is null then raise exception 'Store item unavailable'; end if;
  insert into public.reward_loadout(user_id,category,item_id,updated_at) values(v_user,v_category,p_item_id,now())
  on conflict(user_id,category) do update set item_id=excluded.item_id,updated_at=excluded.updated_at;
end;
$$;

revoke all on function public.apply_studyarc_reward_event(text,text,text,text) from public;
revoke all on function public.purchase_studyarc_reward(text) from public;
revoke all on function public.equip_studyarc_reward(text) from public;
grant execute on function public.apply_studyarc_reward_event(text,text,text,text) to authenticated;
grant execute on function public.purchase_studyarc_reward(text) to authenticated;
grant execute on function public.equip_studyarc_reward(text) to authenticated;
