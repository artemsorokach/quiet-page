# ADR 0003: Entries remember the look they were written in

Date: 2026-10-31 · Status: accepted

## Context

Artem wants the Path to be able to show each entry in the colours, light/dark mode and writing font
it was written in, as a quiet way to see how one's state changed. Off by default.

## Decision

- Each new entry and mood note gets an optional field inside its JSON:
  `look: { skin, mode: 'dark' | 'light', font }` (the palette id, the resolved mode, the writing font).
- The field lives inside the encrypted `ct` like the rest of the entry, so nobody but the person sees it.
  The envelope (`{ts, v:2, iv, ct}`) and the keyring do not change.
- Reading is defensive (`recordLook`): unknown palettes or modes are ignored, an unknown font falls back to
  the default. Entries without the field show in the current look.
- Setting `ts-pathlook` (boolean, default false) switches the Path display on.
- A card gets `data-look` / `data-look-font`; tokens.css applies the palette and font to that card only.

## Consequences

- No migration: the field is optional and additive. The legacy site ignores it.
- Edits and additions keep the original look (the record is spread when changed).
- New palettes must keep their ids stable, or older entries fall back to the current look.
