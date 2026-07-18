# STRIKE GEN AI — Admin Dashboard

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI Product Team

---

## 1. Overview

The admin dashboard is the operational interface for platform administrators, finance, and support staff. It provides oversight and action tools for users, billing, content, and system health. This is a planning-stage document defining sections, permissions, and audit requirements.

See also:
- [API Specification](api-specification.md) §Admin.
- [Security Architecture](security-architecture.md) — RBAC and admin audit.
- [Analytics & Reporting](analytics-and-reporting.md) — metrics definitions.

---

## 2. Roles and Access

| Role | Access |
|---|---|
| Admin | All sections: users, billing, content, system |
| Finance | Billing and refund actions; user view (read-only) |
| Support | User view and activity; no billing or content takedown |
| SRE | System health and logs; no user PII without break-glass |

All admin actions are recorded in `admin_actions` with the actor, action, target, and reason. Access is granted via RBAC and reviewed quarterly.

---

## 3. Sections

### 3.1 Users
- Search by email, user ID, status, plan.
- View user profile, subscription, credit balance, recent activity.
- Actions: suspend, reactivate, adjust credits, change role (admin only).
- Every action requires a reason note and is audited.

### 3.2 Subscriptions & Billing
- List subscriptions by status and plan.
- View billing history per user.
- Process refunds (finance role); requires reason; audited.
- View dunning status and failed payments.

### 3.3 Credits
- Adjust a user's credits (grant or deduct) with reason.
- View credit transaction history per user.
- Bulk promotional credit grants to a segment (with approval).

### 3.4 Content Moderation
- Queue of flagged assets and projects.
- Review asset, context (prompt, project), and user history.
- Actions: dismiss flag, remove asset, suspend user for policy violation.
- Removals soft-delete the asset and notify the user per the [Moderation Policy](moderation-policy.md).

### 3.5 Analytics & Reporting
- KPI dashboards (see [Analytics & Reporting](analytics-and-reporting.md)).
- Export reports (CSV/JSON) for finance and product.
- Cohort and funnel views for retention and conversion.

### 3.6 System Health
- Service status and SLI summary.
- Recent deploys and feature flag state.
- Integration status (AI providers, payments, email).
- On-call handoff and active incidents (read-only link to the incident channel).

---

## 4. Audit and Accountability

- Every mutating admin action writes to `admin_actions` with `admin_id`, `action_type`, `target`, `reason`, and `metadata`.
- Admin actions are immutable; corrections are new actions, not edits.
- High-impact actions (refund, user suspend, content takedown) require a second admin approval before execution.
- Admin access logs are reviewed monthly; anomalous access triggers a security review.

---

## 5. Safety Rails

- Destructive actions (delete user, bulk credit revoke) are gated behind confirmation and, where configured, two-person approval.
- Bulk operations (mass credit grant, mass email) have rate limits and a dry-run preview.
- No admin can elevate their own role; role changes require a peer admin.
- Break-glass access to production data is time-boxed and auto-logged.

---

## 6. Notifications to Admins

- System health alerts route to the on-call rotation, not the admin dashboard.
- Policy-relevant events (large refund, bulk operation, role change) post to an admin notifications channel.
- The dashboard surfaces a bell icon with admin-relevant notifications (e.g., "3 refunds pending approval").

---

## 7. Future Considerations

- **Role-based dashboards** — customized default view per role.
- **Saved views and shared reports** for recurring investigations.
- **Admin API** for programmatic management by enterprise customers.
- **Audit log export** for compliance reviews.

---

## Revision History

- 0.1 — Initial admin dashboard (2026-07-09)
