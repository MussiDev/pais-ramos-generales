# Spec FEAT-001: Animated landing prototype for País Ramos Generales

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| PRD | docs/ddw/prd/prd-FEAT-001.md |
| Tier | FEATURE |
| Date | 2026-09-14T01:20:00Z |
| Spec loops | 3 |
| Loops since last human decision | 0 |

## Summary

A static Astro 5 site scaffolded with pnpm in the repo root. All content (copy, provinces, products,
fairs, image slots) lives in typed TypeScript data modules under `src/content/`, and unconfirmed
values use a single `[placeholder]` marker rendered by a shared `Placeholder` component. Sections
are Astro components that render complete HTML without JavaScript. Motion is progressive
enhancement: one client entry (`src/scripts/main.ts`) boots Lenis + GSAP ScrollTrigger only when
`prefers-reduced-motion` is not `reduce`, and each section registers its own timeline module.
Vitest covers pure logic (config, WhatsApp links, placeholders, filtering, motion guards) and
Playwright covers the ACs in a real browser against `astro preview`.

## Coverage: PRD → blocks

| Requirement | Covered by |
|---|---|
| FR-01 | Block 3 |
| FR-02 | Block 3 (markup), Block 4 (motion) |
| FR-03 | Block 3 (markup), Block 5 (choreography) |
| FR-04 | Block 4 (stacking 1 and 3), Block 5 (stacking 2) |
| FR-05 | Block 6 |
| FR-06 | Block 1 (config), Block 2 (link builder), Block 3 (CTAs) |
| FR-07 | Block 2 |
| FR-08 | Block 4 |
| FR-09 | Block 5 |
| NFR-01 | Strategy: Astro ships zero JS by default; only `main.ts` is hydrated; fonts self-hosted with `font-display: swap` and preloaded display weight; images through `astro:assets` with explicit width/height. Verified by `pnpm lighthouse` (Block 7). |
| NFR-02 | Strategy: LCP element is the H1 text (no hero image dependency while placeholders are used); all image slots reserve aspect ratio (CLS); animations only on `transform`/`opacity`; GSAP modules lazy-register after `requestIdleCallback`. Verified by Lighthouse assertions (Block 7). |
| NFR-03 | Strategy: dependencies limited to `gsap` (core + ScrollTrigger + Flip) and `lenis`; no UI framework runtime. Verified by `scripts/check-bundle-size.mjs` (Block 7). |
| NFR-04 | Strategy: text colors fixed per token pair in `tokens.css`; dark ink on mustard/wheat panels; terracotta restricted per the "Contrast decisions" section. Verified by `contrast.test.ts` computing WCAG ratios for every token pair used (Block 7) and axe in Playwright. |
| NFR-05 | Strategy: sections are server-rendered Astro components; no content is injected by JS; no initial `opacity: 0` in CSS. Verified by the no-JS Playwright project (Block 3). |
| NFR-06 | Strategy: pinned columns use `will-change: transform` only during pin; scrub uses a single ScrollTrigger per stop group; Lenis and ScrollTrigger share one `gsap.ticker` loop. Verified by `perf.e2e.ts` measuring frames with CPU throttling (Block 7). |

## Contrast decisions

Decided by the human lead on 2026-09-14 (option a): the palette is unchanged, and terracotta
`#C0673A` is used only where it meets WCAG AA.

| Use | Foreground | Background | Ratio | Rule |
|---|---|---|---|---|
| Large display text (≥ 24 px) and decoration (stamps, SVG strokes, borders) | `#C0673A` | `#F3EBDD` | 3.38:1 | allowed (≥ 3:1 large text / non-text) |
| Eyebrows and small text (< 24 px) | `#1F4D2E` | `#F3EBDD` | 8.22:1 | small text never uses terracotta |
| Jujuy panel background | `#C0673A` panel | — | — | only large province name and decoration on the panel; small text sits on a `#F3EBDD` card inside the panel |
| Salta panel text | `#F3EBDD` | `#9A3B2E` | 5.84:1 | allowed |
| Río Negro panel text | `#F3EBDD` | `#2F5A7A` | 6.19:1 | allowed |
| Litoral panel text | `#1B2A20` | `#E3B341` | 7.72:1 | allowed |
| Product metadata | `#6B5B43` | `#F3EBDD` | 5.54:1 | allowed |

