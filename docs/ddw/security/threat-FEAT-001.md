# Threat model FEAT-001: Animated landing prototype for País Ramos Generales

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| Spec | docs/ddw/specs/spec-FEAT-001.md |
| Tier | FEATURE |
| Date | 2026-09-14T01:35:00Z |

## Components
| Component | Source in the spec |
|---|---|
| `src/config/site.ts` | Block 1 |
| `src/layouts/BaseLayout.astro` | Block 1 |
| `src/lib/whatsapp.ts` + `src/components/WhatsAppLink.astro` | Block 2 |
| `src/lib/images.ts` + `src/components/ImageSlot.astro` | Block 2 |
| `src/content/*.ts` + `src/components/Placeholder.astro` | Block 2, Block 3 |
| `src/scripts/main.ts` + `src/scripts/motion/*` | Block 4, Block 5 |
| `src/scripts/despensa-filter.ts` | Block 6 |
| `package.json` dependencies (`astro`, `gsap`, `lenis`, `@fontsource/*`) | Block 1 |

## Trust boundaries
- Build environment → static `dist/`: env var `PUBLIC_WHATSAPP_NUMBER` and repository content files become public HTML at build time.
- npm registry → build environment: third-party packages installed with pnpm execute during build and ship to the browser.
- Static host → visitor browser: HTML, CSS and JS served over HTTPS; the site has no backend and receives no user data.
- Visitor browser → WhatsApp (`wa.me`, third-party origin): outbound navigation carrying a prefilled message in the query string.

## STRIDE analysis
### `src/config/site.ts`
- **Spoofing:** a wrong or tampered WhatsApp number would route customers to an impostor; the number is validated by `validateSiteConfig` (digits, 10–15) and changes are reviewed in git (R-01).
- **Tampering:** the config is only changed through commits or the host's build env; no runtime input reaches it.
- **Repudiation:** changes to the number are attributable through git history and host build logs.
- **Information Disclosure:** it holds only public business contact data (phone, email, Instagram); no secrets are allowed in `PUBLIC_*` variables (R-06).
- **Denial of Service:** an invalid value fails the build instead of shipping broken links (AC-07); the previous deploy stays live.
- **Elevation of Privilege:** not applicable; the module grants no privileges and runs only at build time.

### `src/layouts/BaseLayout.astro`
- **Spoofing:** OG tags and `GroceryStore` JSON-LD describe the real business from `siteConfig`; no third-party content is embedded.
- **Tampering:** JSON-LD is serialized from content data; a string containing `</script>` could break out of the script tag, so it is serialized with `JSON.stringify` and `<` escaped as `<` (R-02).
- **Repudiation:** not applicable; the layout performs no actions.
- **Information Disclosure:** no analytics, cookies or tracking scripts are included; only public data is rendered.
- **Denial of Service:** fonts are self-hosted via `@fontsource`, so no external font host can block rendering.
- **Elevation of Privilege:** not applicable; static HTML with no privileged context.

### `src/lib/whatsapp.ts` + `src/components/WhatsAppLink.astro`
- **Spoofing:** links always target `https://wa.me/` built from the validated number; product names never alter the host or path.
- **Tampering:** the message is passed through `encodeURIComponent`, so product names cannot inject extra query parameters (R-03).
- **Repudiation:** not applicable; the order conversation happens inside WhatsApp, outside this system.
- **Information Disclosure:** the prefilled message contains only the product name chosen by the visitor, no personal data.
- **Denial of Service:** message length is capped at 500 characters to keep URLs within browser limits.
- **Elevation of Privilege:** links open with `target="_blank"` and `rel="noopener noreferrer"`, preventing reverse tabnabbing of the landing page (R-04).

### `src/lib/images.ts` + `src/components/ImageSlot.astro`
- **Spoofing:** only assets inside `src/assets/` are resolved; no remote image URLs are accepted.
- **Tampering:** slot ids are validated against `^[a-z0-9-]{1,64}$`, so path segments like `../` cannot reach files outside the asset folder at build time (R-05).
- **Repudiation:** not applicable; resolution is a build-time lookup.
- **Information Disclosure:** a missing asset renders a labelled box; no filesystem paths are printed into the HTML.
- **Denial of Service:** a missing image degrades to a placeholder instead of failing the build (AC-10).
- **Elevation of Privilege:** not applicable; no code execution from asset names.

### `src/content/*.ts` + `src/components/Placeholder.astro`
- **Spoofing:** content is authored in the repo; unconfirmed client facts are marked as `[placeholder]` so nothing fabricated is presented as verified.
- **Tampering:** Astro escapes interpolated strings by default; `set:html` is not used for content, so markup in a content string renders as text (R-02).
- **Repudiation:** content changes are tracked in git.
- **Information Disclosure:** only public store facts are included; founders' personal data beyond first names is not added.
- **Denial of Service:** not applicable; content is compiled into static HTML.
- **Elevation of Privilege:** not applicable; content cannot execute code.

