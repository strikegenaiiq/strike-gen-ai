# STRIKE GEN AI — Service Level Agreement

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI Operations Team

---

## 1. Overview

This document defines the service level objectives (SLOs) and the service level agreement (SLA) for STRIKE GEN AI. SLOs are internal targets the team holds itself to; the SLA is the external commitment to customers. This is a planning-stage document; numbers are indicative and finalized before launch.

See also:
- [Observability](observability.md) — SLIs and error budgets.
- [Incident Response](incident-response.md) — response targets.
- [Subscription Plans](subscription-plans.md) — plan-specific support tiers.

---

## 2. Service Level Indicators (SLIs)

| SLI | Measurement | Window |
|---|---|---|
| API availability | Non-5xx responses / valid requests | Rolling 30 days |
| API latency p95 | 95th percentile per route | Rolling 30 days |
| Generation success rate | Completed jobs / submitted (excl. user cancel) | Rolling 30 days |
| Asset download success | Successful signed URL fetches | Rolling 30 days |
| Payment webhook processing | Webhooks reconciled within SLA | Rolling 30 days |

---

## 3. Service Level Objectives (SLOs)

Internal targets the team commits to operating within.

| SLO | Target | Error Budget |
|---|---|---|
| API availability | 99.9% | 43.2 min/month |
| API latency p95 (CRUD) | ≤ 300ms | 5% of requests may exceed |
| Generation success rate | ≥ 95% | 5% of jobs may fail |
| Asset download success | ≥ 99.5% | 0.5% may fail |
| Payment webhook processing | ≥ 99% within 5 min | 1% may be delayed |

Error budgets are consumed by incidents and slow degradation. When a budget is exhausted, release velocity is throttled until reliability work restores it.

---

## 4. Service Level Agreement (SLA)

External commitment to paying customers. The SLA is set conservatively below the SLO to leave room for operational variance.

| Metric | SLA | Credit |
|---|---|---|
| Platform availability (auth, dashboard, generation) | 99.5% / month | 10% of monthly fee if breached |
| Generation service availability | 99.0% / month | 5% of monthly fee if breached |

Exclusions:
- Scheduled maintenance announced at least 72 hours in advance.
- Force majeure and third-party provider outages outside our control (documented with evidence).
- Issues caused by customer misconfiguration or policy-violating usage.

Claims must be submitted within 30 days of the incident. Service credits are the sole remedy under this SLA.

---

## 5. Support Tiers

| Plan | Response Target | Channels |
|---|---|---|
| Free | Best effort | Community |
| Creator | 1 business day | Email |
| Pro | 4 hours (SEV1), 1 business day (others) | Priority email |
| Enterprise | Per contract, typically 1 hour (SEV1) | Dedicated + SLA |

Response targets apply to first response, not resolution. Resolution targets are defined per severity in [Incident Response](incident-response.md).

---

## 6. Maintenance Windows

- Scheduled maintenance is published at least 72 hours in advance.
- Maintenance is scheduled in low-traffic windows for the primary user base.
- Emergency maintenance may occur without notice for SEV1 mitigation; a post-incident notice is published.
- Maintenance impact on availability is excluded from the SLA.

---

## 7. Status Communication

- A public status page reflects current service health.
- SEV1/SEV2 incidents are posted to the status page on declaration and on resolution.
- A post-incident summary is published for SEV1/SEV2 within 5 business days (see [Incident Response](incident-response.md)).

---

## 8. Measurement and Reporting

- SLO performance is reported monthly to engineering leadership.
- SLA performance is reported to affected customers upon request and summarized quarterly.
- SLI data is sourced from the observability stack (see [Observability](observability.md)); manual overrides are not permitted.

---

## 9. Future Considerations

- **Tiered SLAs** — higher availability commitments for Enterprise customers.
- **Real-time SLI page** on the status site.
- **SLA-backed generation latency** — commit to end-to-end generation time targets once provider SLAs are contractual.

---

## Revision History

- 0.1 — Initial service level agreement (2026-07-09)