## Dependencies between blocks

- Block 1 → required by every other block.
- Block 2 depends on Block 1.
- Block 3 depends on Block 2.
- Block 4, Block 5 and Block 6 depend on Block 3; they are independent of each other, but Block 5
  reuses the motion bootstrap from Block 4, so the order is 4 → 5 → 6.
- Block 7 depends on Blocks 1–6.

Execution order: 1 → 2 → 3 → 4 → 5 → 6 → 7.

## Block 1 — Scaffolding, tokens and site configuration

**Files**
- `package.json` (new) — pnpm scripts: `dev`, `build`, `preview`, `test`, `test:e2e`, `lighthouse`, `check:size`; deps `astro`, `gsap`, `lenis`, `@fontsource/cormorant-garamond`, `@fontsource/hanken-grotesk`; devDeps `typescript`, `vitest`, `@vitest/coverage-v8`, `happy-dom`, `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`.
- `pnpm-lock.yaml` (new) — lockfile.
- `astro.config.mjs` (new) — static output, `site` placeholder URL, integration hook that runs `validateSiteConfig` at `astro:config:setup`.
- `tsconfig.json` (new) — extends `astro/tsconfigs/strict`.
- `vitest.config.ts` (new) — unit tests in `src/**/*.test.ts`, `happy-dom` environment for DOM tests, coverage thresholds 80/80/80.
- `playwright.config.ts` (new) — projects `desktop` (1440×900), `mobile` (390×844), `no-js` (`javaScriptEnabled: false`), `reduced-motion`; webServer `pnpm build && pnpm preview`.
- `.gitignore` (modified) — add `node_modules/`, `dist/`, `.astro/`, `coverage/`, `test-results/`, `playwright-report/`, `.lighthouseci/`.
- `src/config/site.ts` (new) — `siteConfig` object (WhatsApp number, default message, Instagram, email, location) and `validateSiteConfig(config)`.
- `src/config/site.test.ts` (new) — unit tests.
- `.env.example` (new) — `PUBLIC_WHATSAPP_NUMBER` with the pending-confirmation comment.
- `src/styles/tokens.css` (new) — color, type, spacing and province panel tokens from project doc §6.
- `src/styles/global.css` (new) — reset, paper grain background, typography scale, focus styles.
- `src/layouts/BaseLayout.astro` (new) — `<html lang="es-AR" class="no-js">` plus a tiny inline script that swaps `no-js` for `js`, meta, OG tags, font imports, imports of `tokens.css` and `global.css`, `GroceryStore` JSON-LD serialized with `JSON.stringify` and `<` escaped as `<` (fields: `name`, `description`, `address.addressLocality` "Funes", `address.addressRegion` "Santa Fe", `address.addressCountry` "AR", `telephone`, `email`, `sameAs` Instagram; fields containing a `[placeholder]` are omitted), skip-to-content link.

**Logic**
`siteConfig.whatsappNumber` has no hard-coded default: it is read from the
`PUBLIC_WHATSAPP_NUMBER` env var. `.env.example` ships `PUBLIC_WHATSAPP_NUMBER=5493416114425` with a
comment stating it is the store number 3416114425 plus the assumed Argentina mobile prefix `549`,
pending client confirmation; developers copy it to `.env`. An empty or unset variable is treated as
missing. `validateSiteConfig` returns the config or throws
`SiteConfigError` listing every invalid field. The Astro integration calls it during config setup so
`pnpm build` and `pnpm dev` stop on invalid configuration (AC-07).

