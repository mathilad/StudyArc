drop policy if exists "read academic topic catalog" on public.academic_topic_catalog;
create policy "read academic topic catalog" on public.academic_topic_catalog for select to authenticated using (true);

drop policy if exists "read academic subtopic catalog" on public.academic_subtopic_catalog;
create policy "read academic subtopic catalog" on public.academic_subtopic_catalog for select to authenticated using (true);
