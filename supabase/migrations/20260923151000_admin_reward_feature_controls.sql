-- Admin-controlled StudyArc progression, Arc Coins, Store, and customization categories.

update public.app_settings
set value = jsonb_build_object(
  'rewardsSystem', true,
  'xpLevels', true,
  'arcCoins', true,
  'arcStore', true,
  'rewardHistory', true,
  'rewardMilestones', true,
  'rewardPopups', true,
  'appThemes', true,
  'pageThemes', true,
  'clockFaces', true,
  'stopwatchLayouts', true,
  'timerAnimations', true,
  'completionEffects', true,
  'focusEffects', true,
  'focusSounds', true,
  'loadingScreens', true,
  'milestoneEffects', true
) || coalesce(value,'{}'::jsonb),
updated_at = now()
where key = 'feature_flags';

create or replace function public.studyarc_feature_enabled(p_key text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (
      select case
        when jsonb_typeof(value -> p_key) = 'boolean' then (value ->> p_key)::boolean
        else null
      end
      from public.app_settings
      where key = 'feature_flags'
      limit 1
    ),
    true
  );
$$;

create or replace function public.studyarc_reward_category_enabled(p_category text)
returns boolean
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_key text;
begin
  if not public.studyarc_feature_enabled('rewardsSystem')
     or not public.studyarc_feature_enabled('arcStore') then
    return false;
  end if;
  v_key := case p_category
    when 'themes' then 'appThemes'
    when 'page-themes' then 'pageThemes'
    when 'clock-faces' then 'clockFaces'
    when 'stopwatch-layouts' then 'stopwatchLayouts'
    when 'timer-animations' then 'timerAnimations'
    when 'completion-effects' then 'completionEffects'
    when 'focus-effects' then 'focusEffects'
    when 'focus-sounds' then 'focusSounds'
    when 'loading-screens' then 'loadingScreens'
    when 'milestone-effects' then 'milestoneEffects'
    else null
  end;
  if v_key is null then return false; end if;
  return public.studyarc_feature_enabled(v_key);
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
  if not public.studyarc_feature_enabled('rewardsSystem') then return; end if;
  if p_kind = 'milestone' and not public.studyarc_feature_enabled('rewardMilestones') then return; end if;

  if exists(select 1 from public.reward_ledger where user_id=v_user and reward_ledger.event_key=p_event_key) then
    return query select l.coins_delta,l.xp_delta,l.event_key
    from public.reward_ledger l
    where l.user_id=v_user and l.event_key=p_event_key
    limit 1;
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
        if v_type='Revision' and v_duration>=1500 then
          v_coins:=v_coins+4; v_xp:=v_xp+12;
        elsif v_type='Past Papers' and v_duration>=1800 then
          if lower(coalesce(v_section,'')) like '%full%' then
            v_coins:=v_coins+20; v_xp:=v_xp+60;
          elsif lower(coalesce(v_section,'')) like any(array['%essay%','%part b%','%structured%']) then
            v_coins:=v_coins+12; v_xp:=v_xp+36;
          else
            v_coins:=v_coins+10; v_xp:=v_xp+30;
          end if;
        elsif v_type in ('Paper Review','Paper Correction','Paper Discussion') and v_duration>=1200 then
          v_coins:=v_coins+4; v_xp:=v_xp+12;
        end if;
        v_ok := true;
      end if;

    when 'assignment_completion' then
      select completed into v_ok from public.assignments where user_id=v_user and id::text=p_source_id limit 1;
      if coalesce(v_ok,false) then v_coins:=8; v_xp:=25; end if;

    when 'task_completion' then
      select (completed and assignment_id is null) into v_ok
      from public.planned_tasks where user_id=v_user and id::text=p_source_id limit 1;
      if coalesce(v_ok,false) then v_coins:=3; v_xp:=10; end if;

    when 'daily_plan' then
      select count(*) into v_n from public.planned_tasks where user_id=v_user and planned_date::text=p_source_id;
      select coalesce(bool_and(completed),false) into v_ok
      from public.planned_tasks where user_id=v_user and planned_date::text=p_source_id;
      if v_n>=2 and v_ok then v_coins:=8; v_xp:=20; else v_ok:=false; end if;

    when 'test_personal_best' then
      select subject_name,
        case when mcq_percent is not null and essay_percent is not null
          then (mcq_percent+essay_percent)/2
          else coalesce(mcq_percent,essay_percent)
        end
      into v_subject,v_score
      from public.test_marks where user_id=v_user and id::text=p_source_id limit 1;

      select max(
        case when mcq_percent is not null and essay_percent is not null
          then (mcq_percent+essay_percent)/2
          else coalesce(mcq_percent,essay_percent)
        end
      )
      into v_previous
      from public.test_marks
      where user_id=v_user and subject_name=v_subject and id::text<>p_source_id;

      if v_score is not null and v_previous is not null and v_score>v_previous then
        v_ok:=true; v_coins:=10; v_xp:=30;
      end if;

    when 'milestone' then
      if p_source_id like 'hours:%' then
        v_n:=split_part(p_source_id,':',2)::integer;
        select coalesce(sum(duration_seconds),0)>=v_n*3600 into v_ok
        from public.study_sessions where user_id=v_user;
        if v_n=10 then v_coins:=25;v_xp:=80;
        elsif v_n=50 then v_coins:=75;v_xp:=180;
        elsif v_n=100 then v_coins:=125;v_xp:=300;
        elsif v_n=250 then v_coins:=200;v_xp:=500;
        elsif v_n=500 then v_coins:=300;v_xp:=800;
        elsif v_n=1000 then v_coins:=500;v_xp:=1500;
        else v_ok:=false; end if;
      elsif p_source_id like 'streak:%' then
        v_n:=split_part(p_source_id,':',2)::integer;
        select count(distinct started_at::date)>=v_n into v_ok
        from public.study_sessions
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
        select coalesce(avg(coverage),0) into v_coverage
        from public.topic_progress where user_id=v_user;
        v_ok:=v_coverage>=v_n;
        if v_n=25 then v_coins:=40;v_xp:=120;
        elsif v_n=50 then v_coins:=75;v_xp:=220;
        elsif v_n=75 then v_coins:=110;v_xp:=360;
        elsif v_n=100 then v_coins:=175;v_xp:=600;
        else v_ok:=false; end if;
      elsif p_source_id='first-paper' then
        select exists(
          select 1 from public.study_sessions
          where user_id=v_user and study_type='Past Papers'
        ) into v_ok;
        if v_ok then v_coins:=15;v_xp:=40; end if;
      end if;
  end case;

  if not v_ok then return; end if;
  if not public.studyarc_feature_enabled('arcCoins') then v_coins := 0; end if;
  if not public.studyarc_feature_enabled('xpLevels') then v_xp := 0; end if;
  if v_coins<=0 and v_xp<=0 then return; end if;

  insert into public.reward_ledger(user_id,event_key,kind,coins_delta,xp_delta,label)
  values(
    v_user,p_event_key,
    case
      when p_kind='milestone' then 'milestone'
      when p_kind='study_session' then case when v_type='Past Papers' then 'paper' else 'study' end
      when p_kind='assignment_completion' then 'assignment'
      when p_kind='task_completion' then 'task'
      when p_kind='daily_plan' then 'daily'
      when p_kind='test_personal_best' then 'test'
      else 'study'
    end,
    v_coins,v_xp,coalesce(nullif(p_label,''),'StudyArc reward')
  )
  on conflict(user_id,event_key) do nothing;

  return query
  select l.coins_delta,l.xp_delta,l.event_key
  from public.reward_ledger l
  where l.user_id=v_user and l.event_key=p_event_key
  limit 1;
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
  v_category text;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if not public.studyarc_feature_enabled('rewardsSystem')
     or not public.studyarc_feature_enabled('arcCoins')
     or not public.studyarc_feature_enabled('arcStore') then
    raise exception 'Arc Store is currently disabled';
  end if;

  if exists(select 1 from public.reward_inventory where user_id=v_user and reward_inventory.item_id=p_item_id) then
    select coalesce(sum(coins_delta),0) into v_balance from public.reward_ledger where user_id=v_user;
    return query select greatest(v_balance,0),p_item_id;
    return;
  end if;

  select price,level_required,category into v_price,v_level_required,v_category
  from public.reward_catalog where id=p_item_id and active=true;

  if v_price is null then raise exception 'Store item unavailable'; end if;
  if not public.studyarc_reward_category_enabled(v_category) then
    raise exception 'This customization category is disabled';
  end if;

  select coalesce(sum(coins_delta),0),coalesce(sum(xp_delta),0)
  into v_balance,v_xp
  from public.reward_ledger where user_id=v_user;

  v_level:=public.studyarc_reward_level(v_xp);
  if public.studyarc_feature_enabled('xpLevels') and v_level<v_level_required then
    raise exception 'Level % required',v_level_required;
  end if;
  if v_balance<v_price then raise exception 'Not enough Arc Coins'; end if;

  insert into public.reward_inventory(user_id,item_id,price_paid)
  values(v_user,p_item_id,v_price);

  insert into public.reward_ledger(user_id,event_key,kind,coins_delta,xp_delta,label,item_id)
  values(v_user,'purchase:'||p_item_id,'purchase',-v_price,0,
    'Purchased '||(select name from public.reward_catalog where id=p_item_id),p_item_id)
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
  if not public.studyarc_feature_enabled('rewardsSystem')
     or not public.studyarc_feature_enabled('arcStore') then
    raise exception 'Arc Store customizations are currently disabled';
  end if;

  if not exists(
    select 1 from public.reward_inventory
    where user_id=v_user and item_id=p_item_id
  ) then
    raise exception 'Item is not owned';
  end if;

  select category into v_category
  from public.reward_catalog
  where id=p_item_id and active=true;

  if v_category is null then raise exception 'Store item unavailable'; end if;
  if not public.studyarc_reward_category_enabled(v_category) then
    raise exception 'This customization category is disabled';
  end if;

  insert into public.reward_loadout(user_id,category,item_id,updated_at)
  values(v_user,v_category,p_item_id,now())
  on conflict(user_id,category)
  do update set item_id=excluded.item_id,updated_at=excluded.updated_at;
end;
$$;

revoke all on function public.apply_studyarc_reward_event(text,text,text,text) from public;
revoke all on function public.apply_studyarc_reward_event(text,text,text,text) from anon;
revoke all on function public.purchase_studyarc_reward(text) from public;
revoke all on function public.purchase_studyarc_reward(text) from anon;
revoke all on function public.equip_studyarc_reward(text) from public;
revoke all on function public.equip_studyarc_reward(text) from anon;

grant execute on function public.apply_studyarc_reward_event(text,text,text,text) to authenticated;
grant execute on function public.purchase_studyarc_reward(text) to authenticated;
grant execute on function public.equip_studyarc_reward(text) to authenticated;
