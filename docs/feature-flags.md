# STRIKE GEN AI — Feature Flags

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI Engineering Team

---

## 1. Overview

Feature flags control the visibility and behavior of features at runtime without redeployment. They decouple release from deployment, enable safe canary rollouts, and gate entitlements by subscription plan. This is a planning-stage document defining flag taxonomy, lifecycle, and usage rules.

See also:
- [Deployment Strategy](deployment-strategy.md) — release and rollback.
- [Subscription Plans](subscription-plans.md) — entitlement-gated flags.
- [Observability](observability.md) — flag exposure metrics.

---

## 2. Goals

- **Decouple release from deployment** — ship code dark, enable when ready.
- **Safe rollout** — canary new features to a subset of users or plans.
- **Entitlement gating** — turn features on/off by plan tier.
- **Emergency kill switch** — disable a misbehaving feature without redeployment.
- **Experimentation** — support A/B tests (future).

---

## 3. Flag Taxonomy

| Category | Purpose | Example |
|---|---|---|
| Release | Gate unreleased features | `video_generation_enabled` |
| Entitlement | Gate by plan tier | `plan_4k_video` |
| Operational | Kill switch for incidents | `payments_checkout_off` |
| Experiment | A/B test variants | `dashboard_layout_v2` |
| Migration | Expand-contract schema rollouts | `credits_ledger_v2_read` |

---

## 4. Evaluation

Flags are evaluated per request with the following context:
- User ID and plan tier.
- Request metadata (e.g., route, client type).
- Rollout cohort (hash of user ID for percentage rollouts).

Evaluation order:
1. Operational override (global on/off for incidents) — highest priority.
2. Entitlement gate (plan tier check).
3. Release rollout (percentage or allowlist).
4. Experiment assignment.
5. Default value.

Evaluation results are cached briefly per request to avoid repeated lookups; the cache invalidates on flag update.

---

## 5. Lifecycle

States:
- `draft` — defined but not active.
- `active` — evaluated in production.
- `retired` — permanently on (or off) and slated for removal.
- `removed` — deleted from the flag list.

Rules:
- A flag is `retired` when its rollout is complete and the behavior is the new default. Retired flags that are always-on should be removed from the codebase in a follow-up change — do not leave them as permanent checks.
- Flag definitions are version-controlled and reviewed via PR.
- Flag changes in production are auditable (who, when, what changed).

---

## 6. Rollout Patterns

- **Percentage rollout** — hash user ID, enable for the bottom N% of the hash space.
- **Allowlist** — enable for specific user IDs or accounts (useful for early access and enterprise pilots).
- **Plan-gated** — enable for a plan tier and above.
- **Regional** — enable for requests from specific regions (future).
- **Time-boxed** — enable at a scheduled time (for coordinated launches).

---

## 7. Entitlement Gating

Plan entitlements (see [Subscription Plans](subscription-plans.md)) are enforced as feature flags keyed by plan tier. Examples:
- `plan_4k_video` — true for Pro and Enterprise.
- `plan_priority_queue` — true for Pro and Enterprise.
- `plan_team_seats` — numeric value per plan.

Entitlement flags are read from the plan's `entitlements` JSON at evaluation time; changing entitlements is a plan catalog change, not a flag flip.

---

## 8. Operational Kill Switches

- Every user-facing feature has a corresponding kill switch flag.
- Kill switches can be toggled without deployment via an admin interface.
- Toggling a kill switch is audited and triggers an alert to on-call.
- Kill switches take precedence over release and entitlement evaluation.

---

## 9. Observability

For each flag:
- Log the evaluation result with request ID and user ID (sampled for high-traffic flags).
- Emit a metric counter for `flag.evaluated` labeled by flag key and result.
- Alert on sudden drops in evaluation true-rate (may indicate a misconfigured rollout).

---

## 10. Naming Conventions

- Lowercase snake case.
- Category prefix: `release_`, `plan_`, `ops_`, `exp_`, `migration_`.
- Descriptive name: `release_video_generation`, `plan_4k_video`, `ops_payments_off`.

---

## 11. Future Considerations

- **Self-service admin UI** for flag management with approval workflow.
- **A/B test framework** with automatic metric comparison and guardrails.
- **Flag dependencies** — declaring that one flag requires another.
- **Stale flag detection** — surface flags that have been at a fixed value for N days.

---

## Revision History

- 0.1 — Initial feature flags (2026-07-09)
