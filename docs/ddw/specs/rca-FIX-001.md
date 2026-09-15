# RCA FIX-001: Hardcoded email placeholder and unverified WhatsApp number format

| Field | Value |
|-------|-------|
| Ticket | FIX-001 |
| Tracker | none |
| Related PRD | prd-FEAT-001.md |

## Context and Problem

`spec-FEAT-001.md` (Block 1, `src/config/site.ts`) required `whatsappNumber` to have **no
hard-coded default** — it must be read from `PUBLIC_WHATSAPP_NUMBER` and fail the build if missing
or invalid. It gave `email` a validation shape (max 254 chars, exactly one `@`) but never gave it the
same sourcing rule. `createSiteConfig` (`src/config/site.ts:52`) hardcodes `email: '[EMAIL]'`, and
`validateSiteConfig`'s `PENDING_VALUE_PATTERN` (`site.ts:45,101-103`) explicitly accepts any
`[BRACKETED]` value as valid — a mechanism built for genuinely unconfirmed content (FR-07), applied
here to a fact `prd-FEAT-001.md`'s "Context and Problem" section already listed as **verified**:
`paisramosgenerales@gmail.com`. The escape hatch let a placeholder silently satisfy validation, and
CODE's tests only asserted the validator's shape rules, not that a verified PRD fact reached the
config's default. VERIFY's cross-check (`docs/ddw/reports/verify-FEAT-001.md`) surfaced it as a
non-blocking WARN.

A related, adjacent item: the WhatsApp number (`3416114425`) is correctly gated behind
`PUBLIC_WHATSAPP_NUMBER` (never hardcoded, build fails if absent — AC-07 of FEAT-001), but
`prd-FEAT-001.md`'s Risks section flagged the `wa.me` assembled form for Argentine mobile numbers
(`549` + area code) as unconfirmed. That is not a code defect — the value is correctly kept out of
the source and in configuration — but it has never been confirmed end-to-end.

## Goals

- G1: The site's JSON-LD contact metadata carries the real, verified email instead of a bracketed
  placeholder.
- G2: The WhatsApp number's `wa.me`-addressable form is confirmed with the client before this ships.

## Functional Requirements

- FR-01: `createSiteConfig` must return the verified email address
  (`paisramosgenerales@gmail.com`) instead of the `[EMAIL]` placeholder.
- FR-02: `validateSiteConfig` must continue to accept the real address under its existing shape
  rule (max 254 chars, exactly one `@`), with no behavior change for that rule.

## Non-Functional Requirements

- NFR-01: The fix touches exactly 1 file (`src/config/site.ts`) and 0 schemas/migrations, keeping
  the change within FIX scope (`.ddw/rules/define.instructions.md`, "Scope Control").

## Acceptance Criteria
*(EARS — see `.ddw/rules/validation-rules.instructions.md` §1 for the five patterns)*

- AC-01 (FR-01): WHEN the site config is created, THE `email` field SHALL equal
  `paisramosgenerales@gmail.com` instead of `[EMAIL]`.
- AC-02 (FR-02): IF the email value is malformed (no `@`, or over 254 characters), THEN
  `validateSiteConfig` SHALL still throw `SiteConfigError` naming `email`.

## Dependencies

- `prd-FEAT-001.md` — verified client facts (email, WhatsApp) and FR-07's now-clarified placeholder
  convention.
- `src/config/site.ts`, `src/config/site.test.ts`, `src/layouts/BaseLayout.astro:49` (JSON-LD
  consumer).

## Root cause (technical detail)

See "Context and Problem" above: an asymmetric sourcing rule between `whatsappNumber` (required, no
hardcoded default) and `email` (validation shape only, pending-value escape hatch left open).

## Affected component

`src/config/site.ts` (`createSiteConfig`, `validateSiteConfig`) → `src/layouts/BaseLayout.astro:49`
(JSON-LD `GroceryStore` schema).

## Fix

- `src/config/site.ts`: replace the hardcoded `'[EMAIL]'` with `paisramosgenerales@gmail.com`.
- Deployment (not a code change): set `PUBLIC_WHATSAPP_NUMBER=5493416114425` in Railway (build
  already fails without it), and confirm with the client that this is the correct `wa.me` form of
  `3416114425` before it ships.

## Regression test

`src/config/site.test.ts › does not accept the pending-value placeholder for email` — asserts
`createSiteConfig().email` is no longer `'[EMAIL]'`, and that `validateSiteConfig` still accepts the
real address and still rejects a malformed one. Fails before the fix (email stays `'[EMAIL]'`),
passes after.

## Rollback plan

Revert `src/config/site.ts` to the previous hardcoded `'[EMAIL]'` value. No schema, no migration, no
external state — a single-file revert with no follow-up cleanup needed.
