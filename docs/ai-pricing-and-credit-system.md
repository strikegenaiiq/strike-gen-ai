# STRIKE GEN AI — AI Pricing & Credit System

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI Product Team

---

## 1. Overview

The credit system monetizes compute and provider costs into a single unit that users consume when generating media. This document defines credit semantics, pricing logic, and reconciliation rules. It is a planning-stage document; specific credit values are illustrative and will be tuned against real provider costs.

See also:
- [Subscription Plans](subscription-plans.md) — included credits and renewal.
- [Credit Top-Up System](credit-topup-system.md) — purchasing credits.
- [Business Model](business-model.md) — pricing strategy and unit economics.

---

## 2. Credit Unit

- A **credit** is the canonical unit of usage.
- Credits are always represented as decimals with fixed precision (never floating point).
- Minimum chargeable fraction: 0.1 credit (smaller usage rounds to this).
- Credits are scoped per user (or organization, when teams are introduced).

---

## 3. Credit Types

| Type | Source | Expiry |
|---|---|---|
| Allocated | Subscription renewal or promotion | Reset on renewal; monthly allotments do not roll over |
| Purchased | Credit pack purchase | Expire per plan rules (default: no expiry) |
| Reserved | Held against an in-flight job | Released on completion or cancellation |

Consumption order: **reserved → allocated → purchased**. Reserved credits are never consumed directly; they are converted to a deduction on job completion.

---

## 4. Cost Estimation

Before a generation job is accepted, the system estimates its credit cost.

Inputs to the estimate:
- Media type (video, image, audio).
- Duration (video, audio) in seconds.
- Resolution (video, image).
- Aspect ratio.
- Output count (image batches).
- Provider-specific multipliers (cost per provider unit).

Formula (illustrative):

```
estimated_cost = base_cost[media_type]
               + duration_multiplier * duration_seconds
               + resolution_multiplier * resolution_tier
               + provider_cost_multiplier
```

The estimate is shown to the user before they confirm generation. If the estimate exceeds the user's available balance, the job is rejected with `402 Insufficient Credits` and the user is offered a purchase flow.

---

## 5. Reservation and Reconciliation

### Reservation (at job acceptance)
1. System computes `estimated_cost`.
2. System checks `available_balance >= estimated_cost`.
3. System reserves `estimated_cost` credits (move from available → reserved).
4. Job is enqueued.

### Reconciliation (on job completion)
1. System computes `actual_cost` from provider usage.
2. If `actual_cost <= estimated_cost`: release the difference back to available.
3. If `actual_cost > estimated_cost`: deduct the additional from available (up to a small tolerance; larger overruns require admin review).
4. Record a `credit_transactions` entry with `change_amount = -actual_cost` and `reason = generation`.
5. Update the generation job's `actual_cost_credits`.

### Cancellation
- If a job is cancelled before provider invocation: release all reserved credits.
- If cancelled after provider invocation: deduct actual provider cost; release the remainder.

### Failure
- On provider failure with no usable output: release all reserved credits; no charge.
- On partial output (some assets usable): charge a reduced cost per policy; record the decision in the job metadata.

---

## 6. Per-Media-Type Pricing (Illustrative)

These are planning-stage placeholders to be tuned against real provider costs.

### Video
| Resolution | Duration | Estimated Credits |
|---|---|---|
| 720p | 5s | 4 |
| 720p | 10s | 7 |
| 1080p | 5s | 8 |
| 1080p | 10s | 14 |
| 4K | 5s | 18 |
| 4K | 10s | 32 |

### Image
| Resolution | Count | Estimated Credits |
|---|---|---|
| 1024px | 1 | 1 |
| 1024px | 4 | 3 |
| 2048px (upscaled) | 1 | 2 |

### Audio
| Type | Duration | Estimated Credits |
|---|---|---|
| TTS voice | 30s | 1 |
| TTS voice | 5min | 8 |
| Music track | 30s | 2 |
| Music track | 3min | 6 |

---

## 7. Credit Ledger

The `credit_transactions` table is the source of truth. It is **append-only** — corrections are recorded as compensating transactions, never edits or deletes.

Required fields:
- `user_id`, `credit_id`, `generation_id` (nullable), `change_amount`, `resulting_balance`, `reason`, `reference`, `created_at`.

Reasons:
- `generation` — deduction for a completed job.
- `purchase` — credits added via payment.
- `subscription` — credits allocated by subscription renewal.
- `refund` — credits returned for a failed or cancelled job.
- `admin_adjustment` — manual credit grant or correction by an admin.
- `promo` — promotional credit grant.

See [Database Design](database-design.md) §4.6–4.7 for the entity definitions.

---

## 8. Low-Credit Warnings

Thresholds (configurable per plan):
- **Warning** at 20% of plan credits remaining.
- **Critical** at 5% remaining.
- **Exhausted** at 0 — generation blocked; user offered purchase flow.

Notifications fire once per threshold crossing (not on every balance change) to avoid spam. See [Notification System](notification-system.md).

---

## 9. Admin Adjustments

Admins may grant or deduct credits for support, refunds, or corrections.
- Every adjustment is logged in `admin_actions` and `credit_transactions` with `reason = admin_adjustment`.
- A justification note is required.
- Adjustments are auditable and immutable.

---

## 10. Future Considerations

- **Dynamic provider routing** — route to the cheapest provider that meets quality SLAs; see [Model Routing](model-routing.md).
- **Rollover policies** — allow unused allocated credits to roll over for a limited window on paid plans.
- **Credit sharing** — organization-level credit pools for team plans.
- **Promotional credit campaigns** — time-limited grants with their own expiry rules.

---

## Revision History

- 0.1 — Initial AI pricing & credit system (2026-07-09)
