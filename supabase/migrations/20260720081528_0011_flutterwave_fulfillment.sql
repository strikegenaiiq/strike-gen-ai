/*
# Create token_packs table, provider_tx_ref on payments, and fulfillment RPC

## Purpose
Adds the credit top-up pack catalog, an idempotency column on payments for
Flutterwave webhook retries, and a single atomic RPC that the Flutterwave
webhook edge function calls to fulfill a successful payment.

## 1. New Tables
- token_packs
  - id (uuid, PK)
  - name (text, unique, not null)
  - display_name (text, not null)
  - credits (numeric, not null)
  - price_amount (numeric, not null)
  - price_currency (text, not null, default 'USD')
  - is_active (boolean, default true)
  - sort_order (integer, default 0)
  - created_at, updated_at (timestamptz)

## 2. Modified Tables
- payments: adds provider_tx_ref (text, nullable) with a unique partial index
  for webhook idempotency.

## 3. New Functions
- fulfill_flutterwave_payment(p_user_id, p_amount, p_tx_type, p_tx_ref,
  p_currency, p_provider) SECURITY DEFINER RPC. Atomically:
  1. Idempotency check on provider_tx_ref; returns already_processed if seen.
  2. Inserts payments row (status succeeded).
  3. Upserts credits row (balance += amount; creates if missing).
  4. Inserts credit_transactions row.
  5. Returns {status, new_balance}.

## 4. Security
- token_packs: RLS enabled; public read (anon+authenticated), auth mutations.
- RPC SECURITY DEFINER so edge function can call it.

## 5. Indexes
- Unique on token_packs.name.
- Unique partial index on payments.provider_tx_ref.

## 6. Seed Data
- starter:  100 credits,  $5
- growth:   500 credits,  $20
- pro:     1500 credits,  $50
- bulk:    5000 credits, $150

## 7. Notes
- provider_tx_ref stores the Flutterwave tx_ref for idempotency.
- Safe to call multiple times for the same tx_ref.
*/

CREATE TABLE IF NOT EXISTS token_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  credits numeric NOT NULL,
  price_amount numeric NOT NULL,
  price_currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_packs_active
  ON token_packs(is_active, sort_order);

DROP TRIGGER IF EXISTS set_updated_at ON token_packs;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON token_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE token_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_token_packs" ON token_packs;
CREATE POLICY "read_token_packs" ON token_packs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_token_packs" ON token_packs;
CREATE POLICY "insert_token_packs" ON token_packs FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_token_packs" ON token_packs;
CREATE POLICY "update_token_packs" ON token_packs FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_token_packs" ON token_packs;
CREATE POLICY "delete_token_packs" ON token_packs FOR DELETE
  TO authenticated USING (true);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_tx_ref text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_tx_ref_unique
  ON payments(provider_tx_ref) WHERE provider_tx_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_provider_tx_ref
  ON payments(provider_tx_ref) WHERE provider_tx_ref IS NOT NULL;

INSERT INTO token_packs (name, display_name, credits, price_amount, price_currency, sort_order)
VALUES
  ('starter',  'Starter Pack',  100,  5, 'USD', 1),
  ('growth',   'Growth Pack',   500, 20, 'USD', 2),
  ('pro',      'Pro Pack',     1500, 50, 'USD', 3),
  ('bulk',     'Bulk Pack',    5000,150, 'USD', 4)
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION fulfill_flutterwave_payment(
  p_user_id uuid,
  p_amount numeric,
  p_tx_type text,
  p_tx_ref text,
  p_currency text DEFAULT 'USD',
  p_provider text DEFAULT 'flutterwave'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_payment_id uuid;
  v_payment_id uuid;
  v_new_balance numeric;
  v_credit_id uuid;
  v_reason text;
BEGIN
  SELECT id INTO v_existing_payment_id
    FROM payments
    WHERE provider_tx_ref = p_tx_ref
    LIMIT 1;

  IF v_existing_payment_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_processed', 'payment_id', v_existing_payment_id);
  END IF;

  v_reason := CASE p_tx_type
    WHEN 'pack_purchase' THEN 'purchase'
    WHEN 'subscription_grant' THEN 'subscription'
    ELSE 'purchase'
  END;

  INSERT INTO payments (user_id, amount, currency, status, provider, provider_tx_ref, provider_payment_id)
  VALUES (p_user_id, p_amount, p_currency, 'succeeded', p_provider, p_tx_ref, p_tx_ref)
  RETURNING id INTO v_payment_id;

  INSERT INTO credits (user_id, balance, reserved, source)
  VALUES (p_user_id, p_amount, 0, 'purchase')
  ON CONFLICT (user_id) DO UPDATE
    SET balance = credits.balance + p_amount,
        updated_at = now()
  RETURNING id, balance INTO v_credit_id, v_new_balance;

  INSERT INTO credit_transactions (credit_id, user_id, change_amount, resulting_balance, reason, reference)
  VALUES (v_credit_id, p_user_id, p_amount, v_new_balance, v_reason, p_tx_ref);

  RETURN jsonb_build_object(
    'status', 'fulfilled',
    'payment_id', v_payment_id,
    'new_balance', v_new_balance
  );
END;
$$;
