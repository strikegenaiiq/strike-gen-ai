REVOKE EXECUTE ON FUNCTION public.fulfill_payment(uuid, text, text, smallint, bigint, numeric, text, text) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.expire_stale_payment_intents() FROM anon, authenticated;
