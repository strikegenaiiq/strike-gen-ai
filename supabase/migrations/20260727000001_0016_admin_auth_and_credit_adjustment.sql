CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE profile_id = auth.uid() AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_admin_with_role(p_roles text[])
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE profile_id = auth.uid() AND is_active = true AND role = ANY(p_roles)
  );
$$;

DROP POLICY IF EXISTS admin_read_all_profiles ON profiles;
CREATE POLICY admin_read_all_profiles ON profiles
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS admin_read_all_payments ON payments;
CREATE POLICY admin_read_all_payments ON payments
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS admin_read_all_subscriptions ON subscriptions;
CREATE POLICY admin_read_all_subscriptions ON subscriptions
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS admin_read_all_token_ledgers ON token_ledgers;
CREATE POLICY admin_read_all_token_ledgers ON token_ledgers
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS admin_read_all_audit_logs ON audit_logs;
CREATE POLICY admin_read_all_audit_logs ON audit_logs
  FOR SELECT USING (is_admin());

CREATE OR REPLACE FUNCTION admin_adjust_credits(
  p_admin_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_reason text DEFAULT 'Admin adjustment'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_user_id uuid;
  v_ledger_id uuid;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RETURN jsonb_build_object('status','error','reason','admin_id_mismatch');
  END IF;

  SELECT id INTO v_admin_user_id
  FROM admin_users
  WHERE profile_id = p_admin_id
    AND is_active = true
    AND role = ANY (ARRAY['super_admin','admin','finance']);

  IF v_admin_user_id IS NULL THEN
    RETURN jsonb_build_object('status','error','reason','not_authorized');
  END IF;

  IF p_amount = 0 THEN
    RETURN jsonb_build_object('status','error','reason','zero_amount');
  END IF;

  INSERT INTO token_ledgers (user_id, amount, transaction_type, entry_type, description, metadata)
  VALUES (
    p_user_id, p_amount::int, 'admin_adjustment', 'adjustment', p_reason,
    jsonb_build_object('admin_id', p_admin_id, 'admin_user_id', v_admin_user_id)
  )
  RETURNING id INTO v_ledger_id;

  INSERT INTO audit_logs (admin_user_id, action, target_type, target_id, description, metadata)
  VALUES (
    v_admin_user_id, 'admin_adjust_credits', 'user', p_user_id, p_reason,
    jsonb_build_object('amount', p_amount, 'ledger_id', v_ledger_id)
  );

  RETURN jsonb_build_object('status','ok','ledger_id',v_ledger_id,'amount',p_amount);
END;
$$;
