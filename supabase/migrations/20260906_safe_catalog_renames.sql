create or replace function public.admin_update_catalog_topic(
  p_subject_name text,
  p_topic_key text,
  p_title_en text,
  p_title_si text default null,
  p_title_ta text default null,
  p_unit_name text default null,
  p_source_url text default null,
  p_verified boolean default false
)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare old_title text;
begin
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  if nullif(btrim(p_title_en),'') is null then raise exception 'Topic title is required'; end if;
  select title_en into old_title from public.academic_topic_catalog where subject_name=p_subject_name and topic_key=p_topic_key for update;
  if old_title is null then raise exception 'Topic not found'; end if;
  if old_title is distinct from btrim(p_title_en) then
    if exists(select 1 from public.academic_topic_catalog where subject_name=p_subject_name and topic_key<>p_topic_key and enabled and lower(title_en)=lower(btrim(p_title_en))) then raise exception 'Another topic already uses that title'; end if;
    if exists(select 1 from public.topic_progress a join public.topic_progress b on b.user_id=a.user_id and b.subject_name=a.subject_name and b.topic_name=btrim(p_title_en) where a.subject_name=p_subject_name and a.topic_name=old_title) then raise exception 'Rename would collide with existing topic progress'; end if;
    if exists(select 1 from public.syllabus_coverage a join public.syllabus_coverage b on b.user_id=a.user_id and b.subject_name=a.subject_name and b.topic_name=btrim(p_title_en) and b.subtopic_name=a.subtopic_name where a.subject_name=p_subject_name and a.topic_name=old_title) then raise exception 'Rename would collide with existing syllabus coverage'; end if;
    update public.assignments set topic_name=btrim(p_title_en), updated_at=now() where subject_name=p_subject_name and topic_name=old_title;
    update public.class_learning_records set topic_name=btrim(p_title_en), updated_at=now() where subject_name=p_subject_name and topic_name=old_title;
    update public.class_schedules set planned_topics=array_replace(planned_topics,old_title,btrim(p_title_en)) where subject_name=p_subject_name and old_title=any(coalesce(planned_topics,'{}'::text[]));
    update public.class_week_overrides o set topic_name=case when o.topic_name=old_title then btrim(p_title_en) else o.topic_name end, topic_names=array_replace(o.topic_names,old_title,btrim(p_title_en)), updated_at=now() where exists(select 1 from public.class_schedules c where c.id=o.class_id and c.subject_name=p_subject_name) and (o.topic_name=old_title or old_title=any(coalesce(o.topic_names,'{}'::text[])));
    update public.paper_topic_results set topic_name=btrim(p_title_en) where subject_name=p_subject_name and topic_name=old_title;
    update public.study_presence set topic_name=btrim(p_title_en), updated_at=now() where subject_name=p_subject_name and topic_name=old_title;
    update public.study_sessions set topic_name=btrim(p_title_en) where subject_name=p_subject_name and topic_name=old_title;
    update public.syllabus_coverage set topic_name=btrim(p_title_en), updated_at=now() where subject_name=p_subject_name and topic_name=old_title;
    update public.test_marks set weak_topics=array_replace(weak_topics,old_title,btrim(p_title_en)) where subject_name=p_subject_name and old_title=any(coalesce(weak_topics,'{}'::text[]));
    update public.topic_progress set topic_name=btrim(p_title_en), updated_at=now() where subject_name=p_subject_name and topic_name=old_title;
  end if;
  update public.academic_topic_catalog set title_en=btrim(p_title_en), title_si=nullif(btrim(coalesce(p_title_si,'')),''), title_ta=nullif(btrim(coalesce(p_title_ta,'')),''), unit_name=nullif(btrim(coalesce(p_unit_name,'')),''), source_url=coalesce(nullif(btrim(coalesce(p_source_url,'')),''),source_url), verification_status=case when p_verified then 'verified' else 'needs_review' end, verified_at=case when p_verified then now() else null end, updated_at=now(), updated_by=auth.uid() where subject_name=p_subject_name and topic_key=p_topic_key;
end;
$$;

create or replace function public.admin_update_catalog_subtopic(
  p_subject_name text,
  p_topic_key text,
  p_subtopic_key text,
  p_title_en text,
  p_title_si text default null,
  p_title_ta text default null,
  p_source_url text default null,
  p_verified boolean default false
)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare old_title text; topic_title text;
begin
  if not public.is_studyarc_admin() then raise exception 'Not authorized'; end if;
  if nullif(btrim(p_title_en),'') is null then raise exception 'Subtopic title is required'; end if;
  select s.title_en,t.title_en into old_title,topic_title from public.academic_subtopic_catalog s join public.academic_topic_catalog t on t.subject_name=s.subject_name and t.topic_key=s.topic_key where s.subject_name=p_subject_name and s.topic_key=p_topic_key and s.subtopic_key=p_subtopic_key for update of s;
  if old_title is null then raise exception 'Subtopic not found'; end if;
  if old_title is distinct from btrim(p_title_en) then
    if exists(select 1 from public.academic_subtopic_catalog where subject_name=p_subject_name and topic_key=p_topic_key and subtopic_key<>p_subtopic_key and enabled and lower(title_en)=lower(btrim(p_title_en))) then raise exception 'Another subtopic already uses that title'; end if;
    if exists(select 1 from public.syllabus_coverage a join public.syllabus_coverage b on b.user_id=a.user_id and b.subject_name=a.subject_name and b.topic_name=a.topic_name and b.subtopic_name=btrim(p_title_en) where a.subject_name=p_subject_name and a.topic_name=topic_title and a.subtopic_name=old_title) then raise exception 'Rename would collide with existing syllabus coverage'; end if;
    update public.syllabus_coverage set subtopic_name=btrim(p_title_en), updated_at=now() where subject_name=p_subject_name and topic_name=topic_title and subtopic_name=old_title;
    update public.class_learning_records set subtopic_names=array_replace(subtopic_names,old_title,btrim(p_title_en)), updated_at=now() where subject_name=p_subject_name and topic_name=topic_title and old_title=any(coalesce(subtopic_names,'{}'::text[]));
  end if;
  update public.academic_subtopic_catalog set title_en=btrim(p_title_en), title_si=nullif(btrim(coalesce(p_title_si,'')),''), title_ta=nullif(btrim(coalesce(p_title_ta,'')),''), source_url=coalesce(nullif(btrim(coalesce(p_source_url,'')),''),source_url), verification_status=case when p_verified then 'verified' else 'needs_review' end, verified_at=case when p_verified then now() else null end, updated_at=now(), updated_by=auth.uid() where subject_name=p_subject_name and topic_key=p_topic_key and subtopic_key=p_subtopic_key;
end;
$$;

revoke all on function public.admin_update_catalog_topic(text,text,text,text,text,text,text,boolean) from public, anon;
revoke all on function public.admin_update_catalog_subtopic(text,text,text,text,text,text,text,boolean) from public, anon;
grant execute on function public.admin_update_catalog_topic(text,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.admin_update_catalog_subtopic(text,text,text,text,text,text,text,boolean) to authenticated;
