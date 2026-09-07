update public.academic_topic_catalog set enabled=false,updated_at=now()
where subject_name='Physics' and topic_key='physics-light';
