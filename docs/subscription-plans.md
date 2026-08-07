# STRIKE GEN AI — Subscription Plans

Version: 0.2
Date: 2026-08-07
Status: Current product positioning

## Plan catalog

| Plan | Monthly price | Included credits | Positioning |
|---|---:|---:|---|
| Standard | $19 | 300 | Entry paid creator plan |
| Pro | $49 | 1,000 | Frequent creators |
| Premium | $99 | 2,500 | Serious/high-volume creators |
| Creator | $249 | 7,000 | Highest self-serve creator tier |

There is **no Free plan and no free trial** in the current product positioning. Users must subscribe to a paid plan to access paid creation capacity and the metered Creator Advisor.

## Credit economics

Credits are the platform's usage unit. Provider cost is never exposed as the user's price. The server owns the final credit calculation, reservation, settlement, and refund behavior.

Each model/request is priced from its verified provider cost and Strike's commercial margin policy. The frontend must display server-provided estimates/results and must not become the source of truth for charges.

Creator Advisor usage follows the same credit economy. It is not an unlimited free conversation. Its input/output rates remain disabled until the provider model and verified provider economics are configured.

## Billing

Self-serve subscriptions use Paystack recurring billing. Checkout is initialized server-side from the active plan's stored USD price and the current FX conversion used by the payment flow. Payment fulfillment is verified server-side before credits or subscription access are granted.

Recurring lifecycle requirements:
- successful initial payment activates the selected plan;
- successful renewal allocates the plan's recurring credits;
- failed renewal enters the configured payment-failure/grace workflow;
- cancellation preserves access through the paid period where supported by the provider;
- re-subscription/reactivation is supported without requiring a new account;
- payment and credit records remain auditable.

## Credit allocation

On subscription start or renewal, included credits are recorded through the canonical credit ledger. Credits do not silently bypass the ledger and are not granted by frontend state.

## Entitlements

Model and feature access is determined by the user's active subscription and server-side entitlements. The frontend may hide unavailable options for a clean experience, but the backend remains authoritative.

## Production rule

Do not activate a model, Advisor pricing rule, plan, or payment route unless its provider economics, entitlement, accounting, and fulfillment path have been verified together.
