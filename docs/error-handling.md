# STRIKE GEN AI — Error Handling

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI Engineering Team

---

## 1. Overview

This document defines the error code catalog, client recovery guidance, and internal error handling conventions. It complements the error model in [API](api.md).

See also:
- [API](api.md) — shared error envelope.
- [API Rate Limits](api-rate-limits.md) — `429` specifics.

---

## 2. Error Envelope

All errors share one shape:

```json
{
  "error": {
    "code": "string_code",
    "message": "Human readable message",
    "details": { "field": "reason" },
    "request_id": "uuid"
  }
}
```

- `code` is a stable, lower-snake-case identifier clients can switch on.
- `message` is human-readable and may vary; clients must not parse it.
- `details` is optional and carries field-level validation info.
- `request_id` is always present and should be included in support requests.

---

## 3. HTTP Status to Error Code Map

| HTTP | When | Common codes |
|---|---|---|
| 400 | Validation error | `invalid_request`, `validation_failed` |
| 401 | Missing/invalid credentials | `unauthenticated` |
| 403 | Insufficient privileges | `forbidden`, `plan_not_entitled` |
| 404 | Resource not found | `not_found` |
| 409 | Conflict / idempotency replay | `conflict`, `idempotency_replay` |
| 402 | Insufficient credits | `insufficient_credits` |
| 422 | Semantic validation | `unprocessable` |
| 429 | Rate limited | `rate_limited` |
| 500 | Uncaught server error | `internal_error` |
| 502 | Upstream error | `bad_gateway` |
| 503 | Dependency degraded | `service_unavailable` |
| 504 | Upstream timeout | `gateway_timeout` |

---

## 4. Error Code Catalog

### Validation
- `invalid_request` — malformed JSON or missing required field.
- `validation_failed` — one or more fields failed validation; see `details`.
- `unprocessable` — syntactically valid but semantically invalid (e.g., duration out of range).

### Auth
- `unauthenticated` — no token, or token expired/invalid.
- `forbidden` — authenticated but not allowed.
- `plan_not_entitled` — action requires a higher plan tier.
- `token_revoked` — token has been revoked.

### Resources
- `not_found` — resource does not exist or is not visible to the caller.
- `conflict` — unique constraint violation or state conflict.
- `idempotency_replay` — an `Idempotency-Key` was reused with a different payload.

### Billing & Credits
- `insufficient_credits` — not enough credits to accept the job.
- `payment_required` — payment needed to proceed.
- `payment_failed` — a payment attempt failed.
- `subscription_inactive` — subscription is not active.

### Generation
- `generation_failed` — provider returned an error or no usable output.
- `generation_timeout` — job exceeded the timeout.
- `provider_unavailable` — all eligible providers are unavailable.
- `content_policy_violation` — prompt rejected by provider policy.

### System
- `rate_limited` — rate limit exceeded; see `Retry-After`.
- `internal_error` — uncaught server error; support can investigate via `request_id`.
- `service_unavailable` — a dependency is degraded.
- `bad_gateway` — upstream returned an invalid response.
- `gateway_timeout` — upstream timed out.

---

## 5. Client Recovery Guidance

| Code | Client action |
|---|---|
| `unauthenticated` | Refresh token; re-login if refresh fails. |
| `token_revoked` | Force re-login. |
| `forbidden` / `plan_not_entitled` | Show upgrade CTA; do not retry. |
| `not_found` | Do not retry; update local state. |
| `conflict` | Fetch fresh state and reconcile. |
| `idempotency_replay` | Treat as the original response (same key = same result). |
| `insufficient_credits` | Offer credit purchase flow; do not retry. |
| `validation_failed` | Fix fields per `details`; do not retry unchanged. |
| `rate_limited` | Back off per `Retry-After`; retry with idempotency key. |
| `generation_failed` / `provider_unavailable` | Retry with backoff up to 2 attempts; then surface error. |
| `generation_timeout` | Poll status endpoint; do not resubmit. |
| `content_policy_violation` | Do not retry; show policy guidance. |
| `5xx` | Retry with exponential backoff + jitter up to 3 attempts. |

---

## 6. Field Validation Errors

`details` for `validation_failed` maps field paths to reasons:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Validation failed.",
    "details": {
      "prompt": "must not be empty",
      "duration_seconds": "must be between 1 and 60"
    },
    "request_id": "uuid"
  }
}
```

Field paths use dot notation for nested fields: `advanced_options.resolution`.

---

## 7. Internal Conventions

- Errors are created via shared helpers, not ad-hoc strings, to keep codes stable.
- Never leak internal stack traces, SQL, or secrets in `message` or `details`.
- Log the full error context server-side with `request_id`; clients receive only the safe envelope.
- 5xx errors are always logged at `error` level and counted against the error budget.

---

## 8. Idempotency and Errors

- A `409 idempotency_replay` returns the original response's status and body, not an error envelope. Clients should treat it as the original result.
- A `429` or `5xx` response to an idempotent request does **not** consume the idempotency key — retrying with the same key is safe.

---

## 9. Future Considerations

- **Machine-readable error schema** (JSON Schema) published per version.
- **Error catalog endpoint** for clients to query codes and recovery hints.
- **Localization** of `message` via `Accept-Language`.

---

## Revision History

- 0.1 — Initial error handling (2026-07-09)
