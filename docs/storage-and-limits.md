# STRIKE GEN AI — Storage & Limits

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI Engineering & Product Team

---

## 1. Overview

This document defines asset storage policies, per-plan limits, and lifecycle rules. It governs how generated and uploaded media is stored, tiered, and expired. It is a planning-stage document; numbers are illustrative.

See also:
- [Subscription Plans](subscription-plans.md) — plan entitlements.
- [Database Design](database-design.md) §4.4 — assets entity.
- [Backup & Recovery](backup-recovery.md) — asset backup strategy.

---

## 2. Storage Tiers

| Tier | Use | Cost | Access |
|---|---|---|---|
| Hot | Recently generated, frequently accessed | Highest | Fast CDN |
| Warm | Older but still retained | Medium | CDN with longer latency |
| Cold (archive) | Retained for compliance or user request | Lowest | On request, minutes to restore |

Lifecycle moves objects between tiers automatically based on age and access patterns.

---

## 3. Per-Plan Limits

| Plan | Asset retention | Max asset size | Max assets per project | Storage total |
|---|---|---|---|---|
| Free | 30 days | 50 MB | 20 | 1 GB |
| Creator | 90 days | 200 MB | Unlimited | 10 GB |
| Pro | 1 year | 500 MB | Unlimited | 100 GB |
| Enterprise | Custom | Custom | Unlimited | Custom |

Assets exceeding the retention window are moved to cold archive and eventually deleted unless the user extends retention (a future paid option).

---

## 4. Lifecycle Rules

1. **Day 0–30:** all assets in hot tier.
2. **Day 31–90:** assets not accessed in 14 days move to warm.
3. **Beyond plan retention:** assets move to cold archive for a 30-day grace period, then are permanently deleted.
4. **Before deletion:** users receive an email warning 7 days in advance with an option to extend (paid plans) or download.

Deleted assets are soft-deleted first (tombstone record) for 30 days, then permanently removed from storage.

---

## 5. Quota Enforcement

- Uploads and generations are rejected when the user exceeds their storage total or per-asset size limit.
- The error includes the limit and the user's current usage.
- Enterprise customers may purchase additional storage as an add-on.

---

## 6. Upload Limits

- Accepted media types: video (mp4, webm), image (png, jpg, webp), audio (mp3, wav).
- Max upload size: per-plan limit above.
- Virus/malware scanning runs before an uploaded asset is marked available.
- Invalid or unsafe files are rejected and logged.

---

## 7. Access and Delivery

- Assets are served via signed, time-limited URLs; they are never publicly accessible by default.
- CDN caches hot-tier assets for fast delivery; cache invalidates on update or delete.
- Download endpoints require authentication and ownership verification.
- Public sharing (future) creates an explicit, revocable share URL opt-in by the user.

---

## 8. Cost Management

- Storage growth is monitored weekly; the cold-tier ratio is a key metric (see [Revenue & Cost Analysis](revenue-and-cost-analysis.md)).
- Lifecycle jobs run daily to move objects between tiers per the rules above.
- A quarterly review adjusts thresholds if storage cost deviates from forecast.

---

## 9. Data Export

- Users may export their assets and project metadata before deletion or at any time (see [Privacy Policy](privacy-policy.md) §7).
- Exports are packaged and delivered via a time-limited download link.
- Export requests are rate-limited to prevent abuse.

---

## 10. Future Considerations

- **User-configurable retention** per project or per asset.
- **Storage add-ons** for paid plans.
- **Dedicated CDN for Enterprise** with custom domains.
- **Edge replication** for global low-latency delivery.

---

## Revision History

- 0.1 — Initial storage & limits (2026-07-09)
