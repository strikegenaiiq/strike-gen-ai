# STRIKE GEN AI — Observability

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI SRE Team

---

## 1. Overview

Observability covers the metrics, logs, traces, and alerts that let the team understand system behavior and respond to incidents. This is a planning-stage document defining the signal taxonomy, retention, and alerting philosophy.

See also:
- [Logging & Monitoring](logging-monitoring.md) — log structure and aggregation.
- [Incident Response](incident-response.md) — escalation and breach handling.
- [Deployment Strategy](deployment-strategy.md) — health checks and canary validation.

---

## 2. Pillars

| Pillar | Purpose | Storage |
|---|---|---|
| Metrics | Quantify system behavior over time | Time-series DB, 30-day hot / 13-month cold |
| Logs | Discrete event records with context | Centralized log store, 90-day hot / 1-year archive |
| Traces | End-to-end request flow across services | Distributed tracing store, 7-day hot / 30-day cold |
| Alerts | Notify humans when signals cross thresholds | Alerting platform → on-call rotation |

---

## 3. Service-Level Indicators (SLIs)

Core SLIs and their default targets (planning-stage):

| SLI | Definition | Target |
|---|---|---|
| API availability | Fraction of non-5xx responses to valid requests | ≥ 99.9% |
| API latency p95 | 95th percentile request latency for simple CRUD | ≤ 300ms |
| Generation success rate | Fraction of jobs reaching `completed` (excluding user cancel) | ≥ 95% |
| Generation p95 end-to-end | 95th percentile job submit → asset ready | per media type target |
| Payment webhook latency | Time from webhook receipt to ledger update | ≤ 5s p95 |
| Queue backlog | Max age of an unprocessed job | ≤ 10 min |

Each SLI rolls up to an SLO in the [Service Level Agreement](service-level-agreement.md).

---

## 4. Key Metrics

### API
- Request rate, error rate, latency (p50/p95/p99) per route.
- Auth failures, 401/403/429 counts.
- Idempotency replay count.

### Generation
- Jobs submitted, in-flight, completed, failed, cancelled per media type.
- Provider call count, error count, latency per provider.
- Failover events and retry counts.
- Estimated vs actual credit cost variance.

### Credits & Billing
- Credit balance distribution across users.
- Credit transaction rate per reason.
- Payment success/failure rate; refund rate.
- Dunning outcomes (retry → success/failure).

### Storage
- Asset bytes stored, growth rate.
- CDN egress bytes.
- Object count by tier (hot/warm/cold).

### Workers
- Queue depth, pickup latency, processing time.
- Worker count and autoscaling events.
- Crash/restart counts.

---

## 5. Dashboards

| Dashboard | Audience | Key panels |
|---|---|---|
| System health | SRE | SLI status, error budget burn, queue depth |
| Generation ops | SRE + Product | Job throughput, provider latency, failover |
| Billing | Finance + Admin | Payment success, refund rate, MRR proxy |
| Product | Product | MAU/DAU, generation volume, conversion |
| Incident | On-call | Affected SLI, recent deploys, alert timeline |

Dashboards link to the underlying queries and to the related alert definitions.

---

## 6. Alerting Philosophy

- Alert on **symptoms** (user-visible degradation) over causes.
- Every alert must be **actionable** — if no human can fix it, it should be a dashboard, not an alert.
- Prefer **multi-burn-rate** alerts for SLOs: fast burn for acute incidents, slow burn for chronic issues.
- Page for acute SLO violation; ticket for chronic degradation.
- Every page has a linked runbook entry (see [Operations Runbook](operations-runbook.md)).

Alert annotations:
- Symptom summary.
- Impact (which user flow is affected).
- Runbook link.
- Owner team.

---

## 7. Error Budgets

- Each SLO has an error budget: `(1 - target) * window`.
- Budget burn is tracked on 1-hour and 30-day windows.
- If the 30-day budget is exhausted, freeze non-emergency releases and prioritize reliability work.
- If the 1-hour budget burns fast, page on-call.

---

## 8. Distributed Tracing

- Trace context propagated across API → queue → worker → provider call.
- Every job carries a `job_id` and `trace_id`; logs and traces correlate on these.
- Sampling: 100% of errors and slow requests; sampled otherwise to control cost.
- Trace spans capture: route, DB query, provider call, storage write.

---

## 9. Synthetic Monitoring

- Probes hit key user paths (login, submit generation, list projects) from external locations.
- Probe failures page on-call independent of internal metrics.
- Probes run every 1–5 minutes and measure both availability and latency.

---

## 10. Retention and Cost

- Metric hot retention: 30 days (fast dashboards). Cold: 13 months (trend analysis).
- Log hot retention: 90 days. Archive: 1 year (compliance).
- Trace hot retention: 7 days. Cold: 30 days.
- Storage cost is reviewed quarterly; retention windows are the primary lever.

---

## 11. Future Considerations

- **Continuous profiling** for worker cost attribution.
- **OpenTelemetry** as the single instrumentation standard.
- **SLO-based autoscaling** for workers (scale on error budget, not just queue depth).
- **Anomaly detection** on business metrics (e.g., sudden revenue drop).

---

## Revision History

- 0.1 — Initial observability (2026-07-09)
