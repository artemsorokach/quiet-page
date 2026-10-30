# Vendored ECC rules

Source: https://github.com/affaan-m/ECC — version 2.2.3, commit 91b5f6a371f7b06d2c3e0c208147c559e11f022c
(2026-10-29). License: MIT (see `LICENSE`).

Copied unchanged:
- `common/`: coding-style, code-review, development-workflow, git-workflow, patterns, security, testing
- `web/`: coding-style, design-quality, patterns, performance, security, testing
- `typescript/`: coding-style, patterns, security, testing
- `react/`: coding-style, patterns, security, testing (Preact follows the same patterns)

Left out on purpose: `common/agents.md`, `common/hooks.md`, `common/performance.md` (Claude Code
harness and model settings, not about this app), `*/hooks.md`.

Skills copied to `.claude/skills/`: accessibility, frontend-a11y, i18n-sync, tdd-workflow,
security-review, verification-loop, architecture-decision-records, make-interfaces-feel-better,
design-system.

To update: compare with a newer ECC release and copy the same files; record the new version here.
