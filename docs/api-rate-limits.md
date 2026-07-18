# STRIKE GEN AI — API Rate Limits

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI API Team

---

## 1. Overview

This document defines rate limiting tiers, headers, and behavior for the STRIKE GEN AI API. Rate limits protect AI provider budgets, system stability, and fair usage across customers.

See also:
- [API](api.md) — shared contracts.
- [Subscription Plans](subscription-plans.md) — plan tiers.
- [Error Handling](error-handling.md) — `429` response.

---

## 2. Limit Dimensions

Limits are applied independently along multiple dimensions:

| Dimension | Scope | Example |
|---|---|---|
| Per-user | Per authenticated user | 100 req/min |
| Per-IP | Per source IP (anon or auth) | 600 req/min |
| Per-endpoint | Specific expensive routes | Generation: 10 jobs/min |
| Global | Total platform throughput | Protects backend capacity |

The most restrictive applicable limit wins.

---

## 3. Tiers by Plan

| Plan | General API (req/min) | Generation (jobs/min) | Asset download (req/min) |
|---|---|---|---|
| Free | 60 | 2 | 30 |
| Creator | 300 | 10 | 120 |
| Pro | 1,200 | 30 | 480 |
| Enterprise | Custom | Custom | Custom |

Enterprise limits are contractual and may include committed-rate bursting.

---

## 4. Response Headers

Rate-limited responses include:

- `X-RateLimit-Limit: 100` — the limit in the current window.
- `X-RateLimit-Remaining: 42` — remaining requests in the window.
- `X-RateLimit-Reset: 1720440000` — epoch seconds when the window resets.

Non-limited responses include the headers too, so clients can proactively throttle.

---

## 5. `429 Too Many Requests` Response

```json
{
  "error": {
    "code": "rate_limited",
    "message": "Rate limit exceeded. Retry after 12 seconds.",
    "details": { "retry_after_seconds": 12, "limit": "per_user" },
    "request_id": "uuid"
  }
}
```

The response also includes a `Retry-After: 12` header in seconds.

---

## 6. Burst and Smoothing

- Limits use a sliding window with a burst allowance of up to 20% of the per-minute limit in a 1-second burst.
- Generation endpoints do not allow bursting — they are strictly metered to protect provider budgets.
- Clients should spread requests evenly and back off on `429`.

---

## 7. Client Guidance

- Honor `Retry-After`; do not retry immediately.
- Use the `X-RateLimit-Remaining` header to pace requests proactively.
- Use idempotency keys on generation and payment endpoints to safely retry after a `429`.
- Batch where endpoints support it to reduce request count.

---

## 8. Abuse and Anomaly Handling

- Sustained limit-hugging by an account triggers a review flag (possible scraping or abuse).
- Repeated generation limit violations may trigger a temporary cooldown on the account.
- Clear abuse (coordinated scraping, credential stuffing) results in immediate IP-level blocks and a security review.

---

## 9. Future Considerations

- **Quota dashboards** so users can see their usage against limits.
- **Pay-as-you-go bursting** — purchase higher rate limits.
- **Adaptive limits** that tighten under load and relax when capacity is spare.

---

## Revision History

- 0.1 — Initial API rate limits (2026-07-09)
