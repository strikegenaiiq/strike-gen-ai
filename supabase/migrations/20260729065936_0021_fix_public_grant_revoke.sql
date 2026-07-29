REVOKE EXECUTE ON FUNCTION public.fulfill_flutterwave_payment(uuid, text, text, smallint, bigint, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_flutterwave_payment(uuid, text, text, smallint, bigint, numeric, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, uuid, numeric, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_set_account_status(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(uuid, uuid, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_promote_user(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_promote_user(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
