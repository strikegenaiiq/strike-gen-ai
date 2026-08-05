-- Finalize execution privileges for privileged and trigger-only functions.
-- These changes mirror the live Supabase security hardening applied for this step.

REVOKE EXECUTE ON FUNCTION public.calculate_generation_cost(text, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_generation_cost(text, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_generation_cost(text, numeric, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_generation_cost(character varying, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_generation_cost(character varying, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_generation_cost(character varying, numeric) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.fulfill_payment(uuid, text, text, smallint, bigint, numeric, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fulfill_payment(uuid, text, text, smallint, bigint, numeric, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fulfill_payment(uuid, text, text, smallint, bigint, numeric, text, text) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.expire_stale_payment_intents() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_stale_payment_intents() FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_stale_payment_intents() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user_signup_grant() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_signup_grant() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_signup_grant() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin_with_role(text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_with_role(text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_with_role(text[]) TO authenticated;

ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.calculate_generation_cost(text, numeric, text) SET search_path = public;
ALTER FUNCTION public.calculate_generation_cost(character varying, numeric) SET search_path = public;
ALTER FUNCTION public.fulfill_payment(uuid, text, text, smallint, bigint, numeric, text, text) SET search_path = public;
ALTER FUNCTION public.expire_stale_payment_intents() SET search_path = public;
ALTER FUNCTION public.handle_new_user_signup_grant() SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.is_admin_with_role(text[]) SET search_path = public;
