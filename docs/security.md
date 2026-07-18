# STRIKE GEN AI — Security

This document is the entry point for security at STRIKE GEN AI. The detailed threat model, controls, and policies live in [Security Architecture](security-architecture.md).

## Related Documents

- [Security Architecture](security-architecture.md) — full threat model and controls.
- [Privacy Policy](privacy-policy.md) — user-facing privacy commitments.
- [Terms of Service](terms-of-service.md) — user obligations and acceptable use.
- [Moderation Policy](moderation-policy.md) — content rules and enforcement.
- [Incident Response](incident-response.md) — breach handling and escalation.

## Security Goals

- **Confidentiality** — protect sensitive data and secrets.
- **Integrity** — prevent unauthorized modification of data and transactions.
- **Availability** — keep critical services available under load and during incidents.
- **Accountability** — audit trails for security-relevant actions.

## Core Controls (Summary)

- Token-based auth with short-lived access tokens + refresh tokens; RBAC for admin/finance/support.
- TLS for all traffic; encryption at rest for sensitive data and backups.
- Input validation and sanitization on every external input.
- Rate limiting and abuse detection on generation endpoints.
- Webhook signature verification and replay protection.
- Immutable audit logs for admin actions, credit adjustments, and refunds.
- Least-privilege secrets management; no secrets in source control or plaintext config.
