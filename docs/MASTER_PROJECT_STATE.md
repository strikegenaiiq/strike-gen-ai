## 6. Payment Flow

Flutterwave (supabase/functions/flutterwave-webhook/): signature = plain equality against FLUTTERWAVE_WEBHOOK_SECRET. Re-verifies via verify_by_reference API before fulfilling.

Paystack (supabase/functions/paystack-webhook/): signature = real HMAC-SHA512 over raw body. Amounts arrive in kobo/cents, divided by 100. Re-verifies via /transaction/verify/:reference.

Currency-safe checkout flow: payment_intents table locks the expected charge amount, currency, and FX rate at checkout initiation, before the provider is called. Both webhooks look up the matching payment_intents row by tx_ref and compare the provider-verified amount against the locked expected_amount in the same currency. Underpayment or currency mismatch blocks fulfillment. Stale pending intents are swept to expired every 5 minutes via pg_cron.

Both webhooks now call fulfill_payment (renamed from fulfill_flutterwave_payment, now provider-neutral). Credit amount always derived server-side, never trusted from the caller. Idempotent via payments.payment_reference uniqueness plus payment_intents.status check. Atomic.

Permissions: fulfill_payment and expire_stale_payment_intents EXECUTE granted only to service_role.

Checkout initiation: implemented as the checkout-initiate Edge Function (supabase/functions/checkout-initiate/) — fetches a live USD to NGN rate, writes the locked payment_intents row, then calls Paystack or Flutterwave.
