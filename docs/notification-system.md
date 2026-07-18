# STRIKE GEN AI — Notification System

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI Product Team

---

## 1. Overview

The notification system delivers timely, relevant messages to users across in-app, email, and (future) webhook channels. This document defines event types, channels, preferences, delivery semantics, and retry. It is a planning-stage document.

See also:
- [User Flows](user-flows.md) §10 — notification flow.
- [API Specification](api-specification.md) §Notifications.
- [Database Design](database-design.md) §4.12.

---

## 2. Channels

| Channel | Use | Examples |
|---|---|---|
| In-app | Ephemeral and persistent UI notifications | Toast on save, notifications center |
| Email | Out-of-band events | Generation complete, billing issues, receipts |
| Webhook (future) | Partner integrations | Job status for external systems |

---

## 3. Event Types

| Type | Trigger | Default channels |
|---|---|---|
| `generation_completed` | A generation job finishes successfully | In-app, email |
| `generation_failed` | A generation job fails | In-app, email |
| `credit_low` | Balance crosses warning threshold | In-app, email |
| `credit_exhausted` | Balance reaches zero | In-app, email |
| `payment_succeeded` | A payment succeeds | Email (receipt) |
| `payment_failed` | A payment fails | In-app, email |
| `subscription_renewed` | Subscription renews | Email |
| `subscription_canceled` | User cancels | In-app, email |
| `billing_reminder` | Renewal upcoming | Email |
| `announcement` | Admin platform-wide message | In-app, email |
| `admin_action` | Admin acted on user's account | In-app, email |

---

## 4. Preferences

Users can opt out of non-essential notifications per channel. Essential notifications cannot be disabled:
- `payment_failed`, `subscription_canceled`, `admin_action` are always sent.

Preference shape (see API `/notifications/preferences`):

```json
{
  "email": {
    "generation_completed": true,
    "generation_failed": true,
    "credit_low": true,
    "billing_reminder": true,
    "announcement": false
  },
  "in_app": {
    "generation_completed": true,
    "announcement": true
  }
}
```

---

## 5. Delivery Semantics

- Notifications are created as rows in `notifications` with `status = pending`.
- A worker picks up pending notifications and dispatches to the selected channels.
- On successful dispatch, `status = sent` and `sent_at` is recorded.
- On failure, `status = failed` and a retry is scheduled with exponential backoff.
- After max retries (default 3), `status = failed` is final and surfaced to ops via metrics.

---

## 6. Retry Strategy

- Retry backoff: 1 min, 5 min, 30 min.
- Max retries: 3.
- Retries are idempotent per notification ID; duplicate sends are deduped on the channel provider's message ID.

---

## 7. Digest and Batching

To avoid notification fatigue:
- `credit_low` fires once per threshold crossing, not on every balance change.
- `generation_completed` is batched when many jobs finish within a short window for users with high throughput (Pro/Enterprise): a single email summarizes multiple completions.
- Digest mode (daily summary) is a future preference option.

---

## 8. Email Specifics

- Transactional emails use branded templates with plain-text fallbacks.
- Unsubscribe links are included for non-essential categories; essential emails note why unsubscribe is disabled.
- Bounces and complaints are fed back to mark emails undeliverable and suppress future sends to that address.

---

## 9. In-App Specifics

- Toasts appear for ephemeral confirmations (copied, saved) and dismiss on timeout or user action.
- The notifications center lists persistent notifications with read/unread state.
- Unread count is surfaced in the nav bell icon.

---

## 10. Templates

- Templates are versioned; a change creates a new template version rather than mutating the live one.
- Template variables are validated before render; missing variables fail the notification and log an error rather than sending a broken email.
- Templates are reviewed for accessibility (alt text, color contrast, readable on mobile).

---

## 11. Observability

- Metrics: notifications created, sent, failed per type and channel.
- Alerts: spike in failed sends (email provider issue), spike in bounce rate.
- Logs: per-notification lifecycle with `notification_id` and `user_id`.

---

## 12. Future Considerations

- **Push notifications** for mobile apps.
- **Webhook channel** for partner integrations with signed payloads.
- **User-defined triggers** (e.g., notify when a specific project's job completes).
- **Localization** of templates per user language preference.

---

## Revision History

- 0.1 — Initial notification system (2026-07-09)
