# PRD FEAT-001: Animated landing prototype for País Ramos Generales

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| Tracker | none |
| Date | 2026-09-14T01:10:00Z |
| PRD loops | 1 |
| Loops since last human decision | 0 |

## Context and Problem

País Ramos Generales (Diana and Patry, Funes, Santa Fe) sells regional Argentine products from
entrepreneurs and artisans. Today they rely on Instagram and an Empretienda store
(`paisramosgenerales.empretienda.com.ar`). They need an informational landing page whose single
job is to explain who they are and drive WhatsApp orders, with award-level craft.

The concept, section order, scroll choreography, design tokens and quality budgets are already
decided in `PAIS-RAMOS-GENERALES-PROJECT.md` (§4–§8) and illustrated by the design canvas
(`*.dc.html`). No code exists. Final photography and final copy are still pending from the client,
so the team needs a **working prototype**: the real site, with every layout and animation built,
where images and unconfirmed copy are clearly marked placeholders that can be swapped without
touching code.

Verified client facts available for the prototype (store, crawled 2026-09-13): WhatsApp/phone
3416114425, email paisramosgenerales@gmail.com, Instagram @paisramosgenerales, nationwide shipping,
custom gift boxes, gluten-free (sin TACC) options, Jujuy origin for the mango-and-peach dulce,
Misiones origin for Caballo Negro and Federal yerbas.

## Goals

- G1: Deliver a deployable static site that reproduces the approved concept end to end.
- G2: Make every scroll animation defined in the project doc §5 reviewable in a real browser.
- G3: Isolate all placeholder content (images, copy, products, fair data) in data files so the
  client's material replaces it without code changes.
- G4: Meet the quality budgets of the project doc §8 from the first iteration.

## Functional Requirements

- FR-01: The site must render seven sections in this order: Hero, Manifiesto, El recorrido,
  La despensa, Ferias, Cómo pedir, Footer, with the Spanish (es-AR) copy from the design canvas.
- FR-02: The Hero must show the H1, the floating product jar that rotates up to ±6° tied to scroll,
  a continuously rotating stamp, and a looping horizontal province ticker.
- FR-03: El recorrido must pin the map column while five province stops (Salta, Jujuy, Misiones y
  Corrientes, Buenos Aires, Río Negro) advance, draw the route line scrubbed to scroll, change panel
  color, terrain silhouette and province name per stop, open the featured product from the map pin
  into its card, snap to each stop, and show a `0X / 05` progress indicator plus a
  "Saltar a la despensa" skip link.
- FR-04: The site must apply stacking transitions in exactly three places: Manifiesto over Hero,
  Despensa over the end of El recorrido, and the Footer curtain reveal under Cómo pedir.
- FR-05: La despensa must render product label cards from a data file and filter them by category
  chips without reloading the page.
- FR-06: Every order call to action (nav, Hero, product cards, Cómo pedir, Footer) must open
  WhatsApp through `https://wa.me/<number>?text=<message>` with a prefilled Spanish message; product
  cards must include the product name in the message.
- FR-07: All images, product data, province data, fair data and unconfirmed copy must come from
  content files, and every unconfirmed value must render as a visible placeholder (bracketed text or
  a labelled image placeholder). This placeholder convention applies only to content that is
  genuinely unconfirmed. The verified client facts listed under "Context and Problem" (WhatsApp
  number, email, Instagram handle) are not placeholders and must be used as-is wherever the site
  needs them, including in non-visible metadata (e.g. structured data/JSON-LD) — a bracketed marker
  must never leak into a field a human does not see and cannot flag for replacement. (FIX-001,
  addressing the gap where the email fact was implemented as a placeholder pending confirmation.)
- FR-08: When the user prefers reduced motion, the site must disable pinning, scrubbing, snapping,
  stacking and looping animations and render all sections in normal document flow.
- FR-09: On viewports narrower than 768 px, El recorrido must render as a vertical sequence with the
  map as a sticky top strip and the product cards below it.

## Non-Functional Requirements

- NFR-01: Lighthouse mobile scores: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95,
  SEO ≥ 95 on the production build.
- NFR-02: Core Web Vitals in Lighthouse mobile lab run: LCP < 2.5 s, CLS < 0.05, TBT < 200 ms
  (lab proxy for INP < 200 ms).
- NFR-03: Total JavaScript shipped ≤ 120 KB gzipped.
- NFR-04: Text contrast ≥ 4.5:1 for body text and ≥ 3:1 for text ≥ 24 px (WCAG 2.1 AA), including
  the mustard and wheat province panels.
