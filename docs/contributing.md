# STRIKE GEN AI — Contributing Guidelines

Version: 0.1

Date: 2026-07-09

Author: STRIKE GEN AI Team

---

## 1. Welcome

Contributions to STRIKE GEN AI are welcome. During the planning stage, contributions are primarily documentation, design proposals, and reviews. Once implementation begins, code contributions will follow the same review principles with additional CI gates.

---

## 2. Code of Conduct

- Be respectful and constructive in all discussions.
- Assume good intent; ask clarifying questions before criticizing.
- Focus critique on the work, not the person.
- Disagreements are fine; personal attacks are not.

---

## 3. How to Contribute

### Documentation Changes
1. Open an issue describing the change or gap.
2. Submit a pull request referencing the issue.
3. Ensure markdown renders correctly and links resolve.
4. Match the style of neighboring documents (version/date header, revision history).

### Design Proposals
1. Open an issue with the "design" label summarizing the proposal.
2. Attach or link supporting diagrams where helpful.
3. Allow review time before implementation.

### Code Changes (post-implementation)
1. Open an issue for anything beyond a trivial fix.
2. Keep pull requests focused — one logical change per PR.
3. Include tests for new behavior and update tests for changed behavior.
4. Ensure CI passes before requesting review.

---

## 4. Pull Request Process

1. Branch from the default branch; name branches descriptively (`docs/add-api-versioning`, `feat/video-generation`).
2. Write a clear PR description: what, why, and how it was tested.
3. Link related issues.
4. Request review from at least one maintainer.
5. Address review feedback with new commits; avoid force-pushing after review starts unless asked.
6. Maintainers merge; squash-merge is the default for a clean history.

---

## 5. Commit Messages

- Use the imperative mood: "Add video generation endpoint" not "Added".
- First line ≤ 72 characters.
- Optional body explaining motivation and trade-offs.
- Reference issues on a separate line: `Refs #123`.

---

## 6. Coding Standards

See [Coding Standards](coding-standards.md) for the full set. Key points:
- Match the conventions of neighboring code.
- Reuse existing utilities before adding new ones.
- No half-finished implementations or dead code.
- Validate at system boundaries; trust internal contracts.

---

## 7. Review Principles

Reviewers should check:
- Does the change match stated scope? Flag scope creep.
- Is it correct, including error and empty cases?
- Does it reuse existing patterns where applicable?
- Are tests meaningful, not just coverage-padding?
- Is the change safe (no injection, XSS, secrets in logs)?

Authors should expect:
- Questions about alternatives considered.
- Requests for tests or edge-case handling.
- Suggestions to simplify before adding abstraction.

---

## 8. Issue Reporting

- Search existing issues before opening a new one.
- Include: summary, steps to reproduce (for bugs), expected vs actual, and environment notes.
- Use labels: `bug`, `docs`, `design`, `enhancement`, `question`.

---

## 9. Style and Formatting

- Markdown for all documentation.
- 2-space indentation in docs; match neighboring code for source files.
- Keep lines under 120 characters where practical.
- End files with a newline.

---

## 10. Licensing

By contributing, you agree that your contributions are licensed under the project's MIT License.

---

## Revision History

- 0.1 — Initial contributing guidelines (2026-07-09)
