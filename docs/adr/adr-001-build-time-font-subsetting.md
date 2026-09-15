# ADR-001: Subset web fonts at build time

| Field | Value |
|-------|-------|
| Date | 2026-09-14 |
| Ticket | FEAT-001 |
| Status | Accepted |

## Context
NFR-02 in `docs/ddw/prd/prd-FEAT-001.md` requires LCP < 2500 ms (Lighthouse mobile). Every
other budget passes. LCP stays at a 2580 ms median, even after trimming the font CSS to latin
subsets and fixing weight mismatches. The page genuinely uses 7–8 Cormorant Garamond and Hanken
Grotesk faces (~140 KB). The same build without web fonts measures LCP 1508–1738 ms, so the gap
is font payload.

## Options considered

### Option 1: Build-time glyph subsetting
- **Pros:** keeps the approved typography; font bytes shrink to the glyphs the page renders;
  regenerated on every build, so copy changes stay covered.
- **Cons:** adds a devDependency and a post-build step; a glyph added to copy without a rebuild
  can fall back (mitigated by a safety glyph set).

### Option 2: Fewer font faces in the first viewport
- **Pros:** no new tooling; immediate byte reduction.
- **Cons:** changes the approved design (project doc §6, §12 forbid silent typography changes).

### Option 3: Accept the LCP miss and re-measure with real photos and hosting
- **Pros:** no work now; the LCP element is currently a placeholder and will change.
- **Cons:** requires rewriting NFR-02 (a PRD corrective loop); ships a prototype over budget.

## Decision
Option 1, chosen by the human lead on 2026-09-14. It is the only option that meets NFR-02
without changing the design or the requirement.

## Consequences
- `pnpm build` gains a font-subsetting step that overwrites the fontsource woff2 files in `dist/_astro`.
- Subset files are renamed with a hash of their subset content, and CSS/HTML references are
  rewritten, so returning visitors never keep a stale subset from an immutable cache.
- New devDependency `subset-font` 2.7.0 (pulls in harfbuzzjs 0.10.3, fontverter 2.0.0, wawoff2
  2.0.1, woff2sfnt-sfnt2woff 1.0.0, pako 1.0.11, p-limit 3.1.0, yocto-queue 0.1.0). It runs at
  build time only and pure npm, with no system binaries. The threat model's supply-chain section
  does not list it yet; SAST reviews it in the CODE closeout.
- A glyph set is derived from the built HTML plus a Spanish safety set. The build fails loudly
  if a referenced font cannot be subset.
- LCP must be re-measured once real hero photography replaces the placeholder (it becomes the LCP element).
