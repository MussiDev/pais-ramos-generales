/**
 * Content model for the landing. Every unconfirmed value is a bracketed placeholder string,
 * e.g. "[ORIGEN]", rendered visibly by the Placeholder component.
 */

export type Region = 'NOROESTE' | 'LITORAL' | 'PAMPA' | 'PATAGONIA';
export type TextTone = 'light' | 'dark';
export type Terrain = 'hills' | 'waves' | 'flat' | 'peaks';

export interface MapPin {
  /** Coordinates inside the Argentina map SVG viewBox (`MAP_VIEWBOX`). */
  x: number;
  y: number;
}

export interface Province {
  /** Unique, `^[a-z-]{2,32}$`. */
  id: string;
  name: string;
  region: Region;
  /** CSS custom property from tokens.css, e.g. `--panel-salta`. */
  panelToken: string;
  textTone: TextTone;
  terrain: Terrain;
  pin: MapPin;
  /** FK → Product.id. */
  featuredProductId: string | null;
}

export interface Category {
  /** Unique, `^[a-z-]{2,32}$`. */
  id: string;
  label: string;
}

export interface Product {
  /** Unique. */
  id: string;
  /** Max 120 characters. */
  name: string;
  /** FK → Category.id. */
  category: string;
  /** Brand / origin / size; may contain placeholders. */
  meta: string;
  /** `^[a-z0-9-]{1,64}$`; resolved against `src/assets/<imageSlot>.(avif|webp|png|jpg)`. */
  imageSlot: string;
  /** FK → Province.id. */
  provinceId: string | null;
}

export interface Fair {
  name: string;
  place: string;
  /** Defaults to "[DD/MM]" until the client confirms. */
  date: string;
  /** Defaults to "[HORARIO]" until the client confirms. */
  hours: string;
}

export interface ImageSlot {
  /** `^[a-z0-9-]{1,64}$`. */
  id: string;
  /** Visible label of the placeholder box while the asset is missing. */
  label: string;
  /** Alt text once the real image exists. */
  alt: string;
  aspectRatio: { width: number; height: number };
}
