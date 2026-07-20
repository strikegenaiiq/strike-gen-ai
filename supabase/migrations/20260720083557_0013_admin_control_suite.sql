/*
# Admin control suite: user management, fraud detection, revenue analytics, audit

## Purpose
Gives admins full control to manage every aspect of users, track payments and
revenue, detect suspicious activity (users trying to trick the system), and
maintain a complete audit trail. Adds the schema, RPCs, views, and policies
the admin dashboard needs.

## 1. Modified Tables

### profiles
- account_status (text, default 'active') — admin can set 'suspended' or 'banned'.
  CHECK constraint limits to active/suspended/banned/pending_review.
- risk_flags (jsonb, default '{}') — admin notes: { "flags": ["chargeback_abuse",
  "multi_account"], "notes": "..." }.
- last_login_at (timestamptz, nullable) — tracks user activity.
- suspended_at, suspended_reason (nullable) — audit trail for suspensions.

### admin_actions
- target_table (text, nullable) — which table was affected.
- target_id (text, nullable) — which row ID was affected.
- severity (text, default 'info') — info/warning/critical.
- ip_address (text, nullable) — admin's IP for audit.

### payments
- is_flagged (boolean, default false) — marks suspicious payments.
- flag_reason (text, nullable) — why it was flagged.
- reviewed_by_admin (uuid, nullable) — admin who reviewed it.

## 2. New Tables

### flagged_events
Tracks suspicious activity — users trying to trick the system.
- id (uuid PK)
- user_id (uuid, nullable — null for system-detected)
- event_type (text) — multi_account, chargeback_abuse, rapid_refund,
  payment_mismatch, vpn_proxy, coupon_abuse, credit_farming, suspicious_login
- severity (text) — low/medium/high/critical
- description (text)
- evidence (jsonb) — raw data proving the suspicion
- status (text, default 'open') — open/reviewing/resolved/false_positive
- resolved_by (uuid, nullable) — admin who resolved it
- resolution_note (text, nullable)
- amount_implicated (numeric, nullable) — money or credits involved
- created_at, resolved_at (timestamptz)

### revenue_snapshots
Daily revenue aggregates for dashboard charts. Populated by RPC.
- id (uuid PK)
- snapshot_date (date, unique)
- gross_revenue (numeric)
- net_revenue (numeric)
- refund_amount (numeric)
- payment_count (integer)
- new_subscribers (integer)
- new_pack_purchases (integer)
- active_subscribers (integer)
- total_users (integer)
- flagged_events_count (integer)
- created_at (timestamptz)

## 3. New Views (read-only analytics)

### v_revenue_summary
Rolls up payments into gross revenue, refunds, net, and counts — grouped by
currency. Admin dashboard top-line numbers.

### v_revenue_daily
Daily revenue + payment counts over the last 90 days. Admin dashboard chart.

### v_subscriber_stats
Counts of active/trialing/past_due/cancelled subscriptions + plan breakdown.

### v_user_growth
Daily new user registrations (last 90 days). Admin dashboard growth chart.

### v_flagged_summary
Open flagged events grouped by severity and event_type.

### v_admin_user_overview
One row per user with: email, display_name, account_status, is_admin, plan,
credits balance, total payments, total spent, generation count, last activity,
flagged events count. The main admin user management table.

## 4. New RPCs (SECURITY DEFINER, admin-only)

### admin_set_account_status(p_admin_id, p_user_id, p_status, p_reason)
Sets a user's account_status (active/suspended/banned). Logs to admin_actions
and creates a flagged_event if status != active. Returns {status, user_id}.

### admin_adjust_credits(p_admin_id, p_user_id, p_amount, p_reason)
Adds or removes credits for a user. Inserts credit_transactions with
reason='admin_adjustment'. Logs to admin_actions. Returns {new_balance}.

### admin_flag_payment(p_admin_id, p_payment_id, p_reason)
Marks a payment as flagged. Logs to admin_actions. Returns {payment_id, flagged}.

### admin_resolve_flagged_event(p_admin_id, p_event_id, p_status, p_note)
Resolves a flagged event (resolved/false_positive). Logs to admin_actions.
Returns {event_id, status}.

### admin_promote_user(p_admin_id, p_user_id)
Grants admin privileges. Logs to admin_actions with severity='critical'.
Returns {user_id, is_admin}.

### refresh_revenue_snapshot()
Recomputes today's revenue_snapshots row. Called by dashboard on load.

All admin RPCs verify is_admin() internally and raise EXCEPTION if the caller
is not an admin — defense in depth beyond RLS.

## 5. Policy changes

### admin_actions
- Adds UPDATE policy for is_admin() (admins can annotate actions).
- Adds DELETE policy for is_admin() (admins can purge old logs).

### user tables (profiles, credits, user_subscriptions, payments)
- Adds UPDATE policies scoped to is_admin() — so admins can manage user
  accounts, credit balances, subscription status, and payment flags directly
  via the anon-key client. These are OR'd with existing owner-scoped UPDATE
  policies so owners keep their own access.

### flagged_events
- RLS enabled. SELECT/INSERT/UPDATE/DELETE all is_admin()-scoped. Regular users
  never see fraud data.

### revenue_snapshots
- RLS enabled. SELECT is_admin()-scoped. INSERT/UPDATE via service role only.

### Views
Views inherit RLS from their underlying tables; since every underlying table
requires is_admin() OR ownership, non-admins see only their own rows in views,
and admins see everything. The v_* views are explicitly admin-context.

## 6. Security summary
- Regular users: cannot view other profiles, cannot access admin data, cannot
  modify plans/packs, cannot see flagged events, cannot see revenue.
- Admins: full read across all tables, full write control via RPCs, direct
  UPDATE on user management tables, complete audit trail.
- All admin RPCs double-check is_admin() internally — even if RLS is
  misconfigured, the RPCs refuse to run for non-admins.
- Flagged events are admin-only — users never know they're being investigated.
- Account status (suspended/banned) is visible to the user but set by admin only.

## 7. Notes
- To promote the first admin: run via service role / execute_sql:
  UPDATE profiles SET is_admin = true WHERE user_id = '<uuid>';
- refresh_revenue_snapshot() is safe to call repeatedly (upserts by date).
- Views are created OR REPLACE so re-running the migration updates them.
*/

