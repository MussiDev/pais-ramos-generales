# Test run FEAT-001

| Field | Value |
|---|---|
| Runner | Vitest 5.0.0 (unit, v8 coverage) + Playwright 1.63.0 (e2e, Chromium) |
| Command | `pnpm vitest run --coverage && pnpm exec playwright test` |
| Total | 227 |
| Passed | 178 |
| Failed | 0 |
| Skipped | 49 |
| Line coverage | 95.19% |
| Branch coverage | 87.59% |
| Function coverage | 92.2% |
| Coverage floor | 80% (AGENTS.md, "Testing"; enforced in vitest.config.ts thresholds) |
| Lint | `pnpm exec tsc --noEmit -p .` — clean, 0 errors (no separate linter configured in AGENTS.md) |

Counts: unit 106 passed; e2e 72 passed and 49 skipped, out of 121 e2e cases across the 5
Playwright projects (desktop, mobile, no-js, reduced-motion, perf). Coverage applies to the unit
run; the e2e run has no coverage instrumentation.

Additional budget checks from the same session: `pnpm check:size` JS 67.5 KB of 120 KB;
perf project 59.8 fps average (floor 55).

## Failures
(none)

## Skips
Every skip is a project-scoping `test.skip` guard. The reason is the guard's own annotation,
taken from the Playwright JSON report. Test files outside a project's `testMatch` (for example
`perf.e2e.ts` outside the `perf` project) are excluded, not skipped, so they are not counted here.

