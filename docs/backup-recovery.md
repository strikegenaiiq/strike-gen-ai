# STRIKE GEN AI — Backup & Recovery

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI SRE Team

---

## 1. Overview

This document defines the backup strategy, recovery objectives, restore procedures, and testing cadence for STRIKE GEN AI. It is a planning-stage document; implementation-specific tooling is deferred.

See also:
- [Database Design](database-design.md) — which data classes exist.
- [Deployment Strategy](deployment-strategy.md) §10 — high-level backup goals.
- [Incident Response](incident-response.md) — recovery during incidents.

---

## 2. Recovery Objectives

| Data class | RPO | RTO |
|---|---|---|
| Relational metadata (users, billing, credits, generations) | 15 min | 1 hour |
| Asset storage (media) | 1 hour | 4 hours |
| Configuration & secrets | 24 hours | 30 min |
| Audit logs | 1 hour | 2 hours |

RPO = maximum acceptable data loss. RTO = maximum acceptable downtime to restore.

---

## 3. What Is Backed Up

- **Relational database:** full daily snapshot + continuous incremental backups (WAL/binlog streaming). Point-in-time recovery within the RPO.
- **Object storage (assets):** versioning enabled on buckets; cross-region replication for critical tiers. Lifecycle policies move cold objects to archival storage.
- **Configuration:** infrastructure-as-code is version-controlled; runtime configuration (feature flags, plan catalog) is exported daily.
- **Secrets:** secrets live in the secrets manager, not in backups; secrets are rotated per policy rather than restored.
- **Audit logs:** shipped to append-only storage with separate retention from operational logs.

---

## 4. What Is Not Backed Up

- **Ephemeral data:** job queue contents are not backed up — jobs are recoverable from the `ai_generations` table and re-enqueued.
- **Cache data:** caches are rebuilt on restart; no backup needed.
- **Transient logs:** high-volume operational logs beyond retention are not recoverable; audit logs are kept separately.

---

## 5. Backup Storage and Security

- Backups are encrypted at rest.
- Backup storage is in a separate trust boundary from production (different account/region where supported).
- Access to backups is least-privilege and audited; restore permissions are restricted to SRE role.
- Backup integrity is verified by checksum and by periodic restore tests.

---

## 6. Restore Procedures

### Relational Database — Point-in-Time Recovery
1. Declare an incident and notify stakeholders (restore overwrites current data).
2. Identify the target restore time within the RPO window.
3. Provision a new database instance from the most recent snapshot before the target time.
4. Replay incremental logs up to the target time.
5. Validate integrity (row counts, latest records, critical tables).
6. Cut over application traffic to the restored instance.
7. Verify key flows (login, generation, billing) before closing the incident.

### Object Storage — Object Restore
1. Identify the affected objects or bucket.
2. Restore from versioning (if overwritten) or replication (if deleted).
3. Verify object integrity (checksums, size).
4. Confirm asset URLs resolve.

### Configuration Restore
1. Check out the IaC repository at the known-good commit.
2. Apply via the deployment pipeline to a staging environment first.
3. Validate, then promote to production.

---

## 7. Restore Testing

- A restore drill is run **quarterly** against a non-production environment.
- The drill restores the latest snapshot and runs a smoke test suite against it.
- Drill results are recorded: restore time, integrity check outcome, any gaps.
- A failed drill is treated as an incident and fixed before the next quarter.

---

## 8. Retention

| Backup type | Retention |
|---|---|
| Daily DB snapshots | 30 days |
| Weekly DB snapshots | 13 weeks |
| Monthly DB snapshots | 13 months |
| Incremental logs | 7 days (for point-in-time) |
| Object versions | 90 days |
| Audit log archive | 7 years (compliance) |

Retention is reviewed annually against compliance and cost.

---

## 9. Disaster Recovery

For regional failures:
- Fail over to the secondary region using replicated data.
- RTO for regional failover: 4 hours (stretch target 2 hours).
- DR failover is tested annually via a full-region drill.
- The DR plan is documented in the [Operations Runbook](operations-runbook.md) and linked from this document once implementation defines the mechanism.

---

## 10. Responsibilities

- **SRE:** owns backup configuration, monitoring, and restore execution.
- **Security:** owns backup access controls, encryption, and audit.
- **Engineering:** owns application-level validation scripts used in restore drills.
- **Finance/Admin:** owns confirming billing data integrity after a restore.

---

## 11. Future Considerations

- **Continuous backup verification** — automated daily restore-and-test.
- **Cross-cloud backup** for cloud-portability and ransomware resilience.
- **Faster RTO** via warm standby in the secondary region.
- **Granular restore** for individual tables or records without full DB replacement.

---

## Revision History

- 0.1 — Initial backup & recovery (2026-07-09)
