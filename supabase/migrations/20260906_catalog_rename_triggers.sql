create or replace function public.protect_catalog_topic_rename()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if new.title_en is not distinct from old.title_en then return new; end if;
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  if nullif(btrim(new.title_en),'') is null then raise exception 'Topic title is required'; end if;
  new.title_en:=btrim(new.title_en);
  if exists(select 1 from public.academic_topic_catalog where subject_name=old.subject_name and topic_key<>old.topic_key and enabled and lower(title_en)=lower(new.title_en)) then raise exception 'Another topic already uses that title'; end if;
  if exists(select 1 from public.topic_progress a join public.topic_progress b on b.user_id=a.user_id and b.subject_name=a.subject_name and b.topic_name=new.title_en where a.subject_name=old.subject_name and a.topic_name=old.title_en) then raise exception 'Rename would collide with existing topic progress'; end if;
  if exists(select 1 from public.syllabus_coverage a join public.syllabus_coverage b on b.user_id=a.user_id and b.subject_name=a.subject_name and b.topic_name=new.title_en and b.subtopic_name=a.subtopic_name where a.subject_name=old.subject_name and a.topic_name=old.title_en) then raise exception 'Rename would collide with existing syllabus coverage'; end if;
  update public.assignments set topic_name=new.title_en,updated_at=now() where subject_name=old.subject_name and topic_name=old.title_en;
  update public.class_learning_records set topic_name=new.title_en,updated_at=now() where subject_name=old.subject_name and topic_name=old.title_en;
  update public.class_schedules set planned_topics=array_replace(planned_topics,old.title_en,new.title_en) where subject_name=old.subject_name and old.title_en=any(coalesce(planned_topics,'{}'::text[]));
  update public.class_week_overrides o set topic_name=case when o.topic_name=old.title_en then new.title_en else o.topic_name end,topic_names=array_replace(o.topic_names,old.title_en,new.title_en),updated_at=now() where exists(select 1 from public.class_schedules c where c.id=o.class_id and c.subject_name=old.subject_name) and (o.topic_name=old.title_en or old.title_en=any(coalesce(o.topic_names,'{}'::text[])));
  update public.paper_topic_results set topic_name=new.title_en where subject_name=old.subject_name and topic_name=old.title_en;
  update public.study_presence set topic_name=new.title_en,updated_at=now() where subject_name=old.subject_name and topic_name=old.title_en;
  update public.study_sessions set topic_name=new.title_en where subject_name=old.subject_name and topic_name=old.title_en;
  update public.syllabus_coverage set topic_name=new.title_en,updated_at=now() where subject_name=old.subject_name and topic_name=old.title_en;
  update public.test_marks set weak_topics=array_replace(weak_topics,old.title_en,new.title_en) where subject_name=old.subject_name and old.title_en=any(coalesce(weak_topics,'{}'::text[]));
  update public.topic_progress set topic_name=new.title_en,updated_at=now() where subject_name=old.subject_name and topic_name=old.title_en;
  return new;
end;
$$;

drop trigger if exists protect_academic_topic_rename on public.academic_topic_catalog;
create trigger protect_academic_topic_rename before update of title_en on public.academic_topic_catalog for each row execute function public.protect_catalog_topic_rename();

create or replace function public.protect_catalog_subtopic_rename()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare topic_title text;
begin
  if new.title_en is not distinct from old.title_en then return new; end if;
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  if nullif(btrim(new.title_en),'') is null then raise exception 'Subtopic title is required'; end if;
  new.title_en:=btrim(new.title_en);
  select title_en into topic_title from public.academic_topic_catalog where subject_name=old.subject_name and topic_key=old.topic_key;
  if exists(select 1 from public.academic_subtopic_catalog where subject_name=old.subject_name and topic_key=old.topic_key and subtopic_key<>old.subtopic_key and enabled and lower(title_en)=lower(new.title_en)) then raise exception 'Another subtopic already uses that title'; end if;
  if exists(select 1 from public.syllabus_coverage a join public.syllabus_coverage b on b.user_id=a.user_id and b.subject_name=a.subject_name and b.topic_name=a.topic_name and b.subtopic_name=new.title_en where a.subject_name=old.subject_name and a.topic_name=topic_title and a.subtopic_name=old.title_en) then raise exception 'Rename would collide with existing syllabus coverage'; end if;
  update public.syllabus_coverage set subtopic_name=new.title_en,updated_at=now() where subject_name=old.subject_name and topic_name=topic_title and subtopic_name=old.title_en;
  update public.class_learning_records set subtopic_names=array_replace(subtopic_names,old.title_en,new.title_en),updated_at=now() where subject_name=old.subject_name and topic_name=topic_title and old.title_en=any(coalesce(subtopic_names,'{}'::text[]));
  return new;
end;
$$;

drop trigger if exists protect_academic_subtopic_rename on public.academic_subtopic_catalog;
create trigger protect_academic_subtopic_rename before update of title_en on public.academic_subtopic_catalog for each row execute function public.protect_catalog_subtopic_rename();

revoke all on function public.protect_catalog_topic_rename() from public,anon,authenticated;
revoke all on function public.protect_catalog_subtopic_rename() from public,anon,authenticated;
