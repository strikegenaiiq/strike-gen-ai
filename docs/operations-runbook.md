# STRIKE GEN AI — Operations Runbook

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI SRE Team

---

## 1. Overview

This runbook contains operational procedures for common scenarios at STRIKE GEN AI. It is the on-call's first reference during an incident. Each procedure lists symptoms, impact, immediate actions, and verification. For the response process itself, see [Incident Response](incident-response.md).

See also:
- [Incident Response](incident-response.md) — roles, severity, communication.
- [Observability](observability.md) — dashboards and alerts.
- [Backup & Recovery](backup-recovery.md) — restore procedures.

---

## 2. How to Use This Runbook

- Start from the alert or symptom.
- Find the matching procedure below.
- Follow steps in order; do not skip verification.
- If a step does not match observed behavior, escalate and treat as a novel incident.
- Update this runbook after any incident that revealed a missing or incorrect procedure.

---

## 3. Common On-Call Actions

These actions recur across procedures and are documented once here:

- **Acknowledge the alert** in the paging tool to stop escalation.
- **Open an incident channel** (`#inc-<id>-<short>`) for SEV1/SEV2.
- **Check recent deploys** on the deployment dashboard; a recent deploy is the first suspect.
- **Check provider status pages** for AI providers, payment processor, and email service.
- **Roll back** the last deploy if symptoms started within 30 minutes of it.
- **Flip a kill switch** via the admin flag interface to disable an affected feature.

---

## 4. Procedure: API Error Rate Spike

**Symptoms:** Alert `api_error_rate_high` fires; 5xx rate above threshold on one or more routes.

**Impact:** Users see errors; possible full or partial outage.

**Steps:**
1. Check which routes are erroring and whether it is broad or isolated.
2. Check recent deploys; if within 30 min, roll back.
3. Check dependent services (DB, queue, provider) on the health dashboard.
4. If a single provider is involved, confirm via its status page and fail over via model routing if needed.
5. If DB-related, check DB metrics (connections, latency, disk).
6. If not resolved, declare an incident and engage SMEs.

**Verification:** Error rate returns below threshold; synthetic probes green.

---

## 5. Procedure: Generation Job Backlog Growing

**Symptoms:** Alert `queue_backlog_high` fires; oldest unprocessed job age exceeds target.

**Impact:** Generation latency increases; users wait longer for assets.

**Steps:**
1. Check worker count and autoscaling events — did autoscaling fire?
2. Check worker error rate — are workers crash-looping?
3. Check provider rate limits — are jobs failing due to provider throttling?
4. If provider-throttled, enable additional provider adapters or lower the submission rate (feature flag).
5. If workers are healthy but throughput is insufficient, manually raise worker count.
6. If a specific provider is down, mark it unhealthy in the routing config to force failover.

**Verification:** Queue depth trending down; oldest job age under target.

---

## 6. Procedure: Payment Webhook Backlog

**Symptoms:** Alert `payment_webhook_backlog` fires; webhook processing latency exceeds target.

**Impact:** Credits and subscriptions may not update promptly; users may be unable to generate despite having paid.

**Steps:**
1. Check webhook consumer health and error rate.
2. Check the payment processor status page for webhook delivery issues.
3. Check the DB for locks or slow queries on the payments/credits path.
4. If the consumer is wedged, restart the consumer group.
5. Reconcile missed webhooks from the processor's event replay API once stable.

**Verification:** Webhook latency returns to target; reconciliation job confirms no missing events.

---

## 7. Procedure: AI Provider Outage

**Symptoms:** A provider's error rate spikes or its status page reports an incident.

**Impact:** Generation failures if the router does not fail over fast enough.

**Steps:**
1. Confirm the outage on the provider's status page.
2. Mark the provider unhealthy in the routing config to force immediate failover.
3. Monitor failover volume and the health of fallback providers.
4. If fallback providers cannot absorb load, throttle generation submission via feature flag.
5. Post a status update if user-visible latency increases.
6. When the provider recovers, mark it half-open to probe before restoring full traffic.

**Verification:** Generation success rate returns to target; provider health shows closed.

---

## 8. Procedure: Authentication Service Degraded

**Symptoms:** Elevated 401s or login latency; users report being unable to sign in.

**Impact:** Users cannot access the platform.

**Steps:**
1. Check auth service health and recent deploys.
2. Check the identity store (DB or managed service) for latency or outages.
3. If token validation is failing broadly, check key rotation status (signing keys).
4. If a recent key rotation is misconfigured, roll back the key change.
5. If the service is wedged, restart it behind the load balancer.

**Verification:** Login success rate returns to normal; synthetic login probe green.

---

## 9. Procedure: Disk or Storage Pressure

**Symptoms:** Disk usage alert on a stateful service; object storage quota alert.

**Impact:** Writes may fail; generation jobs may fail storing assets.

**Steps:**
1. Identify what is consuming storage (logs, temp files, assets).
2. For logs, confirm retention is applying; manually trigger archival if behind.
3. For object storage, run the asset lifecycle job to move cold assets to cheaper tiers or archive per policy.
4. If a runaway process is writing unexpectedly, identify and stop it.
5. Expand capacity if legitimate growth has exhausted it.

**Verification:** Disk usage below warning threshold; write success rate normal.

---

## 10. Procedure: Suspected Data Leak

**Symptoms:** Unusual data egress, an external report of exposed data, or secret scanning alert.

**Impact:** Potential breach with regulatory and trust consequences.

**Steps:**
1. Treat as SEV1; engage security lead immediately.
2. Preserve evidence — do not delete logs.
3. If a credential is involved, rotate it and revoke active sessions/tokens.
4. Contain the leak (disable the affected integration or feature via kill switch).
5. Follow the breach notification process in the [Security Architecture](security-architecture.md).
6. Document everything for the post-incident review.

**Verification:** Leak path closed; rotated credentials in use; no further egress detected.

---

## 11. Post-Incident

After any incident handled with this runbook:
- Confirm the runbook procedure used was accurate; file a PR to fix any gaps.
- Ensure the incident has a post-incident review scheduled (SEV1/SEV2).
- Verify action items are captured with owners.

---

## Revision History

- 0.1 — Initial operations runbook (2026-07-09)
