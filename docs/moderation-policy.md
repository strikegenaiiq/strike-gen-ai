# STRIKE GEN AI — Moderation Policy

Version: 0.1

Effective Date: 2026-07-09

Author: STRIKE GEN AI Trust & Safety Team

---

## 1. Overview

This policy defines what content is permitted on STRIKE GEN AI and how violations are enforced. It applies to prompts, generated assets, projects, and user behavior. This is a planning-stage document aligned with the [Terms of Service](terms-of-service.md).

See also:
- [Terms of Service](terms-of-service.md) §5 — acceptable use.
- [Admin Dashboard](admin-dashboard.md) §3.4 — moderation tools.
- [Security Architecture](security-architecture.md) — abuse detection.

---

## 2. Principles

- We support creative expression within the bounds of law and safety.
- We use a combination of automated detection and human review.
- Enforcement is proportionate to severity and harm.
- Users receive notice and an opportunity to appeal, except where immediate removal is required by law.

---

## 3. Prohibited Content

Users must not generate, upload, or distribute:

1. **Illegal content** — anything illegal in the user's or our operating jurisdiction.
2. **Sexual content involving minors** — zero tolerance; reported to authorities.
3. **Non-consensual intimate imagery** — including real or realistic depictions.
4. **Hate and harassment** — content promoting hatred or targeting individuals or groups.
5. **Violence and incitement** — content inciting or depicting severe violence.
6. **Dangerous activity** — instructions for weapons, self-harm, or imminent harm.
7. **Deceptive content** — deepfakes intended to deceive about real people, fraud, or disinformation.
8. **IP infringement** — content that infringes copyrights, trademarks, or other rights.
9. **Personal data** — content exposing others' private information without consent.
10. **Spam and abuse** — mass-generated low-quality or abusive content.

---

## 4. Enforcement Actions

| Severity | Action |
|---|---|
| Minor / first offense | Warning; content removed |
| Repeated or moderate | Temporary generation suspension; content removed |
| Severe | Account suspension; content removed |
| Zero-tolerance (e.g., CSAM) | Immediate permanent ban; legal report |

Actions are recorded in `admin_actions` and, where applicable, the user is notified with the reason and a reference to this policy.

---

## 5. Detection

- **Pre-generation:** prompts are screened by provider policy filters; rejected prompts return `content_policy_violation` (see [Error Handling](error-handling.md)).
- **Post-generation:** outputs are scanned by automated detectors; flagged outputs are held for review before delivery.
- **User reports:** users can report assets or projects; reports enter the moderation queue.
- **Proactive review:** high-volume or high-risk accounts may receive periodic review.

---

## 6. Appeals

- Users may appeal a moderation action within 30 days.
- Appeals are reviewed by a moderator who did not take the original action.
- If the appeal is upheld, the action is reversed and the user is notified.
- Appeal outcomes are final unless new information emerges.

---

## 7. Reporting Channels

- In-product report button on assets and projects.
- Support email for off-platform concerns.
- Emergency channels (e.g., credible threats) route to Trust & Safety on-call.

---

## 8. Transparency

- We publish periodic transparency reports summarizing enforcement volumes and categories.
- Aggregate moderation metrics are included in admin analytics (see [Analytics & Reporting](analytics-and-reporting.md)).
- Individual enforcement details are shared only with the affected user.

---

## 9. Law Enforcement

- We respond to valid legal requests for information, narrowly scoped.
- Emergency disclosures are made where permitted by law to prevent imminent harm.
- All law enforcement interactions are logged and reviewed by legal counsel.

---

## 10. Changes to This Policy

Material changes are published with at least 14 days' notice. The revision history is maintained below.

---

## Revision History

- 0.1 — Initial moderation policy (2026-07-09)
