-- Production security hardening: remove public RPC execution from privileged functions.
-- Admin operations remain callable by authenticated users for now because the existing
-- admin UI calls them directly; their functions must continue enforcing admin identity.

REVOKE EXECUTE ON FUNCTION public.calculate_generation_cost(text, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_stale_payment_intents() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fulfill_payment(uuid, text, text, smallint, bigint, numeric, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_signup_grant() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_with_role(text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;

-- These functions are backend/trigger capabilities, not client RPCs.
REVOKE EXECUTE ON FUNCTION public.expire_stale_payment_intents() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fulfill_payment(uuid, text, text, smallint, bigint, numeric, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_signup_grant() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;

-- Pin privileged function resolution to the public schema to prevent search_path hijacking.
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.calculate_generation_cost(text, numeric, text) SET search_path = public;