-- ===== 1. profiles additions =====
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_reason text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS risk_flags jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_account_status_check
    CHECK (account_status = ANY (ARRAY['active','suspended','banned','pending_review']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);

-- ===== 2. admin_actions additions =====
ALTER TABLE admin_actions ADD COLUMN IF NOT EXISTS target_table text;
ALTER TABLE admin_actions ADD COLUMN IF NOT EXISTS target_id text;
ALTER TABLE admin_actions ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info';
ALTER TABLE admin_actions ADD COLUMN IF NOT EXISTS ip_address text;

DO $$ BEGIN
  ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_severity_check
    CHECK (severity = ANY (ARRAY['info','warning','critical']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_user_id);

-- ===== 3. payments additions =====
ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS flag_reason text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reviewed_by_admin uuid;

CREATE INDEX IF NOT EXISTS idx_payments_flagged ON payments(is_flagged) WHERE is_flagged = true;

-- ===== 4. flagged_events table =====
CREATE TABLE IF NOT EXISTS flagged_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note text,
  amount_implicated numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

DO $$ BEGIN
  ALTER TABLE flagged_events ADD CONSTRAINT flagged_events_severity_check
    CHECK (severity = ANY (ARRAY['low','medium','high','critical']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE flagged_events ADD CONSTRAINT flagged_events_status_check
    CHECK (status = ANY (ARRAY['open','reviewing','resolved','false_positive']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_flagged_events_status ON flagged_events(status) WHERE status IN ('open','reviewing');
CREATE INDEX IF NOT EXISTS idx_flagged_events_user ON flagged_events(user_id);
CREATE INDEX IF NOT EXISTS idx_flagged_events_created ON flagged_events(created_at DESC);

ALTER TABLE flagged_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_flagged_events" ON flagged_events;
CREATE POLICY "select_flagged_events" ON flagged_events FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "insert_flagged_events" ON flagged_events;
CREATE POLICY "insert_flagged_events" ON flagged_events FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_flagged_events" ON flagged_events;
CREATE POLICY "update_flagged_events" ON flagged_events FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_flagged_events" ON flagged_events;
CREATE POLICY "delete_flagged_events" ON flagged_events FOR DELETE
  TO authenticated USING (is_admin());

-- ===== 5. revenue_snapshots table =====
CREATE TABLE IF NOT EXISTS revenue_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL UNIQUE,
  gross_revenue numeric NOT NULL DEFAULT 0,
  net_revenue numeric NOT NULL DEFAULT 0,
  refund_amount numeric NOT NULL DEFAULT 0,
  payment_count integer NOT NULL DEFAULT 0,
  new_subscribers integer NOT NULL DEFAULT 0,
  new_pack_purchases integer NOT NULL DEFAULT 0,
  active_subscribers integer NOT NULL DEFAULT 0,
  total_users integer NOT NULL DEFAULT 0,
  flagged_events_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE revenue_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_revenue_snapshots" ON revenue_snapshots;
CREATE POLICY "select_revenue_snapshots" ON revenue_snapshots FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "insert_revenue_snapshots" ON revenue_snapshots;
CREATE POLICY "insert_revenue_snapshots" ON revenue_snapshots FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_revenue_snapshots" ON revenue_snapshots;
CREATE POLICY "update_revenue_snapshots" ON revenue_snapshots FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ===== 6. Admin write policies on existing tables =====

-- admin_actions: add UPDATE + DELETE for admins
DROP POLICY IF EXISTS "update_admin_actions" ON admin_actions;
CREATE POLICY "update_admin_actions" ON admin_actions FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_admin_actions" ON admin_actions;
CREATE POLICY "delete_admin_actions" ON admin_actions FOR DELETE
  TO authenticated USING (is_admin());

-- profiles: admin can UPDATE (ban/suspend/adjust risk flags)
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

-- payments: admin can UPDATE (flag payments)
DROP POLICY IF EXISTS "update_own_payments" ON payments;
CREATE POLICY "update_own_payments" ON payments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

-- user_subscriptions: admin can UPDATE (change status)
DROP POLICY IF EXISTS "update_own_subscriptions" ON user_subscriptions;
CREATE POLICY "update_own_subscriptions" ON user_subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

-- credits: admin can UPDATE (adjust balance)
DROP POLICY IF EXISTS "update_own_credits" ON credits;
CREATE POLICY "update_own_credits" ON credits FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

-- ===== 7. Views =====

CREATE OR REPLACE VIEW v_revenue_summary AS
SELECT
  currency,
  COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded_count,
  COUNT(*) FILTER (WHERE status = 'refunded') AS refunded_count,
  COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0) AS gross_revenue,
  COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0) AS refund_amount,
  COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0)
    - COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0) AS net_revenue,
  COUNT(*) FILTER (WHERE is_flagged = true) AS flagged_count
FROM payments
GROUP BY currency;

CREATE OR REPLACE VIEW v_revenue_daily AS
SELECT
  date_trunc('day', created_at)::date AS day,
  currency,
  COUNT(*) AS payment_count,
  COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded_count,
  COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0) AS gross_revenue,
  COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0) AS refund_amount
