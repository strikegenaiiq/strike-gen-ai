ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'
    CHECK (account_status = ANY (ARRAY['active','suspended','banned','pending_review']));

DROP POLICY IF EXISTS admin_read_all_admin_users ON admin_users;
CREATE POLICY admin_read_all_admin_users ON admin_users
  FOR SELECT USING (is_admin());

CREATE OR REPLACE FUNCTION admin_set_account_status(
  p_admin_id uuid,
  p_user_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_user_id uuid;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RETURN jsonb_build_object('status','error','reason','admin_id_mismatch');
  END IF;
  IF p_status NOT IN ('active','suspended','banned','pending_review') THEN
    RETURN jsonb_build_object('status','error','reason','invalid_status');
  END IF;

  SELECT id INTO v_admin_user_id FROM admin_users
  WHERE profile_id = p_admin_id AND is_active = true
    AND role = ANY (ARRAY['super_admin','admin','moderator','support']);

  IF v_admin_user_id IS NULL THEN
    RETURN jsonb_build_object('status','error','reason','not_authorized');
  END IF;

  UPDATE profiles SET account_status = p_status, updated_at = now() WHERE id = p_user_id;

  INSERT INTO audit_logs (admin_user_id, action, target_type, target_id, description, metadata)
  VALUES (v_admin_user_id, 'admin_set_account_status', 'user', p_user_id, p_reason,
    jsonb_build_object('new_status', p_status));

  RETURN jsonb_build_object('status','ok','new_status',p_status);
END;
$$;

CREATE OR REPLACE FUNCTION admin_promote_user(
  p_admin_id uuid,
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_user_id uuid;
  v_new_id uuid;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RETURN jsonb_build_object('status','error','reason','admin_id_mismatch');
  END IF;

  SELECT id INTO v_admin_user_id FROM admin_users
  WHERE profile_id = p_admin_id AND is_active = true AND role = 'super_admin';

  IF v_admin_user_id IS NULL THEN
    RETURN jsonb_build_object('status','error','reason','not_authorized');
  END IF;

  INSERT INTO admin_users (profile_id, role, permissions, is_active)
  VALUES (p_user_id, 'admin', '{}'::jsonb, true)
  ON CONFLICT (profile_id) DO UPDATE SET is_active = true, role = 'admin', updated_at = now()
  RETURNING id INTO v_new_id;

  INSERT INTO audit_logs (admin_user_id, action, target_type, target_id, description, metadata)
  VALUES (v_admin_user_id, 'admin_promote_user', 'user', p_user_id, 'Promoted to admin',
    jsonb_build_object('new_admin_user_id', v_new_id));

  RETURN jsonb_build_object('status','ok','admin_user_id',v_new_id);
END;
$$;

CREATE OR REPLACE VIEW v_admin_user_overview AS
SELECT
  p.id AS user_id,
  p.email,
  p.full_name AS display_name,
  sp.name AS plan_name,
  COALESCE(vb.remaining_tokens, 0) AS credit_balance,
  COALESCE(spend.total_spent, 0) AS total_spent,
  p.account_status,
  false AS has_flags,
  0 AS flagged_events_count,
  p.created_at,
  (au.id IS NOT NULL) AS is_admin
FROM profiles p
LEFT JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
LEFT JOIN view_user_balances vb ON vb.user_id = p.id
LEFT JOIN (
  SELECT user_id, SUM(amount) AS total_spent
  FROM payments WHERE status = 'successful'
  GROUP BY user_id
) spend ON spend.user_id = p.id
LEFT JOIN admin_users au ON au.profile_id = p.id AND au.is_active = true;
