-- Step 4C: close RLS policy gaps without exposing internal configuration.
-- Admin checks use the existing SECURITY DEFINER is_admin() helper.

-- Internal application configuration: admin read only.
GRANT SELECT ON public.app_settings TO authenticated;

DROP POLICY IF EXISTS app_settings_admin_read ON public.app_settings;
CREATE POLICY app_settings_admin_read
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

-- Provider catalog is internal configuration; expose it to admins only.
GRANT SELECT ON public.providers TO authenticated;

DROP POLICY IF EXISTS providers_admin_read ON public.providers;
CREATE POLICY providers_admin_read
  ON public.providers
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

-- Notifications are user-owned. Creation remains backend/service-role only.
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id);

-- Support tickets: users can create and read their own tickets.
-- Status/priority changes remain admin/service-role responsibilities.
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;

DROP POLICY IF EXISTS support_tickets_select_own ON public.support_tickets;
CREATE POLICY support_tickets_select_own
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS support_tickets_insert_own ON public.support_tickets;
CREATE POLICY support_tickets_insert_own
  ON public.support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id);

-- Support/admin staff can manage tickets through the existing admin identity check.
GRANT SELECT, UPDATE ON public.support_tickets TO authenticated;

DROP POLICY IF EXISTS support_tickets_admin_read ON public.support_tickets;
CREATE POLICY support_tickets_admin_read
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

DROP POLICY IF EXISTS support_tickets_admin_update ON public.support_tickets;
CREATE POLICY support_tickets_admin_update
  ON public.support_tickets
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));
