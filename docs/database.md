# STRIKE GEN AI — Database

This document is the entry point for data modeling at STRIKE GEN AI. The detailed logical schema, entity dictionary, ER diagram, and indexing/retention guidance live in [Database Design](database-design.md).

## Related Documents

- [Database Design](database-design.md) — full logical data model.
- [API Specification](api-specification.md) — endpoint contracts that read/write these entities.
- [AI Pricing & Credit System](ai-pricing-and-credit-system.md) — credit ledger semantics.
- [Backup & Recovery](backup-recovery.md) — backup strategy and RTO/RPO.

## Core Entities (Summary)

- **Users & Profiles** — canonical identity and display preferences.
- **Projects & Assets** — logical grouping and media file metadata.
- **AI Generations** — append-only job records and lifecycle.
- **Credits & Credit Transactions** — append-only ledger of credit movements.
- **Subscription Plans & User Subscriptions** — plan catalog and per-user lifecycle.
- **Payments & Invoices** — payment attempts and billing documents.
- **Notifications** — user-facing event notifications.
- **Activity Logs & Admin Actions** — high-volume events and immutable admin audit.

## Key Principles

- Append-only ledgers for credits, payments, and admin actions.
- Soft-delete and anonymization for user data; never cascade-delete financial audit records.
- JSON fields for flexible provider metadata; validate schema at the application layer.
- UTC timestamps and `created_at`/`updated_at` on all mutable entities.
