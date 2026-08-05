-- Keep admin RPCs callable through the authenticated client only.
-- Each function independently verifies auth.uid() and the caller's admin role.
REVOKE EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, uuid, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_account_status(uuid, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_promote_user(uuid, uuid) FROM anon;

-- Explicitly pin the existing SECURITY DEFINER admin functions to the public schema.
ALTER FUNCTION public.admin_adjust_credits(uuid, uuid, numeric, text) SET search_path = public;
ALTER FUNCTION public.admin_set_account_status(uuid, uuid, text, text) SET search_path = public;
ALTER FUNCTION public.admin_promote_user(uuid, uuid) SET search_path = public;
