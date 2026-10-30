# Quiet Page — project guide for Claude

Quiet Page («Тиха сторінка») is a calm, private self-reflection journal: free writing, gentle prompt
questions, mood and feelings, a "Path" view over time, and sharing a read-only copy with someone.
Owner: Artem Soroka. Live site: https://artemsorokach.github.io/quiet-page/

## Product principles (non-negotiable)

- **Private by design.** Entries are encrypted on the device before they leave it. Nobody else —
  not Google/Firebase, not the owner in the console — can read them. Never add anything that reads,
  analyses or sends entry text to a server or third party (no analytics on content, no AI on entries).
- **Quiet.** No streaks, scores, badges, guilt, pressure or "you missed a day". Reminders are optional,
  at a time the person picks.
- **Simple.** The person may not open the app for months; returning must not punish them with extra steps.
- **Safety.** A calm "If it's very hard right now" link with verified helpline numbers is reachable from
  every screen. The app is not therapy or diagnosis and never claims to be.
- **Eight languages** (uk, ru, en, fr, de, it, es, pt) with identical keys. Address the user with
  gender-neutral wording in every language (e.g. «Не пам'ятаю пароль», not «Забув пароль»).
- **Audience:** 16+ for the MVP. First the owner and acquaintances, later a wider audience
  (incl. Ukrainian- and Russian-speaking communities in Switzerland).

The audit and prioritized MVP backlog live in the Claude doc "Quiet Page — аудит і план MVP".

## Architecture (v2, branch `v2`)

See `docs/adr/`. In short: Vite + TypeScript (strict) + Preact; folders by role:

- `src/features/` — screens (write, path, share, settings, auth/keys)
- `src/ui/` — shared components (Button, Field, Sheet, MoodScale, Feelings, Calendar, Toast)
- `src/core/` — services: `crypto` (envelope encryption), `store` (entry repository: local / cloud),
  `i18n` (JSON per language), `theme` (design tokens)
- `legacy/` — the current single-file site (reference only; still what GitHub Pages serves from `main`)

## Data compatibility (do not break)

Firestore, project `quiet-page`:
- `users/{uid}.keyring = {v:2, kid, pw:{salt,iter,iv,ct}, rc:{salt,iter,iv,ct}}` — the random data key
  (DEK, AES-GCM 256) wrapped by PBKDF2-SHA-256 (600 000 iterations) keys from the password and the
  recovery code.
- `users/{uid}/entries/{id} = {ts, v:2, iv, ct}` — entry JSON encrypted with the DEK.
- Legacy v1 (`users/{uid}.salt/check`, entries `v:1`, key = PBKDF2 310 000 from the password) is migrated
  on first unlock. Keep the migration path working.
- Recovery code: 28 Crockford base32 chars shown as `XXXX-XXXX-…`; input is normalised (O→0, I/L→1, U→V).
- On-device: IndexedDB `quiet-page` / `keys` / `dev:{uid}` holds the non-extractable DEK plus a copy of
  the raw DEK wrapped by a non-extractable device key.

Any change to these formats needs a migration, tests, and an ADR.

## Commands

- `npm test` — unit tests (Node's built-in test runner via `tsx`)
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — production build (Vite)

Run typecheck and tests before every commit.

## Rules and skills

Selected rules from ECC 2.2.3 (MIT, https://github.com/affaan-m/ECC) are vendored in `.claude/rules/ecc/`
and skills in `.claude/skills/`. Apply them. Notes for this project:
- The ECC rules mention ECC agents (planner, code-reviewer, tdd-guide, security-reviewer…). They are not
  installed here: apply their checklists yourself, and spawn subagents only when the owner asks.
- Unit tests use `node:test` instead of Jest/Vitest (no extra dependencies; same AAA structure).
- Commits: conventional format (`feat:`, `fix:`, `docs:`…), plus the attribution lines the session asks for.

## Working with Artem

- Communicate in Ukrainian (or Russian if he writes Russian), plainly and briefly.
- For user-facing wording and visible UI changes: show options or a preview in chat first, apply after
  he agrees.
- Don't box the conversation into rigid plans; follow his lead.
- When donations or taxes come up, remind him that draft letters exist in the Project doc
  "Quiet Page — листи щодо донатів".
- Never publish to `main` (the live site) without his go-ahead.
