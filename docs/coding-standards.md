# STRIKE GEN AI — Coding Standards

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI Engineering Team

---

## 1. Overview

This document defines the coding standards for STRIKE GEN AI. It complements the [Contributing Guidelines](contributing.md) and the existing project coding guidance. The goal is consistency, readability, and safety across the codebase.

---

## 2. General Principles

- **Match the codebase.** Before writing, look at neighboring files and follow their conventions. A change that looks like the surrounding code is almost always better than one that imposes outside taste.
- **Reuse before adding.** Search for existing utilities and types before introducing new ones. Duplicate logic drifts and hides bugs.
- **Small, focused changes.** One logical change per PR. Avoid mixing refactors with feature work.
- **No dead code.** Delete what a change replaces; do not leave commented-out blocks or `_old` variants.
- **No half-finished implementations.** Ship a complete flow or none of it.

---

## 3. File Organization

- Organize by cohesion: things that change together belong together.
- One clear purpose per file. A long file with a single coherent purpose is fine; a short file mixing concerns is not.
- Place new files where a reader would expect them based on the existing directory structure.
- Export only what callers need; keep internal helpers unexported.

---

## 4. Naming

- Use clear, descriptive identifiers; avoid abbreviations except established domain terms.
- Functions and variables: `camelCase` in JS/TS, `snake_case` in Python and SQL.
- Types and classes: `PascalCase`.
- Constants: `SCREAMING_SNAKE_CASE` or the language convention.
- Booleans read as questions: `isLoading`, `hasCredits`.

---

## 5. Comments

- Default to no comments. Code should explain itself through naming.
- A comment is justified only when the **why** is non-obvious: a hidden constraint, a subtle invariant, a workaround for a specific bug.
- Never write comments that restate what the code does.
- Never reference the current task, PR, or caller (`// added for issue #123`); that belongs in the PR description and rots over time.
- One short line max. No multi-paragraph comment blocks or docstrings.

---

## 6. Error Handling

- Check results before using them. Do not assume I/O succeeded.
- Handle error and empty cases explicitly.
- Surface visible error states rather than letting undefined values reach the UI.
- Validate at system boundaries (user input, external APIs); trust internal contracts.
- Do not add error handling for scenarios that cannot happen.
- Never swallow errors silently; at minimum log with context.

---

## 7. Security

- Never build commands or queries from untrusted input via string concatenation.
- Sanitize and escape user input rendered to HTML.
- Never log secrets, tokens, or full card numbers; mask sensitive fields at the logging layer.
- Use parameterized queries for all database access.
- Apply least privilege in access checks; default-deny.
- Validate webhook signatures and idempotency on external callbacks.

See [Security Architecture](security-architecture.md) for the full model.

---

## 8. Dependencies

- Verify the project actually depends on a library before using it (check the manifest).
- Prefer maintained, widely-used packages.
- Pin versions; avoid unbounded ranges.
- Review new dependencies for transitive supply-chain risk.

---

## 9. Testing

- Write tests for new behavior and update tests for changed behavior.
- Tests should be meaningful and cover error/edge cases, not just pad coverage.
- Prefer pure functions for testable business logic (credit calculations, validation).
- Do not test framework behavior; test our code.
- Name tests by behavior: `deductsCreditsOnJobCompletion`, not `testCredit1`.

See [Testing Strategy](testing-strategy.md) for the full strategy.

---

## 10. Formatting

- Follow the formatter configured for the project (Prettier/ESLint for TS; Black/Ruff for Python).
- 2-space indentation in TS/JS unless the project config says otherwise.
- Lines under 120 characters where practical.
- End files with a newline.
- No trailing whitespace.

---

## 11. Version Control

- Branch names are descriptive: `feat/video-generation`, `docs/add-api-versioning`, `fix/credit-refund`.
- Commit messages in imperative mood, first line ≤ 72 characters.
- Keep PRs focused; one logical change per PR.
- Do not force-push after review starts unless asked.

See [Contributing Guidelines](contributing.md) for the full PR process.

---

## 12. Accessibility

- Use semantic HTML; prefer native elements over ARIA.
- Ensure keyboard operability and visible focus.
- Maintain 4.5:1 text contrast; 3:1 for large text.
- Provide alt text for meaningful images.
- Respect `prefers-reduced-motion`.

See [UI/UX Design System](ui-ux-design-system.md) §23 for the full guidelines.

---

## 13. Performance

- Avoid N+1 queries; fetch related data in batches.
- Paginate list endpoints; do not return unbounded collections.
- Cache where appropriate, but measure first — do not cache speculatively.
- Push expensive work to background jobs; keep API responses fast.

---

## 14. Review Checklist

Reviewers confirm:
- [ ] Matches stated scope; no scope creep.
- [ ] Reuses existing utilities where applicable.
- [ ] Correct, including error and empty cases.
- [ ] No security issues (injection, XSS, secrets in logs).
- [ ] Tests are meaningful and pass.
- [ ] No dead code or half-finished implementations.
- [ ] Naming is clear; comments justify the *why* only.

---

## Revision History

- 0.1 — Initial coding standards (2026-07-09)