- NFR-05: 100% of section content (headings, body copy, links) present in the HTML served with
  JavaScript disabled.
- NFR-06: Scroll animations sustain ≥ 55 fps average on a mid-range device profile (Chrome DevTools
  4× CPU throttling) during El recorrido.

## Acceptance Criteria
*(EARS — see `.ddw/rules/validation-rules.instructions.md` §1 for the five patterns)*

- AC-01 (FR-01, FR-07): WHEN the home page loads, THE site SHALL render the seven sections in the
  FR-01 order, and every unconfirmed value from the content files SHALL appear as a visible
  bracketed placeholder.
- AC-02 (FR-02, FR-04): WHEN the user scrolls from the top through the Manifiesto, THE Hero SHALL
  rotate the jar within ±6°, keep the stamp and ticker looping, and scale to 0.92 ± 0.02 while the
  Manifiesto covers it.
- AC-03 (FR-03): WHILE the user scrolls through El recorrido on a viewport ≥ 768 px, THE map column
  SHALL stay pinned, the progress indicator SHALL show the active stop as `0X / 05`, and the panel
  color SHALL match the stop's token.
- AC-04 (FR-03, FR-04): WHEN the user activates "Saltar a la despensa", THE site SHALL scroll to
  La despensa and move keyboard focus to its heading.
- AC-05 (FR-05): WHEN the user selects a category chip, THE site SHALL show only cards of that
  category and mark the chip with `aria-pressed="true"`.
- AC-06 (FR-06): WHEN the user activates any order call to action, THE link SHALL target
  `https://wa.me/<configured number>` with a URL-encoded prefilled message, and a product card link
  SHALL include that product's name.
- AC-07 (FR-06): IF the WhatsApp number is missing from the configuration, THEN THE build SHALL
  fail with an error naming the missing setting.
- AC-08 (FR-08): WHILE `prefers-reduced-motion: reduce` is active, THE site SHALL render no pinned
  or transformed sections and all seven sections SHALL be visible in document flow.
- AC-09 (FR-09): WHEN the viewport is 390 px wide, THE El recorrido section SHALL render the map as
  a sticky top strip, list the five stops vertically, and the page SHALL have no horizontal scroll.
- AC-10 (FR-07): IF an image referenced by a content file is missing, THEN THE site SHALL render a
  labelled placeholder box with the same aspect ratio instead of a broken image.

## Out of Scope

- Final photography, cutouts and province landscape licensing.
- Final, client-approved copy, prices, fair dates and delivery area.
- Cart, checkout, user accounts, prices, or integration with the Empretienda store API.
- CMS or admin panel.
- Optional WebGL image displacement transition (project doc §5.3).
- Three.js or 3D models.
- Domain purchase, hosting account setup and production deployment.
- Analytics and cookie banners.

## Risks and Mitigations

- Scroll choreography hurts performance on mobile → animate only `transform`/`opacity`, lazy-init
  GSAP per section, measure with NFR-01/NFR-06 in CI-like local runs.
- Lenis and ScrollTrigger desync → use the documented Lenis + ScrollTrigger integration and a single
  RAF loop.
- Placeholder content leaks into production → placeholders use a single marked format that tests
  can detect before a production release.
- WhatsApp number format: the store publishes `3416114425`; Argentine mobile numbers on `wa.me`
  normally use `549` + area code + number → keep the number in configuration and flag it as
  pending client confirmation.
- Conflicts between project doc and store (delivery area Funes vs nationwide, Costa Atlántica not
  in the route, featured products not in the store) → rendered as placeholders; resolved with the
  client outside this ticket.
- Scope size (9 FRs, 10 ACs): kept as a single ticket because the scroll experience is only
  reviewable as one continuous page; blocks are split in PLAN.

## Dependencies

- `PAIS-RAMOS-GENERALES-PROJECT.md` §4–§8: section order, choreography, tokens and budgets.
- Design canvas `*.dc.html` and `canvas.json`: visual reference and Spanish copy.
- Astro, GSAP + ScrollTrigger and Lenis (npm packages, installed with pnpm).
- Google Fonts: Cormorant Garamond and Hanken Grotesk (self-hosted or via `@fontsource`).
- WhatsApp click-to-chat URL scheme (`wa.me`).
- Store facts from `paisramosgenerales.empretienda.com.ar` (contact data, product origins).
