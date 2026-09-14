# País Ramos Generales — Landing

Informational landing page for País Ramos Generales, a regional food store in Funes, Santa Fe (Argentina).
Full project context: `PAIS-RAMOS-GENERALES-PROJECT.md`.

## Stack

| Field | Value |
|---|---|
| Language | TypeScript |
| Framework | Astro (static output) |
| Motion | GSAP + ScrollTrigger, Lenis (smooth scroll) |
| Styling | Plain CSS with custom properties (design tokens) |
| Package manager | pnpm |
| Test runner | Vitest (unit), Playwright (e2e) |
| Quality audits | Lighthouse (mobile) |
| Database / ORM | None |
| Hosting | Static (Vercel / Netlify / Cloudflare Pages) |
| Security-sensitive paths | None (no backend, no auth, no user input beyond outbound WhatsApp links) |

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
pnpm test        # unit tests
pnpm test:e2e    # Playwright
```

## Architecture conventions

- Single primary action: WhatsApp. No cart, checkout, accounts or competing CTAs.
- Stacking transitions only in the 3 places defined in the project doc §5.2.
- Motion degrades gracefully: `prefers-reduced-motion` disables pinning, scrub and stacking; content is visible without JS (never parked at `opacity: 0`).
- Design tokens (colors, typography) come from the project doc §6; do not introduce new palette colors or fonts.

## Code conventions

- Code, identifiers and comments in English. All user-facing copy in Spanish (es-AR, voseo).
- Use `svh` / `dvh` for pinned or sticky heights, never raw `vh`.

## What NOT to do in this project

- Never fabricate client facts (prices, origins, dates, addresses). Use `[placeholder]` markers.
- No Three.js or 3D models.
- Do not copy the `*.dc.html` files into production: they are static design references.

## Domain glossary

## Testing

- Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- Core Web Vitals: LCP < 2.5 s, CLS < 0.05, INP < 200 ms.
- WCAG 2.1 AA: contrast, visible focus, semantic landmarks, alt text, reduced motion.
- E2E: section navigation, skip link to the pantry, WhatsApp links with prefilled messages, reduced-motion rendering.

## Repository

- Remote: `https://github.com/MussiDev/pais-ramos-generales.git`
- Default branch: `main`
