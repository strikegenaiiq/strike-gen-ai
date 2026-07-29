# Strike Gen AI — Master Project State

**Last verified:** 2026-07-29, against live Supabase project `bxtonwjjrnojydrzdlim` and GitHub repo `strikegenaiiq/strike-gen-ai`, branch `main`.

This document is the source of truth. Any future session — human or AI — should start here before making changes, rather than rediscovering the project from scratch.

---

## 1. Version 1 Scope (Locked)

Auth, Profiles, Subscriptions, Token Economy, Flutterwave, Paystack, AI Generation, Storage, User Dashboard, Admin Dashboard. Nothing else is in scope for V1.

**Implementation order from here:** Repository Stabilization → Paystack Integration → AI Generation Pipeline → Generation UI → Production Testing → Launch.

---

## 2. Database Schema — Live Tables

| Table | Purpose | RLS |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `email`, `full_name`, `avatar_url`, `tier_level`, `subscription_status`, `account_status` | Per-user + admin override |
| `admin_users` | `profile_id` (unique), `role`, `permissions` (jsonb), `is_active` | Admin override only |
| `subscription_plans` | 4 plans: Standard ($19/300 tokens), Pro ($49/1000), Premium ($99/2500), Creator Ultra ($249/7000) | Public read |
| `subscriptions` | `user_id`, `plan_id`, `status`, `current_period_start/end`. One active subscription per user (unique partial index) | Per-user + admin override |
| `payments` | `payment_reference` (unique), `status` (pending/processing/**successful**/failed/cancelled/refunded — not "succeeded") | Per-user + admin override |
| `token_ledgers` | Append-only. `transaction_type`, `entry_type`, `reference`, `amount`. Idempotency via unique index on `(reference, transaction_type)` for monthly_allocation/purchase | Per-user + admin override |
| `token_packs` | 4 packs: Starter ($5/100), Growth ($20/500), Creator ($45/1200), Studio ($99/3000) | Public read |
| `ai_models` | 15 rows across Kling/Runway/Replicate. Pricing in `pricing_params` JSONB (see §5) | RLS enabled, no policy (locked) |
| `providers` | 1 row: Replicate (active) | RLS enabled, no policy (locked) |
| `generation_jobs` | `user_id`, `project_id`, `provider`, `model`, `request` (jsonb), `status`, `progress` — orchestration/queue side | RLS enabled, no policy (locked) |
| `generated_assets` | Final output: `storage_url`, `generation_status`, `tokens_consumed`, `meta_parameters`, `error_message` | RLS enabled, no policy (locked) |
| `projects` | User workspaces | Per-user |
| `audit_logs` | `admin_user_id`, `action`, `target_type`, `target_id`, `metadata` | Per-user + admin override |
| `api_usage_logs` | Usage tracking | Not yet reviewed in depth |
| `app_settings`, `generation_jobs` policies, `notifications`, `support_tickets` | Scaffolded, RLS-locked, zero frontend usage yet | Future Roadmap |

**Views:** `view_user_balances` (sums `token_ledgers` per user), `v_admin_user_overview` (joins profiles/subscriptions/payments/admin_users for the admin dashboard).

**Storage buckets:** `generated-images` (private), `generated-videos` (private), `user-uploads` (private), `avatars` (public, listing-exposed — flagged, not fixed).

---

## 3. Generation Pipeline Architecture (Locked, Not Yet Implemented)

**Two-stage design:**
- `generation_jobs` = request, queue, orchestration, provider communication, progress, status
- `generated_assets` = final file, storage URL, thumbnail, metadata, provider cost, tokens consumed, generation status

**Relationship (schema change pending, not yet applied):** `generated_assets.generation_job_id uuid NOT NULL REFERENCES generation_jobs(id) ON DELETE RESTRICT` — every asset belongs to exactly one job; a job may produce multiple assets (batch image generation). Also pending: `generated_assets.thumbnail_url text`.

---

## 4. Cost Engine (Locked Design, Not Yet Implemented)

`calculate_generation_cost()` is currently **broken** — references nonexistent columns (`model_identifier`, `raw_cost_usd`, `markup_multiplier`, `minimum_token_charge`). Redesign must read the real `ai_models` schema:

- `pricing_params->>'kind'` is `'video'`, `'image'`, or `'audio'`
- **video:** `costPerSecond` keyed by resolution
- **image:** `costPerImage` keyed by resolution, capped by `maxImagesPerRequest`
- **audio:** either `costPerCharacter` (TTS models) or `costPerSecond` (music models) — no single formula
- No markup/minimum-charge column exists anywhere — these are platform-wide constants inside the function, not per-model. Proposed defaults (unconfirmed): 2.2x markup, 1 token minimum, $0.035/token baseline.

Not implemented yet — deferred until repository stabilization is complete, per lock decision.

---

## 5. Authentication Flow

Signup: `supabase.auth.signUp({ email, password, options: { data: { full_name } } })` → `on_auth_user_created` trigger (function `handle_new_user_signup_grant()`) creates `profiles` row + grants 60-token welcome bonus into `token_ledgers`.

**Known dead code:** `handle_new_user()` — a second, correctly-written profile-creation function exists but has no trigger attached. Not wired up, not deleted. Not touched pending your decision.

