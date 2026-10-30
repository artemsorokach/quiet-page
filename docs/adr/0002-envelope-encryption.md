# ADR 0002: Envelope encryption with a recovery code

- Status: accepted (shipped in the legacy site on 2026-10-30, commit a702bfc)
- Date: 2026-10-30

## Context

Entries must be readable only by their owner. People forget passwords, and a server-side reset would
break the privacy promise.

## Decision

- A random data key (DEK, AES-GCM 256) encrypts all entries.
- The DEK is stored in Firestore only wrapped twice: by a key from the password and by a key from a
  one-time recovery code (PBKDF2-SHA-256, 600 000 iterations, own salt each, then AES-GCM).
- The password is asked once per device; the DEK is kept as a non-extractable CryptoKey in IndexedDB.
  Option: ask on every open (then nothing is kept on the device).
- Changing the password or creating a new recovery code re-wraps only the envelope and requires the
  current password.
- Without password, code or a trusted device, entries cannot be recovered; the app says so honestly and
  offers to start over after explicit confirmation.

## Alternatives considered

- Password-derived key only (v1): simple, but a forgotten password loses everything.
- Server-held key / reset by e-mail: convenient, breaks end-to-end privacy.
- Passkeys (WebAuthn PRF) as a third envelope: planned later, browser support still uneven.

## Consequences

- Data format is documented in `CLAUDE.md`; changes require a migration and tests.
