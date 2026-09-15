import type { Province } from './types';

/** viewBox of the Argentina map SVG; pins below are expressed in these coordinates. */
export const MAP_VIEWBOX = { x: -60, y: -10, width: 420, height: 690 } as const;

/** Map position of the store (origin of the route). Source: design canvas Recorrido*.dc.html. */
export const FUNES_PIN = { x: 183, y: 218 } as const;

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
    pin: { x: 113, y: 64 },
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
    pin: { x: 115, y: 44 },
    featuredProductId: 'dulce-mango-durazno', // source: empretienda-2026-09-13
  },
  {
    id: 'misiones-corrientes',
    name: 'Misiones y Corrientes', // source: instagram (highlight)
    region: 'LITORAL',
    panelToken: '--panel-litoral',
    textTone: 'dark',
    terrain: 'waves',
    pin: { x: 240, y: 104 },
    featuredProductId: 'yerba-federal-tradicional', // source: empretienda-2026-09-13
  },
  {
    id: 'buenos-aires',
    name: 'Buenos Aires', // source: instagram (highlight)
    region: 'PAMPA',
    panelToken: '--panel-buenos-aires',
    textTone: 'dark',
    terrain: 'flat',
    pin: { x: 219, y: 252 },
    featuredProductId: 'buenos-aires-destacado', // source: pending
  },
  {
    id: 'rio-negro',
    name: 'Río Negro', // source: instagram (highlight)
    region: 'PATAGONIA',
    panelToken: '--panel-rio-negro',
    textTone: 'light',
    terrain: 'peaks',
    pin: { x: 90, y: 380 },
    featuredProductId: 'rio-negro-destacado', // source: pending
  },
];
