-- Restrict monetization helper and RPC functions to their intended callers.
alter function public.studyarc_make_reference(text) set search_path = '';

revoke all on function public.studyarc_make_reference(text) from public, anon, authenticated;
revoke all on function public.studyarc_setting_text(text,text) from public, anon, authenticated;
revoke all on function public.studyarc_setting_bool(text,boolean) from public, anon, authenticated;
revoke all on function public.studyarc_setting_int(text,integer) from public, anon, authenticated;
revoke all on function public.studyarc_exam_access_end(uuid) from public, anon, authenticated;

revoke all on function public.get_my_access_status() from public, anon;
revoke all on function public.create_my_payment_request(uuid,uuid) from public, anon;
revoke all on function public.redeem_my_activation_code(text) from public, anon;
revoke all on function public.admin_set_paid_mode(boolean,boolean,timestamptz) from public, anon;
revoke all on function public.admin_update_plan(uuid,integer,boolean,boolean) from public, anon;
revoke all on function public.admin_block_user(uuid,text,text,boolean) from public, anon;
revoke all on function public.admin_unblock_user(uuid) from public, anon;
revoke all on function public.admin_grant_premium(uuid,uuid,integer,text) from public, anon;
revoke all on function public.admin_generate_activation_code(uuid,uuid,integer) from public, anon;
revoke all on function public.admin_approve_payment(uuid) from public, anon;
revoke all on function public.admin_reject_payment(uuid,text) from public, anon;

grant execute on function public.get_my_access_status() to authenticated;
grant execute on function public.create_my_payment_request(uuid,uuid) to authenticated;
grant execute on function public.redeem_my_activation_code(text) to authenticated;
grant execute on function public.admin_set_paid_mode(boolean,boolean,timestamptz) to authenticated;
grant execute on function public.admin_update_plan(uuid,integer,boolean,boolean) to authenticated;
grant execute on function public.admin_block_user(uuid,text,text,boolean) to authenticated;
grant execute on function public.admin_unblock_user(uuid) to authenticated;
grant execute on function public.admin_grant_premium(uuid,uuid,integer,text) to authenticated;
grant execute on function public.admin_generate_activation_code(uuid,uuid,integer) to authenticated;
grant execute on function public.admin_approve_payment(uuid) to authenticated;
grant execute on function public.admin_reject_payment(uuid,text) to authenticated;

