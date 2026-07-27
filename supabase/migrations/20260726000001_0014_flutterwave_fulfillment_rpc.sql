-- Idempotency: one credit-entry per payment reference, DB-enforced
CREATE UNIQUE INDEX IF NOT EXISTS idx_token_ledgers_reference_credit
  ON token_ledgers(reference, transaction_type)
  WHERE transaction_type IN ('monthly_allocation','purchase');

-- One active subscription per user (needed for atomic upsert in the RPC)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_active_user
  ON subscriptions(user_id)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION fulfill_flutterwave_payment(
  p_user_id uuid,
  p_tx_ref text,
  p_payment_type text,
  p_plan_id smallint DEFAULT NULL,
  p_pack_id bigint DEFAULT NULL,
  p_amount_paid numeric DEFAULT NULL,
  p_currency text DEFAULT 'NGN',
  p_provider text DEFAULT 'flutterwave'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_credit_amount int;
  v_payment_id uuid;
  v_subscription_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM payments WHERE payment_reference = p_tx_ref) THEN
    RETURN jsonb_build_object('status','already_processed');
  END IF;

  IF p_payment_type = 'subscription' THEN
    SELECT monthly_tokens INTO v_credit_amount FROM subscription_plans WHERE id = p_plan_id AND is_active;
  ELSIF p_payment_type = 'token_purchase' THEN
    SELECT credits INTO v_credit_amount FROM token_packs WHERE id = p_pack_id AND is_active;
  ELSE
    RETURN jsonb_build_object('status','error','reason','invalid_payment_type');
  END IF;

  IF v_credit_amount IS NULL THEN
    RETURN jsonb_build_object('status','error','reason','unknown_plan_or_pack');
  END IF;

  INSERT INTO payments (user_id, provider, payment_reference, amount, currency, status, payment_type, paid_at)
  VALUES (p_user_id, p_provider, p_tx_ref, p_amount_paid, p_currency, 'successful', p_payment_type, now())
  RETURNING id INTO v_payment_id;

  IF p_payment_type = 'subscription' THEN
    INSERT INTO subscriptions (user_id, plan_id, provider, status, current_period_start, current_period_end)
    VALUES (p_user_id, p_plan_id, p_provider, 'active', now(), now() + interval '30 days')
    ON CONFLICT (user_id) WHERE status = 'active'
    DO UPDATE SET plan_id = p_plan_id, status = 'active',
      current_period_start = now(), current_period_end = now() + interval '30 days',
      provider = p_provider, updated_at = now()
    RETURNING id INTO v_subscription_id;

    UPDATE profiles SET tier_level = p_plan_id, subscription_status = 'active', updated_at = now()
    WHERE id = p_user_id;

    UPDATE payments SET subscription_id = v_subscription_id WHERE id = v_payment_id;
  END IF;

  INSERT INTO token_ledgers (user_id, subscription_id, payment_id, amount, transaction_type, entry_type, reference, description)
  VALUES (
    p_user_id, v_subscription_id, v_payment_id, v_credit_amount,
    CASE WHEN p_payment_type = 'subscription' THEN 'monthly_allocation' ELSE 'purchase' END,
    CASE WHEN p_payment_type = 'subscription' THEN 'subscription_grant' ELSE 'top_up' END,
    p_tx_ref,
    'Flutterwave fulfillment: ' || p_payment_type
  );

  INSERT INTO audit_logs (action, target_type, target_id, description, metadata)
  VALUES (
    'flutterwave_webhook', 'payment', v_payment_id,
    'Fulfilled ' || p_payment_type,
    jsonb_build_object('tx_ref', p_tx_ref, 'credited', v_credit_amount, 'plan_id', p_plan_id, 'pack_id', p_pack_id)
  );

  RETURN jsonb_build_object('status','fulfilled','payment_id',v_payment_id,'credited',v_credit_amount);
END;
$$;
