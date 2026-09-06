-- SECURITY DEFINER functions for user-owned actions must never be callable by anon.
revoke execute on function public.clear_my_study_history() from anon;
revoke execute on function public.get_my_notification_preferences() from anon;
revoke execute on function public.set_my_notification_preferences(jsonb) from anon;
revoke execute on function public.delete_my_account() from anon;
