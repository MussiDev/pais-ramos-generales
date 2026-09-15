# RCA FIX-001: Hardcoded email placeholder and unverified WhatsApp number format

## Root cause

`spec-FEAT-001.md` (Block 1, `src/config/site.ts`) required `whatsappNumber` to have **no hard-coded
default** — it must be read from `PUBLIC_WHATSAPP_NUMBER` and fail the build if missing or invalid.
It gave `email` a validation shape (max 254 chars, exactly one `@`) but never gave it the same
sourcing rule. `createSiteConfig` (`src/config/site.ts:52`) hardcodes `email: '[EMAIL]'`, and
`validateSiteConfig`'s `PENDING_VALUE_PATTERN` (`site.ts:45,101-103`) explicitly whitelists any
`[BRACKETED]` value as valid — a mechanism built for genuinely unconfirmed content (FR-07), applied
here to a fact the PRD's "Context and Problem" section (line 25-26) already listed as **verified**:
`paisramosgenerales@gmail.com`.

The asymmetry: `whatsappNumber` is `required` with no escape hatch; `email` is `required-shaped` but
the pending-value pattern lets a placeholder silently satisfy validation. Nothing in CODE caught this
because the tests only assert the validator's *shape* rules (`site.test.ts`), not that a *verified*
fact from the PRD made it into the config's default. VERIFY's cross-check (`docs/ddw/reports/verify-FEAT-001.md`)
is what surfaced it, as a non-blocking WARN, because it compared the PRD's stated facts against the
shipped values rather than only against the ACs.

A related, adjacent gap: the WhatsApp number itself (`3416114425`) is correctly gated behind
`PUBLIC_WHATSAPP_NUMBER` (never hardcoded, build fails if absent — AC-07), but the PRD's own Risks
section (line 125-127) flagged the `wa.me` format for Argentine mobile numbers (`549` + area code) as
**unconfirmed** — nobody has verified whether `5493416114425` is the correct assembled form for this
specific number. That was correctly left as a deploy-time environment value, not hardcoded, so there
is no code defect there — but the value has never been confirmed end-to-end (an actual WhatsApp Web
open test), which is the second half of this ticket.

## Affected component

`src/config/site.ts` (`createSiteConfig`, `validateSiteConfig`), consumed by `src/layouts/BaseLayout.astro:49`
(JSON-LD `GroceryStore` schema).

## Related PRD

`docs/ddw/prd/prd-FEAT-001.md` — gap found and closed in DEFINE (this ticket): FR-07 now
distinguishes "genuinely unconfirmed copy" (placeholder-eligible) from "verified client facts"
(must be used as-is, never as a bracketed placeholder, including in non-visible metadata).

## Fix

- `src/config/site.ts`: replace the hardcoded `'[EMAIL]'` with the verified value
  `paisramosgenerales@gmail.com`, matching how `whatsappNumber` is already handled — verified,
  real value in, no placeholder escape hatch for facts already confirmed.
- Deployment: set `PUBLIC_WHATSAPP_NUMBER=5493416114425` in Railway's environment (build already
  fails without it — AC-07), and confirm with the client (Diana/Patry) that this is the correct
  `wa.me`-addressable form of `3416114425` before it ships — this is an external confirmation step,
  not a code change.

## Regression test

`src/config/site.test.ts › does not accept the pending-value placeholder for email` — asserts that
`createSiteConfig` no longer returns `'[EMAIL]'`, and that `validateSiteConfig` still accepts the
real address. Reproduces the defect before the fix (email stays `'[EMAIL]'`) and passes after.

## Rollback plan

Revert `src/config/site.ts` to the previous hardcoded `'[EMAIL]'` value. No schema, no migration, no
external state — a single-file revert with no follow-up cleanup needed.
