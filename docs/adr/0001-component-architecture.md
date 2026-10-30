# ADR 0001: Component architecture for v2

- Status: accepted
- Date: 2026-10-30

## Context

The demo is one 240 KB `index.html` with global functions, inline translations, the Firebase compat SDK
from a CDN, no tests and manual uploads to GitHub. Quiet Page is meant to become a long-lived product
maintained mostly by one person with Claude.

## Decision

- **Vite + TypeScript (strict) + Preact.** Preact keeps the React component model (ECC React rules apply)
  at about 4 KB, which matters on phones.
- **Modular Firebase SDK** bundled by Vite (only Auth and Firestore parts that are used).
- **Folders by role:** `features/` (screens), `ui/` (shared components), `core/` (crypto, store, i18n, theme).
- **Entry repository interface** with local and cloud implementations; screens do not know where entries live.
  Cloud loads entries by month instead of all at once (Firestore read limits).
- **Translations** as one JSON file per language; a test checks that all languages have the same keys.
- **Tests:** `node:test` + `tsx` for units (no test framework dependency); Playwright with a fake Firebase
  for main flows; axe for accessibility.
- **GitHub Actions:** typecheck, tests and build on every push; later also deploy to GitHub Pages and
  Firestore rules.

## Alternatives considered

- Keep a single HTML file: simplest to host, but hard to test and change safely.
- React: same model, ~10× larger runtime.
- Svelte / Lit: good options, but no ECC rules and less familiar to future contributors.

## Consequences

- A build step is needed; deploy moves from "upload files" to GitHub Actions.
- The legacy site stays in `legacy/` until v2 replaces it on `main`.
