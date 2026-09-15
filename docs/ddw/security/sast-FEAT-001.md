# SAST FEAT-001: Animated landing prototype for País Ramos Generales

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| Tier | FEATURE |
| Date | 2026-09-15 |
| Scope | `src/`, `scripts/`, `astro.config.mjs`, `playwright.config.ts`, `lighthouserc.json`, `vitest.config.ts`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` |
| Method | Model review of the source plus pattern scans (grep) and `pnpm audit` |
| Attempt | 2 of 3 (attempt 1 blocked on dependency CVEs, fixed per ADR-002) |

## Category verdicts

- ✅ F-SAST-01 hardcoded secrets: no API keys, passwords or tokens in scope. The only "token" matches are CSS custom-property names (`panelToken`). `.env` is gitignored (`git check-ignore .env`), no `.env`/`.pem`/`.key` is tracked, and the WhatsApp number is read from `PUBLIC_WHATSAPP_NUMBER` at build time.
- ✅ F-SAST-02 SQL/NoSQL injection: there is no database or query layer; the site is static.
- ✅ F-SAST-03 OS command injection: no `child_process`, `exec`, `execSync` or `spawn` in `src/` or the build scripts. The one `exec(` match is `RegExp.prototype.exec` on a filename.
- ✅ F-SAST-04 insecure deserialization: no untrusted data is deserialized. `JSON.parse` only reads repo-owned files during tests and tooling.
- ✅ F-SAST-05 path traversal: image slot ids are validated with `^[a-z0-9-]{1,64}$` before lookup, and the lookup reads a static glob map. Build scripts (`subset-fonts.mjs`, `check-bundle-size.mjs`) only touch files under the local `dist/` they enumerate, and take no external path input.
- ✅ F-SAST-06 XSS: the only raw HTML sink is the build-time JSON-LD `set:html`, serialized with `JSON.stringify` and `<` escaped as `<`. Content renders through Astro's default escaping. Client scripts write only `textContent`, `hidden` and ARIA attributes, never `innerHTML`. Every `target="_blank"` link has `rel="noopener noreferrer"`.
- ✅ F-SAST-07 SSRF: there is no server runtime and no `fetch`/XHR/WebSocket in `src/` or the build scripts. Astro's prerendered error-page SSRF (GHSA-2pvr-wf23-7pc7) is removed by the upgrade to astro 7.3.2.
- ✅ F-SAST-08 broken cryptography: the only crypto is SHA-256 content hashing for font file names; there are no passwords and no weak algorithms.
- ✅ F-SAST-09 debug mode in production: the site ships as static output from `astro build`, with no dev server or debug flags in production config.
- ✅ F-SAST-10 logging sensitive data: client `console.warn` calls log selector names and error objects only, with no personal data. The site collects no user data.
- ✅ F-SAST-11 unrestricted upload: there are no forms, file inputs or upload endpoints.
- ✅ F-SAST-12 missing CSRF protection: there are no state-changing requests. The only outbound action is navigation to `wa.me`.
- ✅ F-SAST-13 Critical/High CVE in a dependency: after the fix, `pnpm audit` reports "No known vulnerabilities found". Attempt 1 found 1 critical and 7 high: astro RCE through AVIF optimization, astro XSS and SSRF, sharp libvips/libheif, `tmp` and `extract-zip` via @lhci/cli. All were fixed by astro 7.3.2, sharp 0.35.4 and the pnpm overrides for `tmp`, `qs`, `uuid` and `@puppeteer/browsers` (see `docs/adr/adr-002-astro-7-upgrade-for-security.md`).
- ✅ F-SAST-14 incomplete input validation: every input is validated. Site config: digits 10–15, handle regex, email length and `@`. WhatsApp message: ≤500 characters, URL-encoded. Product name ≤120. Filter category is restricted to categories read at load. Hex colors are regex-checked.
- ✅ F-SAST-15 insecure error handling: build errors name the invalid config field without echoing secrets. Client module failures are caught and degrade to the static layout, and no stack traces reach the page.
- ✅ F-SAST-16 Medium CVE in a dependency: `pnpm audit` reports 0 moderate. Attempt 1 found 8 moderate (astro XSS variants, `qs`, `uuid`), all fixed by the same upgrade and overrides.
- ✅ F-SAST-17 unsafe function: no `eval`, `new Function`, or string-based `setTimeout`/`setInterval` in scope.

## Low / informational

- ✅ W-SAST-01: no Low or Informational findings remain. The esbuild dev-server file-read issue on Windows (GHSA-g7r4-m6w7-qqqr) is fixed by esbuild 0.28.2, which comes with the upgrade.

## Suppressions

None.

## Result

Total: 17 categories clean, 0 vulnerabilities (0 critical, 0 high, 0 medium).

Result: PASSED