Profile loading: `AuthContext.tsx` queries `profiles.id = auth.uid()` (fixed from a broken `user_id` column reference).

**Account status gating:** `ProtectedRoute.tsx` blocks `suspended`/`banned` users from all routes except `/profile` (which shows the status banner). Client-side only — no RLS-layer enforcement on writes yet (flagged gap).

---

## 6. Payment Flow

**Flutterwave** (`supabase/functions/flutterwave-webhook/`): signature = plain equality against `FLUTTERWAVE_WEBHOOK_SECRET` (not HMAC — Flutterwave's `verif-hash` is a static shared secret). Re-verifies via `verify_by_reference` API before fulfilling.

**Paystack** (`supabase/functions/paystack-webhook/`): signature = real HMAC-SHA512 over raw body. Amounts arrive in kobo/cents, divided by 100. Re-verifies via `/transaction/verify/:reference`.

**Both call the same RPC:** `fulfill_flutterwave_payment(p_user_id, p_tx_ref, p_payment_type, p_plan_id, p_pack_id, p_amount_paid, p_currency, p_provider)` — credit amount always derived server-side from `subscription_plans.monthly_tokens` or `token_packs.credits`, never trusted from the caller. Idempotent via `payments.payment_reference` uniqueness check. Atomic (payment + subscription + ledger + audit log in one transaction).

**Known naming debt:** the RPC is still named `fulfill_flutterwave_payment` despite serving both providers. Cosmetic only, not renamed yet.

**Permissions (critical fix applied):** `fulfill_flutterwave_payment` EXECUTE is granted **only to `service_role`** — not `anon`/`authenticated`. This was a real vulnerability (any signed-in user could previously call it directly with a fabricated reference to grant themselves credits) found via a live security advisor check and fixed same-session.

**Known gap:** `subscription_plans`/`token_packs` only store USD prices; Flutterwave/Paystack often charge NGN. Cross-currency payments skip strict amount verification and are logged for manual review, not blocked.

**Callback URL:** currently a placeholder (`https://bxtonwjjrnojydrzdlim.supabase.co`) — no real domain or checkout UI exists yet. Must be updated once Amplify is live and a real success page exists.

---

## 7. Admin System

`is_admin()` / `is_admin_with_role(roles[])` — check `admin_users.profile_id = auth.uid() AND is_active`. `admin_users.role` values: `super_admin`, `admin`, `finance`, `support`, `moderator`, `content_manager`.

**RPCs:** `admin_adjust_credits` (super_admin/admin/finance), `admin_set_account_status` (super_admin/admin/moderator/support), `admin_promote_user` (super_admin only). All append-only to `token_ledgers`, all logged to `audit_logs`.

**Frontend:** `AdminContext.tsx` provides `isAdmin`/`role`/`permissions`. `AppShell.tsx` conditionally shows the Admin nav link via `useAdmin()`. `AdminProvider` wraps the entire app (not just `/admin/*`) — required because `AppShell` is used under `/app/*` too.

**Deferred, not built:** payment flagging (`is_flagged`, `admin_flag_payment`), fraud/moderation (`AdminFraud.tsx`, `flagged_events`), analytics (`AdminOverview.tsx`, `revenue_snapshots`, `v_user_growth`) — all reference nonexistent schema, explicitly out of scope until designed separately.

---

## 8. Repository Classification

**Archive** (zero code references, safe to leave inert): `blog_posts`, `blog_users`, `blog_comments`, `colors`, `categories`, `featured_banners`.

**Future Roadmap** (not V1, but real intended features): `discovery_feed` (planned public showcase/community browsing), `generation_jobs`/`notifications`/`support_tickets`/`app_settings` RLS policies, payment flagging, fraud/moderation, analytics snapshots.

**Deprecated migrations:** `0011`/`0012`/`0013` reference an abandoned schema (`credits`, `credit_transactions`, `profiles.is_admin`) that was never applied to production. Left in place for history, not re-runnable.

---

## 9. Outstanding Work (as of this document)

- Generation pipeline schema changes (`generation_job_id`, `thumbnail_url`) — designed, not applied
- `calculate_generation_cost()` redesign — designed, not implemented (deferred per lock decision)
- Markup/minimum-charge policy — needs your confirmation (proposed: 2.2x, 1 token min)
- Paystack: needs `PAYSTACK_SECRET_KEY` set live, needs one real test-mode transaction to confirm end-to-end
- No frontend checkout or generation UI exists at all — Phase 4 of the build order
- `handle_new_user()` dead code — retire or wire up, your call
- RLS-layer enforcement of `account_status` (currently client-side only)

---

## 10. Migration History (Reference)

`0011`–`0013` deprecated/unused. `0014` fulfillment RPC + idempotency. `0015` dropped legacy client-trusting overload. `0016`–`0018` admin auth model, dashboard completion, unique constraint. `0019` fixed signup trigger (was blocking all signups). `0020`–`0021` locked down RPC permissions (critical fix). `0022` fixed `get_user_balance()`.

Also live but **not in any migration file** (pre-date this reconciliation, applied directly): `security_lock_profile_system_columns`, `perf_add_missing_fkey_indexes`, `perf_fix_rls_auth_uid_initplan`, `security_fix_set_updated_at_search_path`, `security_fix_blog_and_colors_rls_policies`, `security_fix_definer_function_exposure` — all dated 2026-07-19.
