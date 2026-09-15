# Threat model FIX-001: Replace hardcoded email placeholder and verify WhatsApp number

| Field | Value |
|-------|-------|
| Ticket | FIX-001 |
| Spec | docs/ddw/specs/fix-FIX-001.md |
| Tier | FIX |
| Date | 2026-09-15 |

## Components
| Component | Source in the spec |
|---|---|
| `src/config/site.ts` | Fix-plan, correction step |
| `src/layouts/BaseLayout.astro` | Fix-plan, consumer (unmodified) |

## Trust boundaries
- Build-time config → HTML output: `siteConfig.email` (a compile-time literal, not user input)
  crosses into the server-rendered JSON-LD `<script>` tag that ships to every visitor's browser.
  There is no runtime or request-scoped trust boundary here — the value is fixed at build time and
  identical for every visitor, so there is no per-request attacker-controlled input anywhere in this
  change.

## STRIDE analysis
### `src/config/site.ts`
- **Spoofing:** N/A — `email` is a build-time literal with no identity or session attached to it;
  nothing to impersonate.
- **Tampering:** the value is set once in source and reviewed via PR like any other code; an
  attacker would need write access to the repo, which is the same trust level already required to
  tamper with any other config field (`whatsappNumber`, `instagramHandle`).
- **Repudiation:** N/A — no user action, no audit trail needed for a compile-time constant.
- **Information Disclosure:** the change **increases** disclosure by design — a real business
  contact email (already public on Instagram/Empretienda per the PRD) becomes visible in the site's
  structured data instead of an omitted field. This is the intended outcome (G1), not a leak: the
  email is not personal/sensitive PII, it is the store's public contact channel, already published
  by the client elsewhere.
- **Denial of Service:** N/A — no new code path, no new request handling.
- **Elevation of Privilege:** N/A — no auth, no roles involved anywhere in this fix.

### `src/layouts/BaseLayout.astro`
- **Spoofing:** N/A — `confirmed()` reads a build-time literal, not an identity claim; nothing to
  impersonate.
- **Tampering:** unchanged by this fix — the `PLACEHOLDER_MARKER` regex and `confirmed()` filter are
  not modified, only the value they receive changes.
- **Repudiation:** N/A — no user action, no session, nothing to repudiate in a static template.
- **Information Disclosure:** this fix **increases** disclosure by design — a real business contact
  email (already public on Instagram/Empretienda per the PRD) becomes visible in the site's
  structured data instead of an omitted field. This is the intended outcome (G1), not a leak: the
  email is not personal/sensitive PII, it is the store's public contact channel.
- **Denial of Service:** N/A — no new code path, no new request handling; `confirmed()` is a pure
  synchronous string check with no unbounded input.
- **Elevation of Privilege:** N/A — no auth, no roles involved anywhere in this template.

## Data classification
| Data | Class | At rest | In transit |
|---|---|---|---|
| `paisramosgenerales@gmail.com` | Public business contact info | Plaintext in source (git-tracked) — appropriate: it is a public contact channel the client already publishes on Instagram/Empretienda, not a credential or personal data requiring protection | Served over HTTPS (Astro static hosting/Railway), same as the rest of the page |

## Risks and mitigations
| ID | Risk | STRIDE | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R-01 | The hardcoded literal is typo'd or stale if the client changes their contact email later | I | L | L | Covered by the regression test asserting the exact value; a future change is a 1-line PR, same as today's fix |

No CRITICAL or HIGH risks identified — this is a data-correctness fix over a public, non-sensitive
literal, not a new attack surface.

## Supply chain
No new dependencies. No change to build tooling, integrations or third-party services.

## Availability
No new request path, no new resource consumption. Out of scope for this fix.
