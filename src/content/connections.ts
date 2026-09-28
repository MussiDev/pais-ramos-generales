import type { MapPin } from './types';

export interface Connection {
  /** Unique, `^[a-z-]{2,32}$`. */
  id: string;
  name: string;
  pin: MapPin;
}

/**
 * Secondary connection points on the recorrido map: places the store sources from that are not
 * scroll stops (source: client-2026-09-28; evidence in docs/content-sources.md). Drawn as small
 * dots linked to Funes, without panels. Pins are real locations projected with the same
 * transform as `map-provinces.ts` (scripts/build-argentina-map.py `project`).
 */
export const connections: Connection[] = [
  { id: 'cordoba', name: 'Córdoba', pin: { x: 149.9, y: 194.6 } }, // Córdoba city
  { id: 'corrientes', name: 'Corrientes', pin: { x: 248.7, y: 142.4 } }, // province centroid
  { id: 'misiones', name: 'Misiones', pin: { x: 297.5, y: 105.1 } }, // province centroid
  { id: 'sur-bonaerense', name: 'Sur de Buenos Aires', pin: { x: 179.3, y: 337.8 } }, // Bahía Blanca
  { id: 'costa-patagonica', name: 'Costa patagónica', pin: { x: 136.7, y: 417.2 } }, // Puerto Madryn
];