**Input validation**
- `whatsappNumber`: string, digits only, length 10–15 (E.164 without `+`), required.
- `instagramHandle`: string, `^[A-Za-z0-9._]{1,30}$`.
- `email`: string, max 254, must contain exactly one `@`.

**Error handling**
- Missing WhatsApp number — throw `SiteConfigError("whatsappNumber is required (set PUBLIC_WHATSAPP_NUMBER)")`; the build exits with a non-zero code.
- WhatsApp number with non-digit characters or wrong length — throw `SiteConfigError` naming `whatsappNumber` and the rule; build exits non-zero.
- Invalid Instagram handle or email — throw `SiteConfigError` naming the field; build exits non-zero.

**Required tests**
- [ ] `site.test.ts › accepts the default configuration` — validates AC-07 happy path.
- [ ] `site.test.ts › throws when the WhatsApp number is missing` — validates AC-07 (missing number error).
- [ ] `site.test.ts › throws when the WhatsApp number has non-digit characters or wrong length` — sad path (invalid number error).
- [ ] `site.test.ts › throws naming the field for an invalid Instagram handle or email` — sad path (invalid handle/email error).

**Completion criterion**
`pnpm install`, `pnpm build` and `pnpm test` succeed; the four tests above pass; running
`PUBLIC_WHATSAPP_NUMBER= pnpm build` exits non-zero with a message containing `whatsappNumber`.

## Block 2 — Content layer, placeholders and WhatsApp links

**Files**
- `src/content/types.ts` (new) — `Province`, `Product`, `Fair`, `ImageSlot`, `Category` types.
- `src/content/copy.ts` (new) — Spanish copy per section from the design canvas; each client fact carries a `source` comment (`instagram`, `empretienda-2026-09-13`, or `pending`).
- `src/content/provinces.ts` (new) — five stops: id, name, region label, panel color token, text tone, terrain type, map pin coordinates, featured product id.
- `src/content/products.ts` (new) — pantry products (verified store facts + placeholders) with category.
- `src/content/fairs.ts` (new) — next fair (`[DD/MM]`, `[HORARIO]`).
- `src/lib/placeholder.ts` (new) — `PLACEHOLDER_PATTERN`, `isPlaceholder(value)`, `splitPlaceholders(text)` (empty or whitespace-only text returns `[PENDIENTE]`).
- `src/content/validate.ts` (new) — `assertContentIntegrity(provinces, products, categories)`: unique ids and FK checks; called at module load of `src/pages/index.astro`.
- `src/lib/placeholder.test.ts` (new) — unit tests.
- `src/lib/whatsapp.ts` (new) — `buildWhatsAppUrl(number, message)`, `productMessage(productName)`.
- `src/lib/whatsapp.test.ts` (new) — unit tests.
- `src/lib/images.ts` (new) — `resolveImage(slotId)` using `import.meta.glob('/src/assets/**/*')`; returns the asset or `null`.
- `src/lib/images.test.ts` (new) — unit tests.
- `src/components/Placeholder.astro` (new) — renders text with bracketed segments wrapped in `<mark class="placeholder">`, styled with `--mustard` dashed outline on transparent background (no browser default yellow).
- `src/components/ImageSlot.astro` (new) — renders `<Image>` when the asset exists, otherwise a labelled box with `aspect-ratio` and `role="img"` + `aria-label`.
- `src/components/WhatsAppLink.astro` (new) — anchor with `href` from `buildWhatsAppUrl`, `target="_blank"`, `rel="noopener noreferrer"`.
- `src/assets/.gitkeep` (new) — image drop folder.
- `src/content/content.test.ts` (new) — integrity tests for content modules.

**Logic**
Content modules export typed arrays. Unconfirmed values are strings wrapped in brackets, e.g.
`"[ORIGEN]"`. `buildWhatsAppUrl` returns `https://wa.me/${number}?text=${encodeURIComponent(message)}`.
`productMessage(name)` returns `"Hola! Quiero consultar por ${name}"`. `resolveImage` looks up
`src/assets/<slotId>.(avif|webp|png|jpg)`.

