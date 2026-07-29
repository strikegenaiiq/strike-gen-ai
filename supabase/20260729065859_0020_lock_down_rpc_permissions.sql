REVOKE EXECUTE ON FUNCTION public.fulfill_flutterwave_payment(uuid, text, text, smallint, bigint, numeric, text, text) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, uuid, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_account_status(uuid, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_promote_user(uuid, uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
