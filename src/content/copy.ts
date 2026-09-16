import type { ProvinceId } from './provinces';
import type { ImageSlot } from './types';

/**
 * User-facing copy per section (es-AR, voseo), taken from the design canvas (*.dc.html).
 *
 * Source labels (evidence in docs/content-sources.md):
 * - `empretienda-2026-09-13` / `instagram`: verified client fact.
 * - `canvas`: design heading or connective copy with no factual claim.
 * - `pending`: unconfirmed client claim; the claim itself is wrapped in [brackets] so it renders
 *   as a visible placeholder (FR-07).
 * Never add prices or discounts (guarded by content.test.ts).
 */

export const layout = {
  siteName: 'País Ramos Generales', // source: instagram
  defaultTitle: 'País Ramos Generales — Un viaje por el país, desde Funes', // source: canvas
  // source: empretienda-2026-09-13 (regional food) + instagram (Funes, Santa Fe; bio; WhatsApp orders)
  defaultDescription:
    'Tienda de alimentos regionales en Funes, Santa Fe. Llevamos a tu hogar lo mejor de nuestro país. Pedí por WhatsApp.',
  skipToContent: 'Saltar al contenido',
} as const;

export const nav = {
  wordmark: { primary: 'PAÍS', secondary: 'RAMOS GENERALES' },
  links: [
    { href: '#recorrido', label: 'El recorrido' },
    { href: '#despensa', label: 'La despensa' },
    { href: '#ferias', label: 'Ferias' },
    { href: '#como-pedir', label: 'Cómo pedir' },
  ],
  /** Accessible names (screen readers). */
  homeLabel: 'País Ramos Generales, inicio',
  navLabel: 'Principal',
} as const;

export const hero = {
  // source: empretienda-2026-09-13 (regional products, "Quiénes somos") + instagram (Funes, Santa Fe)
  eyebrow: 'Almacén de productos regionales · Funes, Santa Fe',
  titleLead: 'Lo mejor de nuestro país,', // source: instagram (bio "Llevamos a tu hogar lo mejor de nuestro país")
  titleEmphasis: 'en tu mesa.', // source: canvas
  // source: empretienda-2026-09-13 (dulces from Jujuy, yerba from Misiones, products of the country)
  //       + instagram (Diana y Patry, home delivery)
  subcopy:
    'Dulces de Jujuy, yerba de la tierra colorada, sabores de nuestro país: elegidos por Diana y Patry, llevados hasta tu casa.',
  cta: 'Hacé tu pedido',
  jarLabel: {
    kind: 'Dulce',
    variety: 'Mango y durazno', // source: empretienda-2026-09-13
    origin: 'Jujuy', // source: empretienda-2026-09-13
    detail: 'Artesanal', // source: empretienda-2026-09-13 ("100% artesanal")
  },
  jarImage: {
    id: 'hero-frasco',
    label: '[FOTO: frasco de dulce de mango y durazno]',
    alt: 'Frasco de dulce de mango y durazno de Jujuy',
    aspectRatio: { width: 4, height: 5 },
  } satisfies ImageSlot,
  stamp: 'Envíos a domicilio · Funes · Santa Fe', // source: instagram
  // source: instagram (highlights)
  ticker: ['Salta', 'Jujuy', 'Misiones', 'Corrientes', 'Buenos Aires', 'Río Negro'],
} as const;

export const manifiesto = {
  eyebrow: 'Quiénes somos', // source: canvas
  titleLead: 'Somos', // source: canvas
  titleEmphasis: 'Diana y Patry.', // source: instagram
  // source: pending (sourcing claim) + instagram (home delivery)
  body: 'Buscamos [lo que se hace con tiempo en cada rincón del país] y lo traemos hasta la puerta de tu casa.',
  about: 'Somos emprendedoras apoyando a emprendedores.', // source: empretienda-2026-09-13
  signature: 'desde Funes, con cariño', // source: canvas (location: instagram)
  pillars: [
    // titles: canvas; texts: pending
    {
      title: 'Productores reales',
      text: '[Marcas chicas y artesanales que conocemos por su nombre.]',
    },
    {
      title: 'Trato de almacén',
      text: '[Nos escribís, te asesoramos y te lo llevamos.] Sin vueltas.',
    },
  ],
  photo: {
    id: 'manifiesto-fundadoras',
    label: '[FOTO REAL: Diana y Patry en el almacén o en una feria]',
    alt: 'Diana y Patry, fundadoras de País Ramos Generales',
    aspectRatio: { width: 4, height: 5 },
  } satisfies ImageSlot,
} as const;

