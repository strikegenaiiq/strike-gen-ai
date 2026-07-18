# STRIKE GEN AI — Deployment

This document is the entry point for deployment at STRIKE GEN AI. The detailed environment definitions, CI/CD pipeline, release/rollback strategy, and operational responsibilities live in [Deployment Strategy](deployment-strategy.md).

## Related Documents

- [Deployment Strategy](deployment-strategy.md) — full strategy document.
- [Observability](observability.md) — monitoring and alerting.
- [Backup & Recovery](backup-recovery.md) — backup and restore procedures.
- [Operations Runbook](operations-runbook.md) — common operational procedures.
- [Incident Response](incident-response.md) — incident handling.

## Environments

- **Local Development** — trimmed services and mocks; no production data.
- **Testing (CI)** — ephemeral, synthetic data, no real payments.
- **Staging** — production-like, sandbox integrations, UAT.
- **Production** — live traffic, strict access control, audit logging.

## Release Approach

- Canary releases with metric-based promotion; blue-green for major releases.
- Feature flags control new feature exposure in production.
- Expand-contract database migrations; never destructive schema changes in the same release as code that depends on them.
- Rollback triggers defined on error rate, latency, job failures, and payment errors.
