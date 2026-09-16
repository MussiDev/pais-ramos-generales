import type { Province } from './types';

/**
 * Pin coordinates below are centroids of the real province polygons in `map-provinces.ts`
 * (geoBoundaries ADM1 data), not hand-placed guesses. `MAP_VIEWBOX` and `FUNES_PIN` live there
 * too, next to the geometry they're expressed in.
 */

/** Stop ids in route order; `copy.recorrido.stops` must have an entry for each (type-checked). */
export const PROVINCE_IDS = [
  'salta',
  'jujuy',
  'misiones-corrientes',
  'buenos-aires',
  'rio-negro',
] as const;
export type ProvinceId = (typeof PROVINCE_IDS)[number];

/**
 * The five stops of El recorrido, in the order of the client's Instagram highlights
 * (source: instagram; evidence in docs/content-sources.md). Pins and panel tokens come from
 * the design canvas.
 */
export const provinces: Array<Province & { id: ProvinceId }> = [
  {
    id: 'salta',
    name: 'Salta', // source: instagram (highlight)
    region: 'NOROESTE',
    panelToken: '--panel-salta',
    textTone: 'light',
    terrain: 'hills',
    // Nudged ~6 units away from Jujuy's pin (real centroid 140.6,54.9) so the two labels and
    // halos don't overlap on the small map; the province shape itself is untouched.
    pin: { x: 144.2, y: 59.7 },
    featuredProductId: 'salta-destacado', // source: pending
  },
  {
    id: 'jujuy',
    name: 'Jujuy', // source: instagram (highlight)
    region: 'NOROESTE',
    panelToken: '--panel-jujuy',
    // Terracotta panel: only the large province name and decoration sit on it; small text goes
    // on a cream card (spec "Contrast decisions").
    textTone: 'light',
    terrain: 'hills',
    // Nudged ~6 units away from Salta's pin (real centroid 126.0,35.3); see the note there.
    pin: { x: 122.4, y: 30.5 },
    featuredProductId: 'dulce-mango-durazno', // source: empretienda-2026-09-13
  },
  {
    id: 'misiones-corrientes',
    name: 'Misiones y Corrientes', // source: instagram (highlight)
    region: 'LITORAL',
    panelToken: '--panel-litoral',
    textTone: 'dark',
    terrain: 'waves',
    pin: { x: 273.1, y: 123.8 }, // midpoint of the Misiones and Corrientes centroids
    featuredProductId: 'yerba-federal-tradicional', // source: empretienda-2026-09-13
  },
  {
    id: 'buenos-aires',
    name: 'Buenos Aires', // source: instagram (highlight)
    region: 'PAMPA',
    panelToken: '--panel-buenos-aires',
    textTone: 'dark',
    terrain: 'flat',
    pin: { x: 209.6, y: 280.0 },
    featuredProductId: 'buenos-aires-destacado', // source: pending
  },
  {
    id: 'rio-negro',
    name: 'Río Negro', // source: instagram (highlight)
    region: 'PATAGONIA',
    panelToken: '--panel-rio-negro',
    textTone: 'light',
    terrain: 'peaks',
    pin: { x: 103.1, y: 370.6 },
    featuredProductId: 'rio-negro-destacado', // source: pending
  },
];
