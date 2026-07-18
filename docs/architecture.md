# STRIKE GEN AI — Architecture Overview

This document is the entry point for architecture at STRIKE GEN AI. The detailed system architecture lives in [System Architecture](system-architecture.md), and related planning documents cover security, deployment, and data.

## Related Documents

- [System Architecture](system-architecture.md) — components, data flow, workflows.
- [Security Architecture](security-architecture.md) — threat model, auth, RBAC.
- [Deployment Strategy](deployment-strategy.md) — environments, CI/CD, rollback.
- [Database Design](database-design.md) — logical data model and entities.
- [Observability](observability.md) — metrics, logs, traces, alerts.

## At a Glance

- **Frontend surfaces:** landing site, creator dashboard, admin dashboard.
- **Backend:** API/orchestration layer, auth service, worker pools, job queue.
- **Storage:** object storage + CDN for media, relational store for metadata.
- **External integrations:** AI providers (video/image/audio), payment processor, email service.

All external integrations are accessed through adapter interfaces so providers can be swapped without touching core logic. The architecture is intentionally technology-agnostic at the planning stage; implementation choices are deferred.
