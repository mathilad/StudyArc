-- Harden Arc reward RPC access and helper search path.
alter function public.studyarc_reward_level(bigint) set search_path = public;

revoke all on function public.apply_studyarc_reward_event(text,text,text,text) from public;
revoke all on function public.apply_studyarc_reward_event(text,text,text,text) from anon;
revoke all on function public.purchase_studyarc_reward(text) from public;
revoke all on function public.purchase_studyarc_reward(text) from anon;
revoke all on function public.equip_studyarc_reward(text) from public;
revoke all on function public.equip_studyarc_reward(text) from anon;

grant execute on function public.apply_studyarc_reward_event(text,text,text,text) to authenticated;
grant execute on function public.purchase_studyarc_reward(text) to authenticated;
grant execute on function public.equip_studyarc_reward(text) to authenticated;
