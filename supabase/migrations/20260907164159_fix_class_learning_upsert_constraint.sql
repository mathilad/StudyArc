-- Fix class-data logging upserts.
-- The app saves multiple subject/topic entries for the same class occurrence and
-- uses this composite conflict target when syncing offline mutations.

-- Older installs may have the original two-column uniqueness constraint.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.class_learning_records'::regclass
      and conname = 'class_learning_records_user_id_occurrence_key_key'
  ) then
    alter table public.class_learning_records
      drop constraint class_learning_records_user_id_occurrence_key_key;
  end if;
end $$;

-- Match ClassLearningContext's Supabase upsert conflict target and allow a class
-- occurrence to contain more than one subject/topic learning entry.
alter table public.class_learning_records
  add constraint class_learning_records_user_occurrence_subject_topic_key
  unique (user_id, occurrence_key, subject_name, topic_name);
