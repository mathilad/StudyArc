create or replace function public.sync_my_missed_class_recordings()
returns integer
language plpgsql
security definer
set search_path=public,auth
as $$
declare uid uuid:=auth.uid(); inserted_count integer:=0;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  with occurrences as (
    select c.*,d::date occurrence_date
    from public.class_schedules c
    cross join generate_series((timezone('Asia/Colombo',now())::date-7)::timestamp,timezone('Asia/Colombo',now())::date::timestamp,interval '1 day') d
    where c.user_id=uid
      and extract(dow from d)::integer=c.day_of_week
      and (d::date+c.end_time)<timezone('Asia/Colombo',now())
  )
  insert into public.assignments(user_id,source_class_id,title,subject_name,topic_name,due_at,estimated_minutes,completed)
  select uid,o.id,'Non-attended · Watch recording · '||o.title||' · '||to_char(o.occurrence_date,'YYYY-MM-DD'),o.subject_name,null,
    (o.occurrence_date+interval '1 day 18 hours'),greatest(5,least(1440,round(extract(epoch from(o.end_time-o.start_time))/60)::integer)),false
  from occurrences o
  where not exists(select 1 from public.class_learning_records r where r.user_id=uid and r.class_id=o.id and r.occurrence_date=o.occurrence_date)
    and not exists(select 1 from public.assignments a where a.user_id=uid and a.source_class_id=o.id and a.title='Non-attended · Watch recording · '||o.title||' · '||to_char(o.occurrence_date,'YYYY-MM-DD'));
  get diagnostics inserted_count=row_count;
  return inserted_count;
end $$;
revoke all on function public.sync_my_missed_class_recordings() from public,anon;
grant execute on function public.sync_my_missed_class_recordings() to authenticated;