**Data model** *(typed content modules, no database)*
- `Province`: `id` string, unique, `^[a-z-]{2,32}$`, not null · `name` string, not null · `region` enum `NOROESTE | LITORAL | PAMPA | PATAGONIA`, not null · `panelToken` string, not null · `textTone` enum `light | dark`, default `light` · `terrain` enum `hills | waves | flat | peaks`, not null · `pin` `{ x: number, y: number }` within the SVG viewBox, not null · `featuredProductId` string, nullable, FK → `Product.id`.
- `Product`: `id` string, unique, not null · `name` string, max 120, not null · `category` FK → `Category.id`, not null · `meta` string (brand / origin / size, may contain placeholders), not null · `imageSlot` string, `^[a-z0-9-]{1,64}$`, not null · `provinceId` string, nullable, FK → `Province.id`.
- `Category`: `id` string, unique, `^[a-z-]{2,32}$` · `label` string, not null.
- `Fair`: `name` string, not null · `place` string, not null · `date` string, default `"[DD/MM]"` · `hours` string, default `"[HORARIO]"`.
- Uniqueness and FK integrity are enforced by `src/content/content.test.ts` (Block 3).

**Input validation**
- `buildWhatsAppUrl.number`: digits only, 10–15 chars; `message`: string, max 500 chars after trim.
- `productMessage.name`: non-empty string, max 120 chars.
- `resolveImage.slotId`: `^[a-z0-9-]{1,64}$` (prevents path segments).

**Error handling**
- `buildWhatsAppUrl` with an invalid number — throws `TypeError("invalid WhatsApp number")`; surfaces at build time.
- `buildWhatsAppUrl` with a message over 500 chars — throws `RangeError("message too long")`.
- `productMessage` with an empty name — throws `TypeError("product name required")`.
- `resolveImage` with an invalid slot id — throws `TypeError("invalid image slot id")`.
- A province `featuredProductId` or product `category` that does not exist — `assertContentIntegrity` throws `Error("unknown product id: <id>")` / `Error("unknown category: <id>")` naming the record; the build fails.
- An empty content string — `splitPlaceholders` returns `[PENDIENTE]` so gaps stay visible.
- `resolveImage` with no matching asset — returns `null`; `ImageSlot` renders the labelled placeholder box (AC-10).

**Required tests**
- [ ] `whatsapp.test.ts › builds a wa.me URL with a URL-encoded message` — validates AC-06.
- [ ] `whatsapp.test.ts › product message includes the product name` — validates AC-06.
- [ ] `whatsapp.test.ts › throws on an invalid number` — sad path (invalid number error).
- [ ] `whatsapp.test.ts › throws on a message over 500 characters` — sad path (message too long error).
- [ ] `whatsapp.test.ts › throws on an empty product name` — sad path (empty name error).
- [ ] `placeholder.test.ts › detects and splits bracketed placeholders` — validates AC-01 placeholder rendering.
- [ ] `placeholder.test.ts › returns plain text unchanged when there is no placeholder` — edge case.
- [ ] `placeholder.test.ts › empty strings render as [PENDIENTE]` — sad path (empty content string).
- [ ] `content.test.ts › throws for a featured product id that does not exist` — sad path (unknown product id error), in `src/content/content.test.ts` (new).
- [ ] `images.test.ts › returns null for a slot with no asset` — validates AC-10 (missing asset error).
- [ ] `images.test.ts › throws on an invalid slot id` — sad path (invalid slot id error).

**Completion criterion**
All eleven tests pass with ≥ 80% line, branch and function coverage on `src/lib/`, `src/content/validate.ts` and `src/config/`.

## Block 3 — Section markup and page assembly

