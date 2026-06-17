-- 0004_security_hardening.sql
-- Security hardening pass (Step 4). Clears Supabase advisors 0028/0029:
--   anon_security_definer_function_executable
--   authenticated_security_definer_function_executable
--
-- public.handle_new_user() is a SECURITY DEFINER trigger function fired by the
-- on_auth_user_created trigger (0001_init.sql). Postgres grants EXECUTE to PUBLIC by
-- default, so anon/authenticated can also call it directly via PostgREST RPC
-- (/rest/v1/rpc/handle_new_user). Nothing should call it directly — only the trigger.
--
-- Its search_path is already pinned (`set search_path = public` in 0001), so there is no
-- function_search_path_mutable warning to fix; only the EXECUTE grant needs revoking.
-- Trigger execution is unaffected — triggers run as the table owner, not the caller.
--
-- DDL is applied at deploy / via PR — never straight to the live DB ahead of the change.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
