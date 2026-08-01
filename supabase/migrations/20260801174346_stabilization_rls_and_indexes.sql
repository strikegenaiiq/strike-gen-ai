-- 1. Users can read only their own generation_jobs (RLS was enabled with
-- zero policies, which meant deny-all for authenticated/anon — this broke
-- the frontend's direct read of the user's own job list).
create policy "generation_jobs_select_own"
  on public.generation_jobs
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- 2. Public read on token_packs, same pattern as subscription_plans_read.
create policy "token_packs_read"
  on public.token_packs
  for select
  to authenticated
  using (is_active = true);

-- 3. Missing indexes on generation_jobs — needed now that queries filter
-- by user_id (via the RLS policy above) and order by created_at.
create index idx_generation_jobs_user_id on public.generation_jobs(user_id);
create index idx_generation_jobs_created_at on public.generation_jobs(created_at desc);