**Files**
- `src/pages/index.astro` (new) — assembles the seven sections inside `BaseLayout`, imports `sections.css`, calls `assertContentIntegrity`.
- `src/components/Nav.astro` (new) — wordmark, anchors, WhatsApp CTA.
- `src/components/sections/Hero.astro` (new) — H1, subcopy, CTA, jar `ImageSlot` + label, stamp SVG, ticker.
- `src/components/sections/Manifiesto.astro` (new) — founders copy + photo slot.
- `src/components/sections/Recorrido.astro` (new) — map pane (inline Argentina SVG, route path, pins), stop panels, progress indicator, skip link.
- `src/components/ArgentinaMap.astro` (new) — simplified SVG outline with Funes and five pins.
- `src/components/Terrain.astro` (new) — hills / waves / flat / peaks SVG silhouettes.
- `src/components/sections/Despensa.astro` (new) — heading with `id="despensa-title"` and `tabindex="-1"`; chips as `<button type="button" aria-pressed data-category>`; cards with `data-category`; hidden empty-state message element `[data-empty]`.
- `src/components/ProductCard.astro` (new) — vintage label card with WhatsApp product link.
- `src/components/sections/Ferias.astro` (new) — bunting SVG, next fair card.
- `src/components/sections/ComoPedir.astro` (new) — three steps + store facts strip (envíos a todo el país, cajas de regalo, sin TACC).
- `src/components/sections/Footer.astro` (new) — giant wordmark, WhatsApp CTA, Instagram, location.
- `src/styles/sections.css` (new) — static layout for all sections, desktop and ≤ 767 px, including `.no-js .chips { display: none }`; full-height Hero and Footer curtain use `svh`/`dvh`.
- `tests/e2e/structure.e2e.ts` (new) — Playwright.

**Logic**
Every section is a `<section>` landmark with an `id` and `aria-labelledby`. Layout is final in CSS
without JS: pinned/stacked behaviors are added later by classes set from JS. All CTAs use
`WhatsAppLink`. The skip link is a real anchor to `#despensa`.

**Input validation**
- None: this block renders static content and accepts no user input.

**Error handling**
- Content integrity fails (unknown product id or category) — `assertContentIntegrity` (Block 2) throws during page build and `pnpm build` exits non-zero.
- An `ImageSlot` asset is missing — the labelled placeholder box renders with the slot's aspect ratio.

**Required tests**
- [ ] `structure.e2e.ts › renders the seven sections in order` — validates AC-01.
- [ ] `structure.e2e.ts › shows bracketed placeholders as marked elements` — validates AC-01.
- [ ] `structure.e2e.ts › every order CTA targets wa.me with an encoded message` — validates AC-06.
- [ ] `structure.e2e.ts › product card links include the product name` — validates AC-06.
- [ ] `structure.e2e.ts › missing images render labelled placeholder boxes with aspect ratio` — validates AC-10.
- [ ] `structure.e2e.ts [no-js] › all headings, copy and links are present without JavaScript` — validates NFR-05.
- [ ] `structure.e2e.ts › build fails when content integrity fails` — sad path (content integrity error), runs `astro build` against a fixture with an unknown product id.

**Completion criterion**
The seven tests pass on the `desktop`, `mobile` and `no-js` projects; `pnpm build` produces
`dist/index.html` containing the seven section ids.

## Block 4 — Motion bootstrap, Hero motion and stacking 1 and 3