export const recorrido = {
  eyebrow: 'El recorrido', // source: canvas
  titleLead: 'Un viaje por el país,', // source: canvas
  titleEmphasis: 'desde Funes.', // source: canvas (location: instagram)
  origin: 'Funes', // source: instagram
  skipLink: 'Saltar a la despensa',
  /** Accessible map title, followed by the origin and the stop names. */
  mapTitle: 'Mapa de Argentina con el recorrido desde',
  stopLabel: 'Parada',
  /** Accessible progress text; {current} and {total} are filled in by the page and the scripts. */
  indicatorLabel: 'Parada {current} de {total}',
  featuredLabel: 'Producto destacado',
  storeCta: 'Ver en la tienda',
  productCta: 'Consultar por WhatsApp',
  alsoFromLabel: 'También de',
  /** Shown in "También de …" when a province has no other confirmed products. */
  alsoFromPlaceholder: '[Producto]',
  /**
   * Regional description per stop. Landscape words are `canvas`; claims about the products or
   * producers are `pending` and bracketed. One entry per province id (type-checked).
   */
  stops: {
    salta: 'Valles calchaquíes, viñedos de altura y [recetas que pasan de generación en generación].',
    jujuy: 'Cerros de siete colores y [dulces cocinados despacio, directo de quienes los hacen].',
    'misiones-corrientes': 'Tierra colorada, yerbales y sabores del Litoral.',
    'buenos-aires': 'La llanura de la pampa y [los productores de campo que la trabajan].',
    'rio-negro': 'Lagos, cordillera y [frutos rojos del sur].',
  } satisfies Record<ProvinceId, string>,
} as const;

export const despensa = {
  eyebrow: 'La despensa', // source: canvas
  titleLead: 'Etiquetas', // source: canvas
  titleEmphasis: 'con historia.', // source: canvas
  allLabel: 'Todo',
  numberPrefix: 'N.º',
  storeCta: 'Ver en la tienda',
  productCta: 'Consultar por WhatsApp',
  artisanSpecialLabel: 'Artesano especial',
  storeLinkText: 'Ver el catálogo completo en la tienda',
  emptyState: 'No hay productos en esta categoría todavía.',
  /** Screen-reader announcement after filtering; {count} is filled in by the filter script. */
  filterStatusOne: '{count} producto',
  filterStatusOther: '{count} productos',
  /** Prefix of the placeholder label shown while a product photo is missing (source: canvas). */
  photoLabel: 'FOTO',
  /** Accessible name of the category chip group. */
  filterLabel: 'Filtrar productos por categoría',
} as const;

export const ferias = {
  eyebrow: 'Ferias', // source: instagram (fairs)
  // source: pending (tasting at fairs not confirmed)
  titleLead: '[Vení a probar]',
  titleEmphasis: '[antes de llevar.]',
  nextDateLabel: 'Próxima fecha',
} as const;

export const comoPedir = {
  titleLead: 'Pedir es', // source: canvas
  titleEmphasis: 'como en el almacén.', // source: canvas
  steps: [
    // source: canvas
    { number: '01', title: 'Elegís', text: 'Recorré la despensa y anotá lo que te tentó.' },
    // source: instagram (WhatsApp orders); confirmation of stock and price: pending
    {
      number: '02',
      title: 'Nos escribís',
      text: 'Mandanos un WhatsApp. [Te confirmamos stock y precio.]',
    },
    // source: instagram (home delivery); pickup options: pending
    { number: '03', title: 'Lo recibís', text: 'Te lo llevamos a tu casa. [OPCIONES DE RETIRO]' },
  ],
  homeDelivery: 'Envíos a domicilio en [ZONA DE ENVÍO]', // source: instagram (home delivery); zone: pending
  storeFacts: [
    'Envíos a todo el país', // source: empretienda-2026-09-13 (FAQ)
    'Cajas de regalo personalizadas', // source: empretienda-2026-09-13 (FAQ)
    'Opciones sin TACC', // source: empretienda-2026-09-13 (FAQ)
  ],
  question: '¿Qué te traemos?', // source: canvas
  cta: 'Escribinos por WhatsApp',
  storeCta: 'Ver la tienda online',
} as const;

export const footer = {
  wordmark: 'PAÍS',
  legal: 'País Ramos Generales · Funes, Santa Fe', // source: instagram
  instagramLabel: 'Instagram',
  storeLabel: 'Tienda online',
  cta: 'Escribinos por WhatsApp',
} as const;
