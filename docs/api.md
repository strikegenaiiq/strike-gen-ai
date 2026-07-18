# STRIKE GEN AI — API Design (Planning Document)

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI API Team

---

## 1. Overview

This document is the entry point for API design at STRIKE GEN AI. It summarizes conventions, links to related API specifications, and defines the shared contracts every endpoint must follow. The detailed endpoint catalog lives in the [API Specification](api-specification.md).

Scope:
- Establish canonical request/response formats, error model, and versioning policy.
- Define authentication and authorization expectations shared across endpoints.
- Provide references to rate limiting, pagination, and lifecycle documents.

Out of scope:
- Vendor-specific SDK examples or implementation-level code.
- Detailed endpoint payloads — see [API Specification](api-specification.md).

---

## 2. Design Principles

- Resource-oriented: use nouns and standard HTTP verbs (GET, POST, PUT/PATCH, DELETE).
- Consistency: uniform request/response shapes, predictable error format, shared headers.
- Idempotency: support `Idempotency-Key` for POST endpoints that create resources or charge payments.
- Minimal surface: expose only what MVP needs; extend behind feature flags.
- Security-first: least privilege, PII protection, audit sensitive actions.
- Versioning: backward-compatible changes only within a major version; breaking changes require a new major version.

---

## 3. Shared Contracts

Base URL (planning): `https://api.strikegen.ai/v{version}/`

Protocol: HTTPS only.

Payload format: `application/json` for request and response bodies.

Standard request headers:
- `Authorization: Bearer <access_token>` — required for protected endpoints.
- `Content-Type: application/json` — for request bodies.
- `Accept: application/json` — expected response format.
- `Idempotency-Key: <uuid>` — recommended for POST operations that create or charge.
- `X-Request-Id: <uuid>` — optional; server echoes for correlation.

Standard response headers:
- `X-Request-Id` — always present; use for support correlation.
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` — on rate-limited responses.

---

## 4. Error Model

All errors use a consistent envelope:

```json
{
  "error": {
    "code": "string_code",
    "message": "Human readable message",
    "details": { "field": "reason" },
    "request_id": "uuid-or-string"
  }
}
```

Status code semantics:
- `200 OK` — successful GET/PUT/PATCH
- `201 Created` — successful resource creation
- `202 Accepted` — async job accepted
- `204 No Content` — successful delete or empty body
- `400 Bad Request` — validation error
- `401 Unauthorized` — missing/invalid credentials
- `403 Forbidden` — insufficient privileges
- `404 Not Found` — resource not found
- `409 Conflict` — idempotency or unique constraint violation
- `422 Unprocessable Entity` — semantic validation error
- `429 Too Many Requests` — rate limit exceeded
- `500 Internal Server Error` — uncaught server error

See [Error Handling](error-handling.md) for the full error code catalog and recovery guidance.

---

## 5. Authentication & Authorization

- Bearer tokens (JWT or opaque) issued by the Auth Service.
- API keys / scoped service tokens for server-to-server and admin operations.
- RBAC roles: `user`, `admin`, `finance`, `support`.
- Resource scoping: users can only access resources they own; admins have elevated scopes.
- Token scopes may include `read:assets`, `write:billing`, etc.

See the Auth section of the [API Specification](api-specification.md) and the [Security Architecture](security-architecture.md) for the full model.

---

## 6. Common Patterns

Pagination:
- Cursor-based pagination for large datasets; `page`/`limit` for simple lists.
- Response envelope: `next_cursor`, `prev_cursor`, `page_size`, `total_count` (optional).

Filtering:
- Query params for common filters, e.g. `?status=completed&kind=video`.
- Multi-value filters supported, e.g. `?tags=promo,holiday`.

Sorting:
- `?sort=created_at:desc` or `?sort=cost:asc`.

Idempotency:
- `Idempotency-Key` header for POST endpoints that create resources or charge payments; server stores result for 24h.

---

## 7. Related Documents

- [API Specification](api-specification.md) — full endpoint catalog.
- [API Versioning](api-versioning.md) — versioning policy and deprecation.
- [API Rate Limits](api-rate-limits.md) — throttling tiers and headers.
- [Error Handling](error-handling.md) — error code catalog and recovery.
- [Security Architecture](security-architecture.md) — auth, RBAC, and secrets.

---

## Revision History

- 0.1 — Initial API design overview (2026-07-09)
