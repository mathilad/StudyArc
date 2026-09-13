-- Keep assignment capture queries efficient and avoid per-row auth.uid() evaluation.
create index if not exists assignment_subtasks_assignment_id_idx
  on public.assignment_subtasks (assignment_id);

create index if not exists assignments_source_class_id_idx
  on public.assignments (source_class_id)
  where source_class_id is not null;

drop policy if exists "assignments own all" on public.assignments;
create policy "assignments own all"
on public.assignments
as permissive
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
