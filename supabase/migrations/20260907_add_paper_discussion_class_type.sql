alter table public.class_schedules drop constraint if exists class_schedules_class_type_check;
alter table public.class_schedules add constraint class_schedules_class_type_check check(class_type in ('Theory','Revision','Paper','Extra Class','Paper Discussion'));