**Files**
- `src/scripts/main.ts` (new) — client entry; exposes `registerEnhancement(fn)` (always runs) and `registerMotion(fn)` (runs only when `shouldAnimate`).
- `src/layouts/BaseLayout.astro` (modified) — loads `main.ts` via `<script>` (bundled by Astro).
- `src/pages/index.astro` (modified) — imports `motion.css`.
- `src/scripts/motion/env.ts` (new) — `shouldAnimate(matchMedia)`; returns false for reduced motion or missing `matchMedia`.
- `src/scripts/motion/env.test.ts` (new) — unit tests.
- `src/scripts/motion/smooth-scroll.ts` (new) — Lenis instance synced to `gsap.ticker` and `ScrollTrigger.update`.
- `src/scripts/motion/hero.ts` (new) — jar float + rotation clamped to ±6°, stamp loop, ticker loop.
- `src/scripts/motion/stacking.ts` (new) — `stackOver(under, over, { scale: 0.92 })` and `curtainReveal(section, footer)`.
- `src/scripts/motion/clamp.ts` (new) — `clampRotation(progress, maxDeg)`.
- `src/scripts/motion/clamp.test.ts` (new) — unit tests.
- `src/styles/motion.css` (new) — `.is-animated` state classes and `@media (prefers-reduced-motion: reduce)` overrides. No `.is-animated` rule may hide content (`opacity: 0`, `visibility: hidden`), and timelines never use `gsap.from({ opacity: 0 })` gated on a scroll trigger.
- `tests/e2e/motion.e2e.ts` (new) — Playwright.

**Logic**
`main.ts` first runs every registered enhancement (non-motion behavior such as the skip link and the
pantry filter). Then it checks `shouldAnimate`. If false it stops there, leaving the static layout.
If true it adds `is-animated` to `<html>`, starts Lenis, registers ScrollTrigger and runs `hero.ts`
and stacking for Manifiesto over Hero and the Footer curtain. Each module wraps its setup in
try/catch so a failure in one section leaves the rest working.

**Input validation**
- `clampRotation.maxDeg`: number, 0 < maxDeg ≤ 45; `progress`: number clamped to [0, 1].

**Error handling**
- `matchMedia` unavailable — `shouldAnimate` returns false; static layout is kept.
- GSAP or Lenis fails to initialize — caught in `main.ts`, `is-animated` removed from `<html>`, `console.warn("motion disabled")`; content stays visible.
- A target element for a timeline is missing — the module returns without registering and logs `console.warn` naming the selector.
- `clampRotation` receives an out-of-range `maxDeg` — throws `RangeError`.

**Required tests**
- [ ] `env.test.ts › returns false when prefers-reduced-motion is reduce` — validates AC-08.
- [ ] `env.test.ts › returns false when matchMedia is unavailable` — sad path (matchMedia unavailable).
- [ ] `clamp.test.ts › never exceeds ±6° for any progress` — validates AC-02.
- [ ] `clamp.test.ts › throws RangeError for invalid maxDeg` — sad path (out-of-range maxDeg).
- [ ] `motion.e2e.ts › hero jar rotation stays within ±6° and hero scales to 0.92 ± 0.02 under the manifiesto` — validates AC-02.
- [ ] `motion.e2e.ts › stamp and ticker keep animating after scroll` — validates AC-02.
- [ ] `motion.e2e.ts [reduced-motion] › no pinned or transformed sections and all seven visible` — validates AC-08.
- [ ] `motion.e2e.ts › content stays visible when GSAP fails to load` — sad path (init failure), blocks the GSAP chunk via route interception.
- [ ] `motion.e2e.ts › missing timeline target logs a warning and other sections still animate` — sad path (missing target).

**Completion criterion**
All nine tests pass; with reduced motion emulated, no `<section>` inside `main` has a computed
`transform` other than `none` and none is `position: fixed` or pinned.

## Block 5 — El recorrido choreography and mobile layout

