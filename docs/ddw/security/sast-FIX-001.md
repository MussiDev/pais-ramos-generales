# SAST FIX-001: Replace hardcoded email placeholder and verify WhatsApp number

| Field | Value |
|-------|-------|
| Ticket | FIX-001 |
| Tier | FIX |
| Date | 2026-09-15 |
| Scope | `src/config/site.ts`, `src/config/site.test.ts` |
| Method | Model review of the changed lines plus pattern scans (grep) and `pnpm audit` |
| Attempt | 1 of 3 |

## Category verdicts

- ✅ F-SAST-01 hardcoded secrets: the changed literal is a public business contact email
  (`paisramosgenerales@gmail.com`), already published by the client on Instagram/Empretienda per
  `prd-FEAT-001.md` — not a credential, API key or token. `.env` remains gitignored; nothing new is
  tracked.
- ✅ F-SAST-02 SQL/NoSQL injection: N/A — no database or query layer touched.
- ✅ F-SAST-03 OS command injection: N/A — no `exec`/`spawn` in the changed files.
- ✅ F-SAST-04 insecure deserialization: N/A — no deserialization in the changed files.
- ✅ F-SAST-05 path traversal: N/A — no file path handling in the changed files.
- ✅ F-SAST-06 XSS: unchanged from FEAT-001's baseline — the only consumer (`BaseLayout.astro`'s
  JSON-LD) still serializes through `JSON.stringify` with `<` escaped; this fix only changes which
  string reaches that same, unmodified sink.
- ✅ F-SAST-07 SSRF: N/A — no network calls in the changed files.
- ✅ F-SAST-08 broken cryptography: N/A — no crypto in the changed files.
- ✅ F-SAST-09 debug mode in production: N/A — no config/build-mode change.
- ✅ F-SAST-10 logging sensitive data: N/A — no logging added; the value is public contact info, not
  sensitive.
- ✅ F-SAST-11 unrestricted upload: N/A — no upload path touched.
- ✅ F-SAST-12 missing CSRF protection: N/A — no state-changing request touched.
- ✅ F-SAST-13 Critical/High CVE in a dependency: `pnpm audit` reports "No known vulnerabilities
  found". No dependency changed in this fix.
- ✅ F-SAST-14 incomplete input validation: `validateSiteConfig`'s email rule (≤254 chars, exactly
  one `@`) is unchanged and still applies to the new literal, which satisfies it.
- ✅ F-SAST-15 insecure error handling: unchanged — `SiteConfigError` still names the field, no
  secrets echoed.
- ✅ F-SAST-16 Medium CVE in a dependency: `pnpm audit` reports 0 moderate. No dependency changed.
- ✅ F-SAST-17 unsafe function: N/A — no `eval`/`new Function` in the changed files.

## Low / informational

- ✅ W-SAST-01: no Low or Informational findings.

## Suppressions

None.

## Result

PASSED — 0 Critical, 0 High, 0 Medium.
