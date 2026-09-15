# ADR-002: Upgrade Astro 5 → 7 and patch vulnerable dependencies

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Ticket | FEAT-001 |
| Status | Accepted |

## Context
The CODE closeout SAST gate found dependency CVEs that the security catalog (F-SAST-13) rules
out suppressing:
- `astro` 5.18.2: Critical GHSA-26w7-cxv4-gfx2 (RCE through AVIF image optimization, fixed in
  ≥7.2.8), plus High GHSA-8hv8-536x-4wqp and GHSA-2pvr-wf23-7pc7.
- `sharp` 0.34.5: High GHSA-f88m-g3jw-g9cj and GHSA-rgj7-g3m4-5g8c (fixed in ≥0.35.4).
- Transitive dependencies of `@lhci/cli` 0.15.1, the latest release: High advisories in `tmp`
  and `extract-zip`, Moderate in `qs` and `uuid`.

The spec summary (`docs/ddw/specs/spec-FEAT-001.md`) names "Astro 5". It can't be edited in CODE.

## Options considered

### Option 1: Upgrade Astro to 7.x and sharp to 0.35.x; override patched transitive versions
- **Pros:** removes the Critical and High advisories; stays on supported releases.
- **Cons:** a two-major upgrade (Vite 8) that may need code changes; departs from the spec's
  "Astro 5" wording.

### Option 2: Stay on Astro 5 and suppress the findings as not exploitable on a static site
- **Pros:** no upgrade work.
- **Cons:** the catalog forbids suppressing Critical or High findings. The AVIF RCE is reachable
  at build time through image optimization, which the site uses.

## Decision
Option 1. It is the only path that clears the SAST gate under the catalog's rules. The spec's
architecture (static Astro, progressive enhancement, content modules) does not change; only the
framework version does.

## Consequences
- `package.json` / `pnpm-lock.yaml`: `astro` 7.3.2 (Vite 8, esbuild 0.28.2) and `sharp` 0.35.4.
  The overrides in `pnpm-workspace.yaml` pin `tmp` ^0.2.6, `qs` ^6.16.0, `uuid` ^11.1.1 and
  `@puppeteer/browsers` ^3.2.2. The last one drops `extract-zip` entirely, because no patched
  `extract-zip` exists. `pnpm audit`: 20 findings (1 critical, 7 high) → 0.
- In an AI-agent environment, Astro 7's `astro preview` detaches into the background.
  `scripts/preview-server.mjs` runs Astro's `preview()` API in the foreground on a strict port,
  and both Playwright and Lighthouse CI use it.
- With the `@puppeteer/browsers` override, lhci can no longer find Chrome on its own.
  `scripts/lighthouse.mjs` points `CHROME_PATH` at Playwright's Chromium and runs `lhci autorun`
  with unchanged assertions.
- Node ≥ 22.12 is required (engines field updated).
- Any Astro 6/7 breaking changes are fixed in the affected files; tests and budgets must stay
  green, with no thresholds weakened.
- VERIFY must read this ADR as the record of why the Astro version differs from the spec summary.
