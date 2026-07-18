# STRIKE GEN AI — Analytics & Reporting

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI Product & Data Team

---

## 1. Overview

This document defines the metrics, reports, and data pipelines for analytics at STRIKE GEN AI. It covers business KPIs, product usage, operational metrics, and admin reporting. It is a planning-stage document.

See also:
- [Business Model](business-model.md) §18 — KPIs.
- [Admin Dashboard](admin-dashboard.md) §3.5 — admin analytics views.
- [Observability](observability.md) — system metrics (vs. business metrics here).
- [Revenue & Cost Analysis](revenue-and-cost-analysis.md) — unit economics.

---

## 2. Metric Categories

| Category | Questions answered |
|---|---|
| Growth | Are we acquiring users? |
| Engagement | Are users active and returning? |
| Generation | Are users creating assets successfully? |
| Monetization | Are users converting and paying? |
| Retention | Are users staying? |
| Operations | Is the platform healthy? |

---

## 3. Core Metrics

### Growth
- New signups (daily, weekly, monthly).
- Signup source / channel attribution.
- Activation rate (signup → first generation).

### Engagement
- MAU and DAU; DAU/MAU ratio (stickiness).
- Sessions per user; session duration.
- Feature adoption (which generation types, project usage).

### Generation
- Jobs submitted, completed, failed, cancelled per media type.
- Success rate; p95 end-to-end latency.
- Average credits consumed per job.
- Provider mix and failover rate.

### Monetization
- Free-to-paid conversion rate.
- MRR, ARR, ARPU.
- Plan distribution; upgrade/downgrade rates.
- Credit purchase volume.
- Refund and chargeback rates.

### Retention
- Retention curves by cohort (signup month, plan).
- Monthly churn rate; churn by plan and reason.
- Net revenue retention (expansion vs. contraction vs. churn).

### Operations
- SLI status (availability, latency) — linked from [Observability](observability.md).
- Incident count and MTTR.
- Support ticket volume and time-to-first-response.

---

## 4. Data Pipeline (Planning)

1. **Event capture:** application and worker services emit structured events (see [Logging & Monitoring](logging-monitoring.md)).
2. **Ingestion:** events flow to the analytics warehouse via streaming or batch export.
3. **Modeling:** raw events are transformed into dimensional models (users, jobs, payments) with defined grains.
4. **Serving:** dashboards query the modeled data; reports are generated on schedule or on demand.

PII handling: raw prompts are not stored in analytics; aggregates and metadata only. See [Privacy Policy](privacy-policy.md).

---

## 5. Reports

| Report | Audience | Cadence |
|---|---|---|
| Executive summary | Leadership | Weekly |
| Growth & conversion | Product, Growth | Weekly |
| Generation operations | Product, SRE | Daily |
| Revenue & billing | Finance, Leadership | Monthly |
| Retention cohorts | Product | Monthly |
| Admin user list | Admins | On demand |
| Moderation activity | Trust & Safety | Weekly |
| SLA performance | Leadership, customers | Monthly |

Reports are exportable (CSV/JSON) via the admin dashboard.

---

## 6. Definitions (Canonical)

To prevent metric drift, each metric has a single owner and a documented definition:
- **MAU:** unique authenticated users with ≥1 generation or project action in the trailing 30 days.
- **DAU:** same, trailing 1 day.
- **Active subscription:** `user_subscriptions.status = active` at period end.
- **Churn:** cancellation or non-renewal of a paid subscription in the period.
- **Conversion:** free user starting a paid subscription within 30 days of signup.

Metric definitions are versioned; a definition change is documented and dated.

---

## 7. Access Control

- Business analytics: product, growth, leadership.
- Financial reports: finance, leadership.
- Operational metrics: SRE, engineering.
- Per-user data: admin and support roles per the [Admin Dashboard](admin-dashboard.md) access matrix.
- Export of raw data requires approval and is audited.

---

## 8. Future Considerations

- **Self-serve analytics** for enterprise customers on their own usage.
- **Experimentation platform** for A/B tests with automatic significance checks.
- **Predictive churn** models for proactive retention outreach.
- **Real-time revenue dashboards** for finance.

---

## Revision History

- 0.1 — Initial analytics & reporting (2026-07-09)
