# Fix-plan FIX-001: Replace hardcoded email placeholder and verify WhatsApp number

| Field | Value |
|-------|-------|
| Ticket | FIX-001 |
| Tier | FIX |
| RCA | docs/ddw/specs/rca-FIX-001.md |
| Date | 2026-09-15 |
| Spec loops | 0 |
| Loops since last human decision | 0 |

## Problem

`src/config/site.ts:52` hardcodes `email: '[EMAIL]'`, and `validateSiteConfig`'s pending-value
escape hatch (`PENDING_VALUE_PATTERN`, meant for genuinely unconfirmed content) lets that bracketed
marker pass as valid. `prd-FEAT-001.md` already lists the real address
(`paisramosgenerales@gmail.com`) as a verified client fact. `BaseLayout.astro`'s `confirmed()` helper
strips any bracketed value from the JSON-LD `GroceryStore` schema, so the site currently ships with
no `email` field in structured data even though the real value has been known since FEAT-001's
DEFINE phase.

Separately, `PRD-FEAT-001.md`'s Risks section flags the WhatsApp number's `wa.me`-addressable form
(`549` + area code + `3416114425`) as unconfirmed with the client — correctly kept out of source and
in `PUBLIC_WHATSAPP_NUMBER`, but never verified end-to-end.

## Root cause

Asymmetric sourcing rule between `whatsappNumber` (required, no hardcoded default, build fails if
missing) and `email` (validation shape only — max 254 chars, one `@` — with no rule requiring a real
sourced value). The pending-value escape hatch built for FR-07's genuinely-unconfirmed-copy case was
never scoped away from `email`, so a placeholder for an already-verified fact silently passed
validation. See `docs/ddw/specs/rca-FIX-001.md` for the full analysis.

## Solution — steps

1. `src/config/site.ts:52` — replace `email: '[EMAIL]'` with
   `email: 'paisramosgenerales@gmail.com'`.
2. No other file changes: `BaseLayout.astro`'s `confirmed()` filter already does the right thing once
   the value is real (it only strips bracketed markers).

## Dependencies between steps

None — a single-line change.

## Error handling

- `email` invalid (no `@`, or over 254 chars) — unchanged: `validateSiteConfig` throws
  `SiteConfigError` naming `email`; build exits non-zero. This fix does not touch that path.

## Tests

- [ ] **Regression test** — `site.test.ts › does not accept the pending-value placeholder for
      email`: asserts `createSiteConfig().email === 'paisramosgenerales@gmail.com'` (not `'[EMAIL]'`
      or any `PENDING_VALUE_PATTERN` match). Fails BEFORE the fix (email is `'[EMAIL]'`), passes
      AFTER.
- [ ] `site.test.ts › still throws naming the field for an invalid email` — re-run of the existing
      sad-path assertion, confirming the fix does not weaken validation.

## Regression risk

Low — 1 file, 1 literal value, no schema/migration/endpoint touched. The existing
`instagramHandle`/`location` fields follow the same "hardcoded, verified" pattern already, so this
change makes `email` consistent with its siblings rather than introducing a new pattern.

## Rollback plan

- Steps: trivial — revert the commit (single-line literal change, no migration, no external state).
- Indicators: if the client says this is not their current contact email, revert and re-confirm the
  correct address before reapplying.