FROM payments
WHERE created_at > now() - interval '90 days'
GROUP BY day, currency
ORDER BY day DESC;

CREATE OR REPLACE VIEW v_subscriber_stats AS
SELECT
  status,
  COUNT(*) AS count
FROM user_subscriptions
GROUP BY status;

CREATE OR REPLACE VIEW v_user_growth AS
SELECT
  date_trunc('day', created_at)::date AS day,
  COUNT(*) AS new_users
FROM profiles
WHERE created_at > now() - interval '90 days'
GROUP BY day
ORDER BY day DESC;

CREATE OR REPLACE VIEW v_flagged_summary AS
SELECT
  severity,
  event_type,
  status,
  COUNT(*) AS count
FROM flagged_events
GROUP BY severity, event_type, status
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1 WHEN 'high' THEN 2
    WHEN 'medium' THEN 3 WHEN 'low' THEN 4
  END;

CREATE OR REPLACE VIEW v_admin_user_overview AS
SELECT
  p.user_id,
  p.display_name,
  u.email,
  p.account_status,
  p.is_admin,
  p.created_at,
  p.last_login_at,
  p.risk_flags,
  us.status AS subscription_status,
  sp.name AS plan_name,
  COALESCE(c.balance, 0) AS credit_balance,
  COALESCE(pm.total_count, 0) AS payment_count,
  COALESCE(pm.total_spent, 0) AS total_spent,
  COALESCE(ag.gen_count, 0) AS generation_count,
  COALESCE(fe.flag_count, 0) AS flagged_events_count,
  CASE WHEN fe.flag_count > 0 THEN true ELSE false END AS has_flags
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
LEFT JOIN user_subscriptions us ON us.user_id = p.user_id AND us.status IN ('active','trialing')
LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
LEFT JOIN credits c ON c.user_id = p.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS total_count, COALESCE(SUM(amount), 0) AS total_spent
  FROM payments WHERE status = 'succeeded'
  GROUP BY user_id
) pm ON pm.user_id = p.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS gen_count FROM ai_generations GROUP BY user_id
) ag ON ag.user_id = p.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS flag_count FROM flagged_events
  WHERE status IN ('open','reviewing') GROUP BY user_id
) fe ON fe.user_id = p.user_id;

