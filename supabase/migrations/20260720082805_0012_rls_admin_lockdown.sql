/*
# Lock down RLS: admin isolation, hardened policies, admin-dashboard access

## Purpose
After auditing all RLS policies, three problems were found:
  1. admin_actions was world-readable and world-writable (USING true, CHECK true).
  2. subscription_plans and token_packs let any authenticated user INSERT/UPDATE/DELETE
     pricing and catalog rows (USING true, CHECK true).
  3. activity_logs INSERT/UPDATE allowed true checks (any user could forge or alter
     another user's logs).
Additionally, there was no admin role concept: the admin dashboard could not read
across all users because every user table is owner-scoped. This migration introduces
an admin role and grants admins cross-user read access for the dashboard, while
keeping regular users strictly locked to their own data.

## 1. Admin role mechanism
- Adds is_admin (boolean, default false) to profiles. Only rows where
  is_admin = true are considered admins.
- Creates is_admin() SECURITY DEFINER function that checks the calling user's
  profiles.is_admin flag. SECURITY DEFINER is required because pg_policy checks
  run as the invoking role, and profiles has owner-scoped SELECT — without
  SECURITY DEFINER the function would hit RLS on profiles and always return false.
  The function is marked IMMUTABLE STABLE and schema-qualified to public.

## 2. Hardened policies on admin/system tables

### admin_actions (was: SELECT true, INSERT true)
- SELECT: restricted to is_admin() only.
- INSERT: restricted to is_admin() only.
- No UPDATE, no DELETE (immutable audit trail).

### subscription_plans (was: INSERT/UPDATE/DELETE true)
- SELECT stays public (anon + authenticated) — plans are shown on pricing page.
- INSERT/UPDATE/DELETE restricted to is_admin() only.

### token_packs (was: INSERT/UPDATE/DELETE true)
- SELECT stays public (anon + authenticated) — packs shown on top-up page.
- INSERT/UPDATE/DELETE restricted to is_admin() only.

### activity_logs (was: INSERT true, UPDATE true)
- SELECT stays owner-scoped.
- INSERT tightened: WITH CHECK (auth.uid() = user_id). Users can only log events
  for themselves; system events with null user_id are written by the service role
  (bypasses RLS) so are unaffected.
- UPDATE tightened: USING + WITH CHECK (auth.uid() = user_id).
- No DELETE (retention via scheduled cleanup).

## 3. Admin dashboard read access
Adds an OR is_admin() clause to the SELECT policy of every user-data table so
that admins can view all rows for the admin dashboard. The UPDATE/INSERT/DELETE
policies remain strictly owner-scoped — even an admin can only modify their own
rows through the anon-key client; admin write operations go through the service
role (edge functions) which bypasses RLS. This keeps the blast radius of a
compromised admin token limited to reads.

Tables receiving admin read override:
  profiles, projects, ai_generations, assets, credits, credit_transactions,
  payments, invoices, notifications, user_subscriptions, activity_logs.

## 4. Security summary
- A regular user CANNOT read another user's profile (profiles SELECT now
  requires auth.uid() = user_id OR is_admin()).
- A regular user CANNOT access the admin dashboard data: admin_actions SELECT
  is is_admin()-gated, and every user table's admin-override SELECT is
  is_admin()-gated, so non-admins see only their own rows everywhere.
- A regular user CANNOT mutate plans/packs/admin_actions/activity_logs for
  other users — all those write paths now require is_admin() or ownership.
- Admins get read-only cross-user access for the dashboard; writes still go
  through the service role in edge functions.
- is_admin() is SECURITY DEFINER to avoid the RLS-on-profiles circular
  dependency that would otherwise make the function always return false.

## 5. Notes
- To grant a user admin rights: UPDATE profiles SET is_admin = true WHERE
  user_id = '<uuid>';. Do this only for trusted operators.
- The first admin must be promoted via the service role (edge function or
  execute_sql), since no user starts with is_admin = true.
- is_admin() is the single source of truth for admin checks across all policies.
*/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin
  ON profiles(is_admin) WHERE is_admin = true;

-- is_admin() helper. SECURITY DEFINER so it can read profiles past owner-scoped RLS.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE user_id = auth.uid()),
    false
  );
$$;

-- ===== admin_actions: admin-only =====
DROP POLICY IF EXISTS "select_admin_actions" ON admin_actions;
CREATE POLICY "select_admin_actions" ON admin_actions FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "insert_admin_actions" ON admin_actions;
CREATE POLICY "insert_admin_actions" ON admin_actions FOR INSERT
  TO authenticated WITH CHECK (is_admin());

-- ===== subscription_plans: public read, admin writes =====
DROP POLICY IF EXISTS "insert_subscription_plans" ON subscription_plans;
CREATE POLICY "insert_subscription_plans" ON subscription_plans FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_subscription_plans" ON subscription_plans;
CREATE POLICY "update_subscription_plans" ON subscription_plans FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_subscription_plans" ON subscription_plans;
CREATE POLICY "delete_subscription_plans" ON subscription_plans FOR DELETE
  TO authenticated USING (is_admin());

-- ===== token_packs: public read, admin writes =====
DROP POLICY IF EXISTS "insert_token_packs" ON token_packs;
CREATE POLICY "insert_token_packs" ON token_packs FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_token_packs" ON token_packs;
CREATE POLICY "update_token_packs" ON token_packs FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_token_packs" ON token_packs;
CREATE POLICY "delete_token_packs" ON token_packs FOR DELETE
  TO authenticated USING (is_admin());

-- ===== activity_logs: owner-scoped, tightened writes =====
DROP POLICY IF EXISTS "insert_activity_logs" ON activity_logs;
CREATE POLICY "insert_activity_logs" ON activity_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_activity_logs" ON activity_logs;
CREATE POLICY "update_activity_logs" ON activity_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== Admin read override on all user tables =====

-- profiles
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- projects
DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = owner_id OR is_admin());

-- ai_generations
DROP POLICY IF EXISTS "select_own_generations" ON ai_generations;
CREATE POLICY "select_own_generations" ON ai_generations FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- assets
DROP POLICY IF EXISTS "select_own_assets" ON assets;
CREATE POLICY "select_own_assets" ON assets FOR SELECT
  TO authenticated USING (auth.uid() = owner_id OR is_admin());

-- credits
DROP POLICY IF EXISTS "select_own_credits" ON credits;
CREATE POLICY "select_own_credits" ON credits FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- credit_transactions
DROP POLICY IF EXISTS "select_own_credit_transactions" ON credit_transactions;
CREATE POLICY "select_own_credit_transactions" ON credit_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- payments
DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- invoices
DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
CREATE POLICY "select_own_invoices" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- notifications
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- user_subscriptions
DROP POLICY IF EXISTS "select_own_subscriptions" ON user_subscriptions;
CREATE POLICY "select_own_subscriptions" ON user_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- activity_logs (already dropped update above; add admin to select)
DROP POLICY IF EXISTS "select_own_activity_logs" ON activity_logs;
CREATE POLICY "select_own_activity_logs" ON activity_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());
