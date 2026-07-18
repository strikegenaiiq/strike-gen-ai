# STRIKE GEN AI — API Versioning

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI API Team

---

## 1. Overview

This document defines how the STRIKE GEN AI API is versioned, what constitutes a breaking change, and the deprecation lifecycle. It supports the [API Specification](api-specification.md).

See also:
- [API](api.md) — shared contracts and error model.
- [API Rate Limits](api-rate-limits.md) — throttling.

---

## 2. Versioning Scheme

- Versions are major-only and appear in the URL path: `/v1/`, `/v2/`.
- The major version increments only for backward-incompatible changes.
- Minor and patch changes (backward-compatible) do not change the URL; they are deployed in place.
- There is at most one supported major version in development at a time; the previous major version is supported during its deprecation window.

---

## 3. What Is a Breaking Change

Breaking (requires new major version):
- Removing a field from a response.
- Changing a field's type or semantics.
- Changing a status code's meaning.
- Making a previously optional field required.
- Changing error code semantics.
- Removing an endpoint.
- Tightening validation that rejects previously valid input.

Non-breaking (deployed in place):
- Adding a new optional request field.
- Adding a new response field.
- Adding a new endpoint.
- Loosening validation.
- Adding a new error code.
- Performance improvements.

---

## 4. Deprecation Policy

When a breaking change is introduced:
1. The new major version is released alongside the current one.
2. The current version is marked deprecated with a `Sunset` header and documented migration guide.
3. Deprecation is announced at least **90 days** in advance for minor breaking changes and **180 days** for major structural changes.
4. During the deprecation window, both versions are supported and monitored.
5. At end of life, the deprecated version returns `410 Gone` with a pointer to the migration guide.

---

## 5. Deprecation Headers

Deprecated endpoints return:
- `Deprecation: true` — marks the version as deprecated.
- `Sunset: <HTTP-date>` — the planned removal date.
- `Link: <https://docs.strikegen.ai/api/migration>; rel="deprecation"` — migration guide.

---

## 6. Client Guidance

- Clients should consume response fields defensively: ignore unknown fields rather than erroring.
- Clients should not depend on field ordering in JSON responses.
- Clients should handle new error codes gracefully by falling back to the `message` field.
- Pinning to a major version is expected; pinning to exact responses is not supported.

---

## 7. Version Lifecycle

| Stage | Meaning |
|---|---|
| `current` | The active, recommended version. |
| `deprecated` | Supported but scheduled for removal; headers and docs warn. |
| `sunset` | Removed; returns `410 Gone`. |

At most two stages are live simultaneously: `current` and `deprecated`.

---

## 8. Experimental Endpoints

- Endpoints under `/v{version}/experimental/` are not subject to the deprecation policy.
- They may change or be removed without notice.
- They are intended for feedback and must not be used in production integrations.

---

## 9. Future Considerations

- **Header-based versioning** negotiation for partners who cannot change URL paths.
- **Long-term support (LTS)** versions for enterprise customers with contractual stability needs.
- **Changelog feed** per version for automated client update tooling.

---

## Revision History

- 0.1 — Initial API versioning (2026-07-09)