**Files**
- `src/scripts/motion/recorrido.ts` (new) — pin, route scrub, stop activation, FLIP product reveal, snap, indicator; stacking of Despensa over the end of the route through `stackOver` from `stacking.ts` (the third and last call site).
- `src/scripts/motion/route.ts` (new) — `stopIndexForProgress(progress, stops)` and `routeDashOffset(progress, pathLength, stopIndex)`.
- `src/scripts/motion/route.test.ts` (new) — unit tests.
- `src/scripts/skip-link.ts` (new) — scrolls to `#despensa` (smooth only when `shouldAnimate` is true, instant otherwise) and focuses `#despensa-title`; works without GSAP.
- `src/styles/recorrido.css` (new) — `data-stop` driven panel colors and sticky top strip layout ≤ 767 px using `svh`.
- `src/components/sections/Recorrido.astro` (modified) — imports `recorrido.css`, adds `data-stop` and route path `id`.
- `src/scripts/main.ts` (modified) — `registerMotion(recorrido)` and `registerEnhancement(skipLink)`.
- `tests/e2e/recorrido.e2e.ts` (new) — Playwright.

**Logic**
On viewports ≥ 768 px, a `gsap.matchMedia()` context pins the map pane for `5 × 100svh`, maps
scroll progress to the active stop, updates `data-stop` on the section (driving panel color, terrain
and name via CSS), scrubs the route `stroke-dashoffset`, runs `Flip.from` for the featured product
on stop enter and snaps to `1/4` increments. The indicator text is `0${index + 1} / 05`. Below
768 px the context is not created and the CSS sticky strip layout applies.

**Input validation**
- `stopIndexForProgress.progress`: number clamped to [0, 1]; `stops`: integer ≥ 1.
- `routeDashOffset.pathLength`: number > 0.

**Error handling**
- `stops` is 0 or not an integer — `stopIndexForProgress` throws `RangeError`.
- `pathLength` is 0 or negative — `routeDashOffset` throws `RangeError`.
- SVG route path missing or `getTotalLength` unavailable — the route scrub is skipped with `console.warn`; stops still activate.
- Skip link target missing — `skip-link.ts` falls back to the native anchor jump.

**Required tests**
- [ ] `route.test.ts › maps progress to stops 0–4 at boundaries` — validates AC-03.
- [ ] `route.test.ts › throws RangeError for zero or non-integer stops` — sad path (invalid stops).
- [ ] `route.test.ts › throws RangeError for non-positive path length` — sad path (invalid path length).
- [ ] `recorrido.e2e.ts [desktop] › map stays pinned, indicator reads 0X / 05 and panel color matches the stop token` — validates AC-03.
- [ ] `recorrido.e2e.ts › skip link scrolls to la despensa and focuses its heading` — validates AC-04.
- [ ] `recorrido.e2e.ts [mobile] › map is a sticky strip, stops are vertical, no horizontal scroll` — validates AC-09.
- [ ] `recorrido.e2e.ts › stops still activate when the route path is missing` — sad path (missing SVG path).
- [ ] `recorrido.e2e.ts › skip link falls back to anchor jump when the script is disabled` — sad path (skip-link target/script fallback).

**Completion criterion**
All eight tests pass; on the `mobile` project `document.documentElement.scrollWidth` equals
`clientWidth`.

## Block 6 — La despensa category filter

**Files**
- `src/scripts/despensa-filter.ts` (new) — `filterProducts(cards, category)` and chip wiring.
- `src/scripts/despensa-filter.test.ts` (new) — unit tests.
- `tests/e2e/despensa.e2e.ts` (new) — Playwright.
- `src/scripts/main.ts` (modified) — `registerEnhancement(despensaFilter)`.

**Logic**
Chips are `<button type="button" aria-pressed>` with `data-category`. On click, cards whose
`data-category` does not match get the `hidden` attribute; "Todo" shows all. Without JS every card
stays visible and chips are hidden via `.no-js` CSS; the `no-js` class is removed by the inline
script in `BaseLayout` (Block 1), independent of `shouldAnimate`, and the filter is registered with
`registerEnhancement` so it also runs under reduced motion.

**Input validation**
- `category`: string, must be `"todo"` or one of the categories present in `products.ts`.

**Error handling**
- Unknown category value (tampered `data-category`) — `filterProducts` ignores it, shows all cards and resets `aria-pressed` to the "Todo" chip.
- No cards match a valid category — renders the message "No hay productos en esta categoría todavía."