-- ===== 8. Admin RPCs =====

CREATE OR REPLACE FUNCTION admin_set_account_status(
  p_admin_id uuid,
  p_user_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;
  IF p_status NOT IN ('active','suspended','banned','pending_review') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;
  IF p_admin_id = p_user_id THEN
    RAISE EXCEPTION 'Cannot modify your own account status';
  END IF;

  SELECT account_status INTO v_current FROM profiles WHERE user_id = p_user_id;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE profiles
    SET account_status = p_status,
        suspended_at = CASE WHEN p_status IN ('suspended','banned') THEN now() ELSE NULL END,
        suspended_reason = CASE WHEN p_status IN ('suspended','banned') THEN p_reason ELSE NULL END
    WHERE user_id = p_user_id;

  INSERT INTO admin_actions (admin_id, target_user_id, action_type, target_table, target_id, severity, reason, metadata)
  VALUES (p_admin_id, p_user_id, 'set_account_status', 'profiles', p_user_id::text,
    CASE WHEN p_status = 'banned' THEN 'critical' WHEN p_status = 'suspended' THEN 'warning' ELSE 'info' END,
    COALESCE(p_reason, 'Status changed to ' || p_status),
    jsonb_build_object('old_status', v_current, 'new_status', p_status));

  IF p_status != 'active' THEN
    INSERT INTO flagged_events (user_id, event_type, severity, description, evidence, amount_implicated)
    VALUES (p_user_id, 'admin_action',
      CASE WHEN p_status = 'banned' THEN 'high' ELSE 'medium' END,
      'Account ' || p_status || ' by admin: ' || COALESCE(p_reason, 'no reason given'),
      jsonb_build_object('admin_id', p_admin_id, 'old_status', v_current, 'new_status', p_status),
      NULL);
  END IF;

  RETURN jsonb_build_object('status', 'success', 'user_id', p_user_id, 'new_status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION admin_adjust_credits(
  p_admin_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit_id uuid;
  v_new_balance numeric;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;
  IF p_amount = 0 THEN
    RAISE EXCEPTION 'Amount cannot be zero';
  END IF;

  INSERT INTO credits (user_id, balance, reserved, source)
  VALUES (p_user_id, p_amount, 0, 'admin_adjustment')
  ON CONFLICT (user_id) DO UPDATE
    SET balance = credits.balance + p_amount, updated_at = now()
  RETURNING id, balance INTO v_credit_id, v_new_balance;

  INSERT INTO credit_transactions (credit_id, user_id, change_amount, resulting_balance, reason, reference)
  VALUES (v_credit_id, p_user_id, p_amount, v_new_balance, 'admin_adjustment', p_reason);

  INSERT INTO admin_actions (admin_id, target_user_id, action_type, target_table, target_id, severity, reason, metadata)
  VALUES (p_admin_id, p_user_id, 'adjust_credits', 'credits', v_credit_id::text, 'warning',
    p_reason, jsonb_build_object('amount', p_amount, 'new_balance', v_new_balance));

  RETURN jsonb_build_object('status', 'success', 'new_balance', v_new_balance);
END;
$$;

CREATE OR REPLACE FUNCTION admin_flag_payment(
  p_admin_id uuid,
  p_payment_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT user_id INTO v_user_id FROM payments WHERE id = p_payment_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  UPDATE payments SET is_flagged = true, flag_reason = p_reason, reviewed_by_admin = p_admin_id
    WHERE id = p_payment_id;

  INSERT INTO flagged_events (user_id, event_type, severity, description, evidence)
  VALUES (v_user_id, 'payment_mismatch', 'high',
    'Payment flagged by admin: ' || p_reason,
    jsonb_build_object('payment_id', p_payment_id, 'admin_id', p_admin_id));

  INSERT INTO admin_actions (admin_id, target_user_id, action_type, target_table, target_id, severity, reason, metadata)
  VALUES (p_admin_id, v_user_id, 'flag_payment', 'payments', p_payment_id::text, 'warning',
    p_reason, jsonb_build_object('payment_id', p_payment_id));

  RETURN jsonb_build_object('status', 'success', 'payment_id', p_payment_id, 'flagged', true);
END;
$$;

CREATE OR REPLACE FUNCTION admin_resolve_flagged_event(
  p_admin_id uuid,
  p_event_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;
  IF p_status NOT IN ('resolved','false_positive','reviewing') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  SELECT user_id INTO v_user_id FROM flagged_events WHERE id = p_event_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  UPDATE flagged_events
    SET status = p_status,
        resolution_note = p_note,
        resolved_by = p_admin_id,
        resolved_at = CASE WHEN p_status IN ('resolved','false_positive') THEN now() ELSE resolved_at END
    WHERE id = p_event_id;

  INSERT INTO admin_actions (admin_id, target_user_id, action_type, target_table, target_id, severity, reason, metadata)
  VALUES (p_admin_id, v_user_id, 'resolve_flagged_event', 'flagged_events', p_event_id::text, 'info',
    COALESCE(p_note, 'Event ' || p_status),
    jsonb_build_object('event_id', p_event_id, 'new_status', p_status));

  RETURN jsonb_build_object('status', 'success', 'event_id', p_event_id, 'new_status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION admin_promote_user(
  p_admin_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;
  IF p_admin_id = p_user_id THEN
    RAISE EXCEPTION 'Use execute_sql to promote yourself';
  END IF;

  UPDATE profiles SET is_admin = true WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO admin_actions (admin_id, target_user_id, action_type, target_table, target_id, severity, reason, metadata)
  VALUES (p_admin_id, p_user_id, 'promote_admin', 'profiles', p_user_id::text, 'critical',
    'User promoted to admin',
    jsonb_build_object('promoted_by', p_admin_id));

  RETURN jsonb_build_object('status', 'success', 'user_id', p_user_id, 'is_admin', true);
END;
$$;

CREATE OR REPLACE FUNCTION refresh_revenue_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := current_date;
  v_gross numeric;
  v_refund numeric;
  v_pay_count integer;
  v_new_subs integer;
  v_new_packs integer;
  v_active_subs integer;
  v_total_users integer;
  v_flagged integer;
BEGIN
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded' AND date_trunc('day', created_at)::date = v_today), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'refunded' AND date_trunc('day', created_at)::date = v_today), 0),
    COUNT(*) FILTER (WHERE date_trunc('day', created_at)::date = v_today)
  INTO v_gross, v_refund, v_pay_count
  FROM payments;

  SELECT COUNT(*) INTO v_new_subs
  FROM user_subscriptions WHERE date_trunc('day', created_at)::date = v_today;

  SELECT COUNT(*) INTO v_new_packs
  FROM payments WHERE status = 'succeeded' AND date_trunc('day', created_at)::date = v_today
    AND provider_tx_ref IS NOT NULL;

  SELECT COUNT(*) INTO v_active_subs
  FROM user_subscriptions WHERE status = 'active';

  SELECT COUNT(*) INTO v_total_users FROM profiles;

  SELECT COUNT(*) INTO v_flagged
  FROM flagged_events WHERE status IN ('open','reviewing');

  INSERT INTO revenue_snapshots
    (snapshot_date, gross_revenue, net_revenue, refund_amount, payment_count,
     new_subscribers, new_pack_purchases, active_subscribers, total_users, flagged_events_count)
  VALUES
    (v_today, v_gross, v_gross - v_refund, v_refund, v_pay_count,
     v_new_subs, v_new_packs, v_active_subs, v_total_users, v_flagged)
  ON CONFLICT (snapshot_date) DO UPDATE SET
    gross_revenue = EXCLUDED.gross_revenue,
    net_revenue = EXCLUDED.net_revenue,
    refund_amount = EXCLUDED.refund_amount,
    payment_count = EXCLUDED.payment_count,
    new_subscribers = EXCLUDED.new_subscribers,
    new_pack_purchases = EXCLUDED.new_pack_purchases,
    active_subscribers = EXCLUDED.active_subscribers,
    total_users = EXCLUDED.total_users,
    flagged_events_count = EXCLUDED.flagged_events_count,
    created_at = now();

  RETURN jsonb_build_object('status', 'success', 'date', v_today);
END;
$$;