### `src/scripts/main.ts` + `src/scripts/motion/*`
- **Spoofing:** not applicable; scripts do not authenticate or identify anyone.
- **Tampering:** scripts are bundled from local sources by Astro/Vite; no scripts are loaded from third-party origins at runtime.
- **Repudiation:** not applicable; scripts perform no auditable actions.
- **Information Disclosure:** failures log a generic `console.warn` naming a selector only, no user data.
- **Denial of Service:** a failure in any module is caught and the page falls back to the static layout, so motion bugs cannot hide content.
- **Elevation of Privilege:** no `eval`, `new Function` or `innerHTML` with dynamic data is used.

### `src/scripts/despensa-filter.ts`
- **Spoofing:** not applicable; the filter has no identity concept.
- **Tampering:** a visitor can edit `data-category` in devtools; unknown values are ignored and all cards are shown, affecting only their own view.
- **Repudiation:** not applicable; no actions are recorded.
- **Information Disclosure:** the filter only toggles the `hidden` attribute on cards already in the HTML.
- **Denial of Service:** filtering is O(n) over a small, fixed card list.
- **Elevation of Privilege:** no DOM injection; it never writes HTML strings.

### `package.json` dependencies (`astro`, `gsap`, `lenis`, `@fontsource/*`)
- **Spoofing:** a typosquatted package could impersonate a real one; exact package names are taken from official docs and pinned in `pnpm-lock.yaml` (R-07).
- **Tampering:** the lockfile pins versions and integrity hashes; installs use `pnpm install --frozen-lockfile` in CI and builds.
- **Repudiation:** dependency changes appear in lockfile diffs.
- **Information Disclosure:** build-time packages could read env vars; only `PUBLIC_WHATSAPP_NUMBER` is defined and it is public.
- **Denial of Service:** a compromised or removed package breaks the build, not the live site; the previous deploy stays up.
- **Elevation of Privilege:** install scripts run with the developer's privileges; pnpm's default of not running dependency lifecycle scripts except allow-listed ones limits this (R-07).

## Data classification
| Data | Class | At rest | In transit |
|---|---|---|---|
| WhatsApp business number | public | plain text in repo and static HTML (published by the business on its store) | HTTPS from the static host |
| Business email and Instagram handle | public | plain text in repo and static HTML | HTTPS from the static host |
| Prefilled WhatsApp message (product name) | public | not stored | HTTPS to `wa.me` |
| Product, province and fair content | public | plain text in repo | HTTPS from the static host |

## Risks and mitigations
| ID | Risk | STRIDE | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R-01 | WhatsApp number changed to an impostor's number routes orders away | S | L | H | `validateSiteConfig` format checks, number kept in one config file, changes reviewed in PRs |
| R-02 | Content string breaks out of JSON-LD `<script>` or injects markup | T | L | M | `JSON.stringify` with `<` escaped to `<`; Astro default escaping; no `set:html` for content |
| R-03 | Product name injects extra query parameters into the WhatsApp URL | T | L | L | `encodeURIComponent` on the message; unit test in Block 2 |
| R-04 | Reverse tabnabbing through `target="_blank"` WhatsApp links | E | L | M | `rel="noopener noreferrer"` enforced in `WhatsAppLink.astro`; e2e asserts the attribute |
| R-05 | Image slot id with path segments reads files outside `src/assets/` at build | T | L | L | slot id regex `^[a-z0-9-]{1,64}$`; unit test for invalid ids |
| R-06 | A secret placed in a `PUBLIC_*` env var gets bundled into the site | I | L | H | only `PUBLIC_WHATSAPP_NUMBER` is read; SAST in CODE checks for hardcoded secrets; AGENTS.md declares no backend secrets exist |
| R-07 | Compromised or typosquatted npm dependency ships malicious JS | T | L | H | four runtime deps only, lockfile with integrity hashes, `--frozen-lockfile`, pnpm lifecycle scripts not run by default, dependency CVE check in SAST |

## Supply chain
Runtime dependencies are `gsap`, `lenis`, `@fontsource/cormorant-garamond` and
`@fontsource/hanken-grotesk`; build-time dependencies are `astro`, `typescript`, `vitest`,
`@vitest/coverage-v8`, `@playwright/test`, `@axe-core/playwright` and `@lhci/cli`. All are pinned by
`pnpm-lock.yaml` with integrity hashes and reviewed for known CVEs in the CODE phase SAST step
(R-07). No scripts, fonts or images are loaded from third-party origins at runtime.

## Availability
The site is static files on a CDN-backed host with no backend, database or form endpoint, so there
is no application-level DoS surface; volumetric attacks are absorbed by the host's edge. Build-time
failures (invalid config, broken dependency) stop the deploy and leave the previous version live.
Client-side motion failures fall back to the static layout (Block 4 error handling).
