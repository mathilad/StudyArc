-- Payment reference generation must use the built-in UUID generator.
-- gen_random_bytes is not available in this project runtime.

create or replace function public.studyarc_make_reference(prefix text)
returns text
language sql
set search_path = ''
as $$
  select upper(prefix || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
$$;
