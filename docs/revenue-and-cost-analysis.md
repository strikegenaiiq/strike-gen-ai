# STRIKE GEN AI — Revenue & Cost Analysis

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI Finance & Strategy Team

---

## 1. Overview

This document defines the unit economics framework for STRIKE GEN AI: revenue components, cost components, and the metrics used to track profitability. It is a planning-stage document; specific numbers are tuned against real provider costs once implementation begins.

See also:
- [Business Model](business-model.md) — pricing strategy.
- [AI Pricing & Credit System](ai-pricing-and-credit-system.md) — credit mechanics.
- [Analytics & Reporting](analytics-and-reporting.md) — KPI tracking.

---

## 2. Revenue Components

| Stream | Recognition |
|---|---|
| Subscriptions | Recurring, recognized over the billing period |
| Credit purchases | Deferred revenue, recognized as credits are consumed |
| Enterprise contracts | Per contract terms (typically straight-line over the term) |
| Professional services | Time & materials or fixed fee |

---

## 3. Cost Components

| Cost | Driver | Notes |
|---|---|---|
| AI provider usage | Per generation | Largest variable cost; varies by media type and provider |
| Cloud infrastructure | Compute, storage, egress | Storage grows with asset retention |
| Payment processing | Transaction volume | Processor fees + chargeback losses |
| Personnel | Headcount | Engineering, SRE, product, support, sales |
| Marketing & growth | Acquisition spend | CAC varies by channel |
| Compliance & security | Audit, legal, tooling | Fixed plus periodic spikes |

---

## 4. Unit Economics Framework

### Per-generation economics
```
gross_margin_per_job = credits_consumed * price_per_credit
                     - provider_cost_per_job
                     - storage_cost_amortized
                     - infra_cost_amortized
```

Track margin per media type, provider, and plan tier.

### Per-customer economics
```
LTV = ARPU * gross_margin_percent * average_customer_lifetime
CAC = acquisition_spend / new_customers
LTV / CAC target: >= 3
```

### Payback period
```
payback_months = CAC / (ARPU * gross_margin_percent)
```

Target payback under 12 months for self-serve plans.

---

## 5. Key Levers

| Lever | Effect |
|---|---|
| Provider routing | Lower provider cost per job → higher gross margin |
| Credit pricing | Higher price per credit → higher ARPU (balance against churn) |
| Storage lifecycle | Tiering and archival → lower storage cost |
| Plan mix | More Pro/Enterprise → higher ARPU and margin |
| Retention | Longer lifetime → higher LTV |
| Referral/affiliate ratio | Lower-CAC channels → faster payback |

---

## 6. Metrics to Track

| Metric | Definition | Cadence |
|---|---|---|
| MRR / ARR | Monthly/annual recurring revenue | Monthly |
| ARPU | Average revenue per user | Monthly |
| Gross margin per job | (Revenue - direct cost) / revenue | Weekly |
| Gross margin % | Blended across all jobs | Monthly |
| CAC | Spend / new customers | Monthly by channel |
| LTV | Projected lifetime revenue per cohort | Quarterly |
| LTV/CAC | Ratio | Quarterly |
| Payback period | Months to recover CAC | Quarterly |
| Provider cost share | Provider cost / revenue | Weekly |
| Storage cost per asset | Storage spend / asset count | Monthly |
| Churn rate | Lost customers / starting base | Monthly |

---

## 7. Cost Monitoring

- Provider spend is tracked daily and alerted if it exceeds forecast by >15%.
- Storage growth is monitored weekly; lifecycle jobs must run to keep cold-tier ratio on target.
- Per-job profitability dashboards are reviewed monthly with product and SRE.
- A monthly cost review compares actuals to forecast; variances are explained and rolled into the next forecast.

---

## 8. Scenario Planning

Planning-stage scenarios to model:
- Provider price increase of 20% — impact on margin and pricing action needed.
- Free-tier conversion rate doubling — infrastructure cost scaling.
- Enterprise deal mix increasing — margin and cash-flow impact.
- Storage retention extended to 3 years — storage cost trajectory.

---

## 9. Future Considerations

- **Dynamic pricing** — credit prices that adjust to provider cost changes with user transparency.
- **Margin-based routing** — route jobs to maximize margin per job, not just minimize cost.
- **Cohort LTV modeling** — per-acquisition-channel LTV for marketing optimization.

---

## Revision History

- 0.1 — Initial revenue & cost analysis (2026-07-09)