- [no-js] a11y.e2e.ts › no serious or critical axe violations — reason: axe needs script evaluation
- [desktop] despensa.e2e.ts › without JavaScript every card is visible and the chips are hidden — reason: no-JS project only
- [mobile] despensa.e2e.ts › after filtering, the footer curtain still ends fully revealed at the bottom — reason: the footer curtain runs on desktop with motion
- [mobile] despensa.e2e.ts › without JavaScript every card is visible and the chips are hidden — reason: no-JS project only
- [no-js] despensa.e2e.ts › the live region announces the filter result only after a selection — reason: filtering needs JavaScript
- [no-js] despensa.e2e.ts › after filtering, the footer curtain still ends fully revealed at the bottom — reason: the footer curtain runs on desktop with motion
- [reduced-motion] despensa.e2e.ts › after filtering, the footer curtain still ends fully revealed at the bottom — reason: the footer curtain runs on desktop with motion
- [reduced-motion] despensa.e2e.ts › without JavaScript every card is visible and the chips are hidden — reason: no-JS project only
- [no-js] despensa.e2e.ts › selecting a chip filters cards and sets aria-pressed="true" — reason: filtering needs JavaScript
- [no-js] despensa.e2e.ts › keyboard activation (Enter and Space) filters like a click — reason: filtering needs JavaScript
- [no-js] despensa.e2e.ts › a tampered chip category shows all cards and selects Todo — reason: filtering needs JavaScript
- [no-js] fonts.e2e.ts › Cormorant Garamond and Hanken Grotesk load and render the copy, including ñ — reason: document.fonts and CDP need script evaluation
- [desktop] motion.e2e.ts › no pinned or transformed sections and all seven visible — reason: runs with reduced motion emulated
- [mobile] motion.e2e.ts › no pinned or transformed sections and all seven visible — reason: runs with reduced motion emulated
- [no-js] motion.e2e.ts › hero jar rotation stays within ±6° and hero scales to 0.92 ± 0.02 under the manifiesto — reason: motion only runs with JavaScript and without prefers-reduced-motion
- [no-js] motion.e2e.ts › stamp and ticker keep animating after scroll — reason: motion only runs with JavaScript and without prefers-reduced-motion
- [no-js] motion.e2e.ts › no pinned or transformed sections and all seven visible — reason: runs with reduced motion emulated
- [no-js] motion.e2e.ts › switching to reduced motion after load reverts pins, transforms and smooth scroll — reason: motion only runs with JavaScript and without prefers-reduced-motion
- [no-js] motion.e2e.ts › content stays visible when GSAP fails to load — reason: motion only runs with JavaScript and without prefers-reduced-motion
- [no-js] motion.e2e.ts › missing timeline target logs a warning and other sections still animate — reason: motion only runs with JavaScript and without prefers-reduced-motion
- [no-js] motion.e2e.ts › missing stacking target logs a warning and the hero still animates — reason: motion only runs with JavaScript and without prefers-reduced-motion
- [reduced-motion] motion.e2e.ts › hero jar rotation stays within ±6° and hero scales to 0.92 ± 0.02 under the manifiesto — reason: motion only runs with JavaScript and without prefers-reduced-motion
- [reduced-motion] motion.e2e.ts › stamp and ticker keep animating after scroll — reason: motion only runs with JavaScript and without prefers-reduced-motion
- [reduced-motion] motion.e2e.ts › switching to reduced motion after load reverts pins, transforms and smooth scroll — reason: motion only runs with JavaScript and without prefers-reduced-motion
- [reduced-motion] motion.e2e.ts › content stays visible when GSAP fails to load — reason: motion only runs with JavaScript and without prefers-reduced-motion
- [reduced-motion] motion.e2e.ts › missing timeline target logs a warning and other sections still animate — reason: motion only runs with JavaScript and without prefers-reduced-motion
- [reduced-motion] motion.e2e.ts › missing stacking target logs a warning and the hero still animates — reason: motion only runs with JavaScript and without prefers-reduced-motion
- [desktop] recorrido.e2e.ts › map is a sticky strip, stops are vertical, no horizontal scroll — reason: mobile layout
- [mobile] recorrido.e2e.ts › map stays pinned, indicator reads 0X / 05 and panel color matches the stop token — reason: the pinned map runs on desktop with motion
- [mobile] recorrido.e2e.ts › stops still activate when the route path is missing — reason: the pinned map runs on desktop with motion
- [mobile] recorrido.e2e.ts › featured card keeps a readable text column at 1024 and 1280 px, also without JavaScript — reason: intermediate desktop widths, with and without JavaScript
- [mobile] recorrido.e2e.ts › snaps onto the stop start after a wheel scroll near a stop boundary — reason: the pinned map runs on desktop with motion
- [mobile] recorrido.e2e.ts › entering a stop reveals its featured product from the map pin — reason: the pinned map runs on desktop with motion
- [no-js] recorrido.e2e.ts › map stays pinned, indicator reads 0X / 05 and panel color matches the stop token — reason: the pinned map runs on desktop with motion
- [no-js] recorrido.e2e.ts › skip link scrolls to la despensa and focuses its heading — reason: the enhanced skip link needs JavaScript
- [no-js] recorrido.e2e.ts › map is a sticky strip, stops are vertical, no horizontal scroll — reason: mobile layout
- [no-js] recorrido.e2e.ts › stops still activate when the route path is missing — reason: the pinned map runs on desktop with motion
- [no-js] recorrido.e2e.ts › skip link falls back to anchor jump when the script is disabled — reason: covered by the explicit no-JS context in the same test file
- [no-js] recorrido.e2e.ts › snaps onto the stop start after a wheel scroll near a stop boundary — reason: the pinned map runs on desktop with motion
- [no-js] recorrido.e2e.ts › entering a stop reveals its featured product from the map pin — reason: the pinned map runs on desktop with motion
- [reduced-motion] recorrido.e2e.ts › map stays pinned, indicator reads 0X / 05 and panel color matches the stop token — reason: the pinned map runs on desktop with motion
- [reduced-motion] recorrido.e2e.ts › map is a sticky strip, stops are vertical, no horizontal scroll — reason: mobile layout
- [reduced-motion] recorrido.e2e.ts › stops still activate when the route path is missing — reason: the pinned map runs on desktop with motion
- [reduced-motion] recorrido.e2e.ts › featured card keeps a readable text column at 1024 and 1280 px, also without JavaScript — reason: intermediate desktop widths, with and without JavaScript
- [reduced-motion] recorrido.e2e.ts › snaps onto the stop start after a wheel scroll near a stop boundary — reason: the pinned map runs on desktop with motion
- [reduced-motion] recorrido.e2e.ts › entering a stop reveals its featured product from the map pin — reason: the pinned map runs on desktop with motion
- [mobile] structure.e2e.ts › build fails when content integrity fails — reason: build-time check runs in the desktop project
- [no-js] structure.e2e.ts › build fails when content integrity fails — reason: build-time check runs in the desktop project
- [reduced-motion] structure.e2e.ts › build fails when content integrity fails — reason: build-time check runs in the desktop project
