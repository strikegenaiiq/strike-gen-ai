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
| `token_ledgers` | Append-only. `transaction_type`, `entry_type`, `reference`, `amount`. Idempotency via unique index on `(reference, transaction_type)` for monthly_allocation/purchase | Per-user[...] |
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

**Relationship (schema change pending, not yet applied):** `generated_assets.generation_job_id uuid NOT NULL REFERENCES generation_jobs(id) ON DELETE RESTRICT` — every asset belongs to exactly o[...]

---

## 4. Cost Engine (Locked Design, Not Yet Implemented)

`calculate_generation_cost()` is currently **broken** — references nonexistent columns (`model_identifier`, `raw_cost_usd`, `markup_multiplier`, `minimum_token_charge`). Redesign must read the r[...]

- `pricing_params->>'kind'` is `'video'`, `'image'`, or `'audio'`
- **video:** `costPerSecond` keyed by resolution
- **image:** `costPerImage` keyed by resolution, capped by `maxImagesPerRequest`
- **audio:** either `costPerCharacter` (TTS models) or `costPerSecond` (music models) — no single formula
- No markup/minimum-charge column exists anywhere — these are platform-wide constants inside the function, not per-model. Proposed defaults (unconfirmed): 2.2x markup, 1 token minimum, $0.035/to[...]

Not implemented yet — deferred until repository stabilization is complete, per lock decision.

---

## 5. Authentication Flow

Signup: `supabase.auth.signUp({ email, password, options: { data: { full_name } } })` → `on_auth_user_created` trigger (function `handle_new_user_signup_grant()`) creates `profiles` row + grants[...]

**Known dead code:** `handle_new_user()` — a second, correctly-written profile-creation function exists but has no trigger attached. Not wired up, not deleted. Not touched pending your decision.

Profile loading: `AuthContext.tsx` queries `profiles.id = auth.uid()` (fixed from a broken `user_id` column reference).

**Account status gating:** `ProtectedRoute.tsx` blocks `suspended`/`banned` users from all routes except `/profile` (which shows the status banner). Client-side only — no RLS-layer enforcement o[...]

---

## 6. Payment Flow

Flutterwave (supabase/functions/flutterwave-webhook/): signature = plain equality against FLUTTERWAVE_WEBHOOK_SECRET. Re-verifies via verify_by_reference API before fulfilling.

Paystack (supabase/functions/paystack-webhook/): signature = real HMAC-SHA512 over raw body. Amounts arrive in kobo/cents, divided by 100. Re-verifies via /transaction/verify/:reference.

Currency-safe checkout flow: payment_intents table locks the expected charge amount, currency, and FX rate at checkout initiation, before the provider is called. Both webhooks look up the matching payment_intents row by tx_ref and compare the provider-verified amount against the locked expected_amount in the same currency. Underpayment or currency mismatch blocks fulfillment. Stale pending intents are swept to expired every 5 minutes via pg_cron.

Both webhooks now call fulfill_payment (renamed from fulfill_flutterwave_payment, now provider-neutral). Credit amount always derived server-side, never trusted from the caller. Idempotent via payments.payment_reference uniqueness plus payment_intents.status check. Atomic.

Permissions: fulfill_payment and expire_stale_payment_intents EXECUTE granted only to service_role.

Checkout initiation: implemented as the checkout-initiate Edge Function (supabase/functions/checkout-initiate/) — fetches a live USD to NGN rate, writes the locked payment_intents row, then calls Paystack or Flutterwave.

---

## 7. Admin System

`is_admin()` / `is_admin_with_role(roles[])` — check `admin_users.profile_id = auth.uid() AND is_active`. `admin_users.role` values: `super_admin`, `admin`, `finance`, `support`, `moderator`, `c[...]

**RPCs:** `admin_adjust_credits` (super_admin/admin/finance), `admin_set_account_status` (super_admin/admin/moderator/support), `admin_promote_user` (super_admin only). All append-only to `token_[...]

**Frontend:** `AdminContext.tsx` provides `isAdmin`/`role`/`permissions`. `AppShell.tsx` conditionally shows the Admin nav link via `useAdmin()`. `AdminProvider` wraps the entire app (not just `/[...]

**Deferred, not built:** payment flagging (`is_flagged`, `admin_flag_payment`), fraud/moderation (`AdminFraud.tsx`, `flagged_events`), analytics (`AdminOverview.tsx`, `revenue_snapshots`, `v_user[...]

---

## 8. Repository Classification

**Archive** (zero code references, safe to leave inert): `blog_posts`, `blog_users`, `blog_comments`, `colors`, `categories`, `featured_banners`.

**Future Roadmap** (not V1, but real intended features): `discovery_feed` (planned public showcase/community browsing), `generation_jobs`/`notifications`/`support_tickets`/`app_settings` RLS poli[...]

**Deprecated migrations:** `0011`/`0012`/`0013` reference an abandoned schema (`credits`, `credit_transactions`, `profiles.is_admin`) that was never applied to production. Left in place for histo[...]

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

`0011`–`0013` deprecated/unused. `0014` fulfillment RPC + idempotency. `0015` dropped legacy client-trusting overload. `0016`–`0018` admin auth model, dashboard completion, unique constraint.[...]

Also live but **not in any migration file** (pre-date this reconciliation, applied directly): `security_lock_profile_system_columns`, `perf_add_missing_fkey_indexes`, `perf_fix_rls_auth_uid_initp[...]