**Required tests**
- [ ] `despensa-filter.test.ts › shows only cards of the selected category` — validates AC-05.
- [ ] `despensa-filter.test.ts › unknown category shows all cards and selects Todo` — sad path (unknown category).
- [ ] `despensa-filter.test.ts › empty result shows the empty message` — sad path (no matching cards).
- [ ] `despensa.e2e.ts › selecting a chip filters cards and sets aria-pressed="true"` — validates AC-05.

**Completion criterion**
All four tests pass; keyboard activation (Enter/Space) of a chip filters identically to a click.

## Block 7 — Quality budgets

**Files**
- `lighthouserc.json` (new) — mobile preset assertions: performance ≥ 0.9, accessibility ≥ 0.95, best-practices ≥ 0.95, seo ≥ 0.95, LCP < 2500, CLS < 0.05, TBT < 200.
- `scripts/check-bundle-size.mjs` (new) — sums gzipped size of `dist/_astro/*.js`, fails over 120 KB.
- `src/styles/contrast.ts` (new) — `contrastRatio(hexA, hexB)` and the list of token pairs in use.
- `src/styles/contrast.test.ts` (new) — unit tests.
- `tests/e2e/a11y.e2e.ts` (new) — axe scan on desktop and mobile.
- `tests/e2e/perf.e2e.ts` (new) — frame sampling during Recorrido scroll with 4× CPU throttling.
- `scripts/check-bundle-size.test.ts` (new) — Vitest tests for the size script.
- `vitest.config.ts` (modified) — include `scripts/**/*.test.ts`.

**Logic**
`pnpm lighthouse` runs `lhci autorun` against `astro preview`. `pnpm check:size` runs after build.
Contrast tests assert every declared text/background pair meets its WCAG threshold.

**Input validation**
- `contrastRatio`: both arguments must match `^#[0-9A-Fa-f]{6}$`.

**Error handling**
- Invalid hex passed to `contrastRatio` — throws `TypeError("invalid hex color")`.
- `dist/` missing when running the size check — exits 1 with "run pnpm build first".
- A budget is exceeded — the script / Lighthouse exits non-zero naming the metric.

**Required tests**
- [ ] `contrast.test.ts › every declared token pair meets WCAG AA for its declared text size (table in "Contrast decisions")` — validates NFR-04.
- [ ] `contrast.test.ts › throws on invalid hex` — sad path (invalid hex color).
- [ ] `a11y.e2e.ts › no serious or critical axe violations` — validates NFR-04.
- [ ] `perf.e2e.ts › average fps ≥ 55 during el recorrido with 4× CPU throttling` — validates NFR-06.
- [ ] `check-bundle-size.mjs › exits 1 when dist is missing` — sad path (missing dist), run as a Vitest test in `scripts/check-bundle-size.test.ts` (new).
- [ ] `check-bundle-size.mjs › exits non-zero naming the metric when the budget is exceeded` — sad path (budget exceeded error), same test file with a fixture over 120 KB.
- [ ] `pnpm check:size` — validates NFR-03.
- [ ] `pnpm lighthouse` — validates NFR-01 and NFR-02.

**Completion criterion**
All eight checks pass on the production build.

## Rollback

No database, schema or data migration is involved: the site is static output. Rollback is trivial:
revert the commits on the branch or redeploy the previous `dist/` build.

## Final verification

- `pnpm build`, `pnpm test` (coverage ≥ 80/80/80), `pnpm test:e2e`, `pnpm check:size` and
  `pnpm lighthouse` all succeed.
- Every AC-01…AC-10 maps to at least one passing test listed above.
- No CSS rule sets initial `opacity: 0` on section content; the `no-js` and `reduced-motion`
  Playwright projects pass.
- Stacking exists only in the three places of FR-04 (`grep stackOver|curtainReveal` shows three call
  sites).
