-- ARCHIVED: Superseded and never applied to production.

/*
-- Original content of 20260720081528_0011_flutterwave_fulfillment.sql (preserved)
--
-- Create token_packs table, provider_tx_ref on payments, and fulfillment RPC

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
  - price_currency (text not null, default 'USD')
  - is_active (boolean NOT NULL DEFAULT true)
  - sort_order (integer, default 0)
  - created_at, updated_at (timestamp)

## 2. Modified Tables
- payments: adds provider_tx_ref (text, nullable) with a unique partial index
  for webhook idempotency.

## 3. New Functions
- fulfill_flutterwave_payment(p_user_id, p_amount, p_tx_type,
  p_tx_ref, p_currency, p_provider) SECURITY DEFINER RPC. Atomically:
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

-- SQL follows (omitted here for archive placeholder)
*/

-- ORIGINAL FILE CONTENT START

REPLACE_WITH_ORIGINAL_CONTENT

-- ORIGINAL FILE CONTENT END
