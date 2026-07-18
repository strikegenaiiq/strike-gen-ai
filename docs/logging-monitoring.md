# STRIKE GEN AI — Logging & Monitoring

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI SRE Team

---

## 1. Overview

This document defines log structure, aggregation, retention, and the monitoring surface used by engineering and operations. It complements [Observability](observability.md), which covers metrics, traces, and alerting philosophy.

See also:
- [Observability](observability.md) — SLIs, dashboards, alerting.
- [Incident Response](incident-response.md) — log use during incidents.
- [Security Architecture](security-architecture.md) — audit logging and PII redaction.

---

## 2. Log Structure

All logs are emitted as structured JSON with a common envelope:

```json
{
  "timestamp": "2026-07-09T12:00:00.123Z",
  "level": "info",
  "service": "api",
  "env": "production",
  "request_id": "uuid",
  "trace_id": "uuid",
  "user_id": "uuid",
  "job_id": "uuid",
  "event": "generation.submitted",
  "message": "Video generation job queued",
  "fields": { "media_type": "video", "estimated_cost": 8 }
}
```

Required fields on every log line:
- `timestamp`, `level`, `service`, `env`, `event`, `message`.

Correlation fields when applicable:
- `request_id`, `trace_id`, `user_id`, `job_id`.

---

## 3. Log Levels

| Level | Use |
|---|---|
| `error` | Operation failed; needs attention. |
| `warn` | Degraded but recovered; investigate. |
| `info` | Normal business events (login, job submitted, payment succeeded). |
| `debug` | Verbose diagnostics; disabled in production by default. |

`debug` is never emitted in production except temporarily during an active incident, and only for the affected service.

---

## 4. Event Taxonomy

Events use a dot-separated `domain.action` convention:
- `auth.login_succeeded`, `auth.login_failed`
- `generation.submitted`, `generation.completed`, `generation.failed`
- `credit.reserved`, `credit.deducted`, `credit.refunded`
- `payment.succeeded`, `payment.failed`, `payment.refunded`
- `admin.credit_adjusted`, `admin.user_suspended`

Event names are versioned by convention: a breaking change to a logged field set introduces a new event name (e.g., `generation.completed_v2`) rather than mutating the existing one.

---

## 5. PII and Secret Redaction

- Never log raw passwords, tokens, API keys, or full card numbers.
- Mask payment identifiers: last 4 digits only.
- Redact prompt text in generation logs at `info` level (log length and hash only); full prompt logged at `debug` for incident debugging only.
- Redaction is applied at the logging layer before emission; do not rely on downstream filtering.

---

## 6. Aggregation

- Logs are shipped to a central aggregation platform.
- Services emit to stdout; a collector agent forwards to the aggregation backend.
- Retention: 90 days hot, 1 year archived (see [Observability](observability.md) §10).
- Access to logs is role-based; production log access requires SRE or on-call role.

---

## 7. Audit Logs

Audit logs are a subset of logs for security- and finance-relevant events. They are:
- Append-only and tamper-evident (write-once storage).
- Retained for at least 7 years for financial records (payments, refunds, credit adjustments).
- Accessible to security and finance roles; admin access is logged.

Audited events:
- Logins, password resets, token revocation.
- Admin actions (user suspend, role change, credit adjust, refund, content takedown).
- Webhook receipt and reconciliation results.
- Feature flag production changes.

---

## 8. Monitoring Surface

Monitoring is delivered through:
- **Dashboards** — see [Observability](observability.md) §5.
- **Alerts** — routed to on-call via paging; non-urgent alerts to chat channels.
- **Health endpoints** — `/health` (liveness) and `/ready` (readiness) per service, consumed by load balancers and deployment pipelines.
- **Status page** — public-facing status page for major incidents.

---

## 9. Health Checks

- **Liveness** (`/health`): is the process running? Returns 200 unless the process is wedged.
- **Readiness** (`/ready`): can the service serve traffic? Checks critical dependencies (DB, queue, provider reachability) with short timeouts.
- Health check failures trigger instance replacement and deploy gating.

---

## 10. Querying and Investigation

- Logs are queryable by `request_id`, `trace_id`, `user_id`, `job_id`, and `event`.
- Saved searches exist for common investigations: failed generations, payment failures, admin actions by user.
- During incidents, a temporary saved search captures the affected window for post-incident review.

---

## 11. Future Considerations

- **Log-based metrics** — derive counters from structured logs to avoid duplicate instrumentation.
- **Automatic PII detection** — scan log streams for PII patterns and alert on leaks.
- **Query federation** — cross-correlate logs, metrics, and traces from a single pane.

---

## Revision History

- 0.1 — Initial logging & monitoring (2026-07-09)
