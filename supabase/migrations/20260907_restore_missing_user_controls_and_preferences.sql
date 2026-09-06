-- Restores user-control and notification RPCs on deployments where the older
-- platform migrations were recorded without creating these functions.

create or replace function public.clear_my_study_history()
returns void language plpgsql security definer set search_path=public,auth as $$
declare uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  delete from public.study_sessions where user_id=uid;
  delete from public.test_marks where user_id=uid;
  delete from public.topic_progress where user_id=uid;
  delete from public.syllabus_coverage where user_id=uid;
  delete from public.class_learning_records where user_id=uid;
  delete from public.past_paper_history where user_id=uid;
  delete from public.paper_topic_results where user_id=uid;
  delete from public.daily_reviews where user_id=uid;
end;$$;

create or replace function public.get_my_notification_preferences()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare prefs jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select notification_preferences into prefs from public.student_profiles where user_id=auth.uid();
  return coalesce(prefs,'{"next_session":true,"class_reminders":true,"revision_reminders":true,"paper_reminders":true,"missed_plan_reminders":true}'::jsonb);
end;$$;

create or replace function public.set_my_notification_preferences(prefs jsonb)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare clean jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  clean:=jsonb_build_object(
    'next_session',coalesce((prefs->>'next_session')::boolean,true),
    'class_reminders',coalesce((prefs->>'class_reminders')::boolean,true),
    'revision_reminders',coalesce((prefs->>'revision_reminders')::boolean,true),
    'paper_reminders',coalesce((prefs->>'paper_reminders')::boolean,true),
    'missed_plan_reminders',coalesce((prefs->>'missed_plan_reminders')::boolean,true)
  );
  update public.student_profiles set notification_preferences=clean,updated_at=now() where user_id=auth.uid();
  return clean;
end;$$;

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path=public,auth as $$
declare uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id=uid;
end;$$;

revoke all on function public.clear_my_study_history() from public;
revoke all on function public.get_my_notification_preferences() from public;
revoke all on function public.set_my_notification_preferences(jsonb) from public;
revoke all on function public.delete_my_account() from public;
grant execute on function public.clear_my_study_history() to authenticated;
grant execute on function public.get_my_notification_preferences() to authenticated;
grant execute on function public.set_my_notification_preferences(jsonb) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
