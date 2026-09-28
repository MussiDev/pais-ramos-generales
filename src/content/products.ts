import type { Category, Product } from './types';

/**
 * Pantry categories (chips). Evidence for every `source` below: docs/content-sources.md.
 * Some chips group several store categories; the comment names them.
 */
export const categories: Category[] = [
  // source: empretienda-2026-09-13 — grouping of store categories Dulces + Mermeladas
  { id: 'dulces', label: 'Dulces' },
  // source: empretienda-2026-09-13 — store category Yerbas
  { id: 'yerbas', label: 'Yerbas' },
  // source: empretienda-2026-09-13 — grouping of store categories Chutney + Conservas en escabeche
  { id: 'conservas', label: 'Conservas' },
  // source: empretienda-2026-09-13 — store category Chipá
  { id: 'chipa', label: 'Chipá' },
  // source: pending — category of the placeholder featured products
  { id: 'por-confirmar', label: '[CATEGORÍA]' },
];

/**
 * Pantry products. Names and origins of confirmed products come from the store product pages
 * (docs/content-sources.md, "Products with stated origin"). Prices are never shown.
 */
export const products: Product[] = [
  // source: empretienda-2026-09-13 — store category Dulces
  {
    id: 'dulce-mango-durazno',
    name: 'Dulce de mango y durazno',
    category: 'dulces',
    meta: 'Jujuy · Artesanal', // "100% artesanal" on the store page; "%" kept out of UI copy
    imageSlot: 'producto-dulce-mango-durazno',
    provinceId: 'jujuy',
  },
  // source: empretienda-2026-09-13 — store category Dulces
  {
    id: 'dulce-maracuya-naranja-manzana',
    name: 'Dulce de maracuyá, naranja y manzana',
    category: 'dulces',
    meta: 'Jujuy',
    imageSlot: 'producto-dulce-maracuya-naranja-manzana',
    provinceId: 'jujuy',
  },
  // source: empretienda-2026-09-13 — store category Mermeladas (grouped under the Dulces chip)
  {
    id: 'mermelada-frutilla',
    name: 'Mermelada de frutilla',
    category: 'dulces',
    meta: 'Jujuy',
    imageSlot: 'producto-mermelada-frutilla',
    provinceId: 'jujuy',
  },
  // source: empretienda-2026-09-13 — store category Chutney (grouped under the Conservas chip)
  {
    id: 'chutney-chilto',
    name: 'Chutney de chilto',
    category: 'conservas',
    meta: 'Jujuy',
    imageSlot: 'producto-chutney-chilto',
    provinceId: 'jujuy',
  },
  // source: empretienda-2026-09-13 — store category Chutney (grouped under the Conservas chip)
  {
    id: 'chutney-maracuya',
    name: 'Chutney de maracuyá',
    category: 'conservas',
    meta: 'Jujuy',
    imageSlot: 'producto-chutney-maracuya',
    provinceId: 'jujuy',
  },
  // source: empretienda-2026-09-13 — store category Conservas en escabeche (grouped under the Conservas chip)
  {
    id: 'escabeche-llama-verduras',
    name: 'Escabeche de llama y verduras',
    category: 'conservas',
    meta: 'Jujuy',
    imageSlot: 'producto-escabeche-llama-verduras',
    provinceId: 'jujuy',
  },
  // source: empretienda-2026-09-13 — store category Yerbas
  {
    id: 'yerba-federal-tradicional',
    name: 'Yerba Federal Tradicional',
    category: 'yerbas',
    meta: 'Santo Pipó, Misiones',
    imageSlot: 'producto-yerba-federal-tradicional',
    provinceId: 'misiones-corrientes',
  },
  // source: empretienda-2026-09-13 — store category Yerbas
  {
    id: 'yerba-caballo-negro-tradicional',
    name: 'Yerba Caballo Negro Tradicional',
    category: 'yerbas',
    meta: 'Sur de Misiones',
    imageSlot: 'producto-yerba-caballo-negro-tradicional',
    provinceId: 'misiones-corrientes',
  },
  // source: empretienda-2026-09-13 — store category Chipá, no origin stated
  // (presentation and origin — source: pending)
  {
    id: 'chipa',
    name: 'Chipá',
    category: 'chipa',
    meta: '[PRESENTACIÓN] · [ORIGEN]',
    imageSlot: 'producto-chipa',
    provinceId: null,
  },
  // source: pending
  {
    id: 'salta-destacado',
    name: '[Producto destacado de Salta]',
    category: 'por-confirmar',
    meta: '[MARCA] · [ORIGEN]',
    imageSlot: 'producto-salta-destacado',
    provinceId: 'salta',
  },
  // source: pending
  {
    id: 'buenos-aires-destacado',
    name: '[Producto destacado de Buenos Aires]',
    category: 'por-confirmar',
    meta: '[MARCA] · [ORIGEN]',
    imageSlot: 'producto-buenos-aires-destacado',
    provinceId: 'buenos-aires',
  },
  // Patagonia stop seafood — source: client-2026-09-28 (names; all in escabeche);
  // brand and exact origin — source: pending
  {
    id: 'pulpito-tehuelche-escabeche',
    name: 'Pulpito tehuelche en escabeche',
    category: 'conservas',
    meta: 'Mar argentino · [ORIGEN]',
    imageSlot: 'producto-pulpito-tehuelche-escabeche',
    provinceId: 'rio-negro',
  },
  {
    id: 'pulpo-colorado-escabeche',
    name: 'Pulpo colorado en escabeche',
    category: 'conservas',
    meta: 'Mar argentino · [ORIGEN]',
    imageSlot: 'producto-pulpo-colorado-escabeche',
    provinceId: 'rio-negro',
  },
  {
    id: 'langostinos-escabeche',
    name: 'Langostinos en escabeche',
    category: 'conservas',
    meta: 'Mar argentino · [ORIGEN]',
    imageSlot: 'producto-langostinos-escabeche',
    provinceId: 'rio-negro',
  },
  {
    id: 'calamares-escabeche',
    name: 'Calamares en escabeche',
    category: 'conservas',
    meta: 'Mar argentino · [ORIGEN]',
    imageSlot: 'producto-calamares-escabeche',
    provinceId: 'rio-negro',
  },
  {
    id: 'vieiras-escabeche',
    name: 'Vieiras en escabeche',
    category: 'conservas',
    meta: 'Mar argentino · [ORIGEN]',
    imageSlot: 'producto-vieiras-escabeche',
    provinceId: 'rio-negro',
  },
  {
    id: 'cholgas-escabeche',
    name: 'Cholgas en escabeche',
    category: 'conservas',
    meta: 'Mar argentino · [ORIGEN]',
    imageSlot: 'producto-cholgas-escabeche',
    provinceId: 'rio-negro',
  },
  {
    id: 'mejillones-escabeche',
    name: 'Mejillones en escabeche',
    category: 'conservas',
    meta: 'Mar argentino · [ORIGEN]',
    imageSlot: 'producto-mejillones-escabeche',
    provinceId: 'rio-negro',
  },
];
