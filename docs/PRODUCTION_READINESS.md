# Production readiness gate

This checklist is the release gate for the V1 platform.

## Code completed in `production-readiness`

- Restored React Router application routing and provider composition.
- Added authenticated `/app/generate` and `/app/profile` routes.
- Wired the admin route tree behind authentication and admin authorization.
- Made the generation page type-safe under the repository's strict TypeScript settings.
- Added CI typecheck/build gates for pull requests and main.
- Configured Supabase Edge Function JWT behavior explicitly: authenticated user functions require JWTs; external webhooks do not.
- Added a migration for durable generation asset storage and idempotency indexes.
- Hardened the Replicate webhook with signature and timestamp verification.
- Persisted completed video output into the private `generated-videos` bucket instead of relying on Replicate's temporary output URL.

## Before production launch

- Apply the new generation asset migration to the production Supabase project.
- Deploy the updated `generate-video` and `generation-webhook` Edge Functions.
- Set and verify `REPLICATE_WEBHOOK_SECRET` in Supabase Edge Function secrets.
- Verify `REPLICATE_API_TOKEN`, `BACKEND_BASE_URL`, and `FRONTEND_BASE_URL` in production secrets/configuration.
- Run a real Replicate test generation and verify: queued → processing → completed, private storage persistence, signed access, and exactly-once token deduction.
- Run a real Paystack test-mode transaction and verify webhook signature, amount/currency validation, idempotent fulfillment, and token/subscription updates.
- Confirm the production frontend environment contains `VITE_SUPABASE_URL` and the Supabase publishable/anon key.
- Configure production hosting and SPA fallback so `/signin`, `/signup`, `/app/*`, and `/admin/*` resolve to `index.html`.
- Review Supabase Auth redirect URLs and production site URL.
- Review backup/restore, monitoring, alerting, rate limits, and incident response before launch.
