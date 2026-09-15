/**
 * WCAG 2.1 contrast for the palette in tokens.css (NFR-04). `TOKEN_PAIRS` lists every
 * foreground/background token pair the sections use, with the text size it is used at; the
 * "Contrast decisions" table of the spec is binding for its rows. contrast.test.ts asserts each
 * pair meets its WCAG AA minimum and that `TOKENS` matches tokens.css.
 */

/** Palette tokens (values mirror tokens.css; the test fails if they drift). */
export const TOKENS = {
  green: '#1f4d2e',
  cream: '#f3ebdd',
  terracotta: '#c0673a',
  mustard: '#e3b341',
  ink: '#1b2a20',
  'ink-muted': '#3a4a3f',
  'label-brown': '#6b5b43',
  'panel-salta': '#9a3b2e',
  'panel-jujuy': '#c0673a',
  'panel-litoral': '#e3b341',
  'panel-buenos-aires': '#e6d5b0',
  'panel-rio-negro': '#2f5a7a',
} as const;

export type TokenName = keyof typeof TOKENS;

/**
 * - `small`: text under 24 px (and under 18.66 px bold) — needs 4.5:1.
 * - `large`: text at 24 px or more — needs 3:1.
 * - `non-text`: focus rings, placeholder outlines, strokes, decoration — needs 3:1 (WCAG 1.4.11).
 */
export type TextSize = 'small' | 'large' | 'non-text';

export const WCAG_AA_MINIMUM: Readonly<Record<TextSize, number>> = {
  small: 4.5,
  large: 3,
  'non-text': 3,
};

/** `color-mix(in srgb, <mix> <percent>%, <with>)`, resolved to a hex color by the contrast tests. */
export interface ColorMix {
  mix: TokenName;
  percent: number;
  with: TokenName;
}

export type ColorSpec = TokenName | ColorMix;

export interface TokenPair {
  use: string;
  foreground: ColorSpec;
  background: ColorSpec;
  size: TextSize;
}

/** Image placeholder surface: color-mix(in srgb, var(--label-brown) 12%, var(--cream)). */
const PLACEHOLDER_SURFACE: ColorMix = { mix: 'label-brown', percent: 12, with: 'cream' };

export const TOKEN_PAIRS: readonly TokenPair[] = [
  // Contrast decisions (spec, binding).
  { use: 'large display text (hero/manifiesto/cómo pedir em, step numbers)', foreground: 'terracotta', background: 'cream', size: 'large' },
  { use: 'stamps, SVG strokes and borders', foreground: 'terracotta', background: 'cream', size: 'non-text' },
  { use: 'eyebrows, nav links, titles, chips, card names', foreground: 'green', background: 'cream', size: 'small' },
  { use: 'Jujuy panel province name', foreground: 'cream', background: 'panel-jujuy', size: 'large' },
  { use: 'Salta panel text', foreground: 'cream', background: 'panel-salta', size: 'small' },
  { use: 'Río Negro panel text', foreground: 'cream', background: 'panel-rio-negro', size: 'small' },
  { use: 'Litoral panel text', foreground: 'ink', background: 'panel-litoral', size: 'small' },
  { use: 'La ronda de ferias text, mustard button', foreground: 'ink', background: 'mustard', size: 'small' },
  { use: 'product metadata', foreground: 'label-brown', background: 'cream', size: 'small' },

  // Pairs used by the sections (audit).
  { use: 'recorrido eyebrow, progress counter, cerámica card eyebrow', foreground: 'mustard', background: 'green', size: 'small' },
  { use: 'ferias title', foreground: 'green', background: 'mustard', size: 'large' },
  { use: 'Buenos Aires panel text', foreground: 'ink', background: 'panel-buenos-aires', size: 'small' },
  { use: 'featured card, product card and Jujuy card body text', foreground: 'ink', background: 'cream', size: 'small' },
  { use: 'hero subcopy, pillar text, fair details, step text, empty state', foreground: 'ink-muted', background: 'cream', size: 'small' },
  { use: 'buttons, ticker, map pane, footer, pressed chip, cerámica card, skip link', foreground: 'cream', background: 'green', size: 'small' },
  { use: 'primary button hover (.btn--primary:hover)', foreground: 'cream', background: 'ink', size: 'small' },
  { use: 'image placeholder label text (manifiesto arch, featured media, product card)', foreground: 'ink', background: PLACEHOLDER_SURFACE, size: 'small' },
  { use: 'placeholder outline on the image placeholder surface', foreground: 'green', background: PLACEHOLDER_SURFACE, size: 'non-text' },
  { use: 'manifiesto sticker (>= 24 px)', foreground: 'cream', background: 'terracotta', size: 'large' },
  { use: 'progress fill, ticker separators', foreground: 'mustard', background: 'green', size: 'non-text' },

  // Focus rings (--focus-ring per surface).
  { use: 'focus ring on cream', foreground: 'green', background: 'cream', size: 'non-text' },
  { use: 'focus ring on green surfaces', foreground: 'cream', background: 'green', size: 'non-text' },
  { use: 'focus ring on ferias (mustard)', foreground: 'green', background: 'mustard', size: 'non-text' },
  { use: 'focus ring on light-text panels (Salta)', foreground: 'cream', background: 'panel-salta', size: 'non-text' },
  { use: 'focus ring on light-text panels (Jujuy)', foreground: 'cream', background: 'panel-jujuy', size: 'non-text' },
  { use: 'focus ring on light-text panels (Río Negro)', foreground: 'cream', background: 'panel-rio-negro', size: 'non-text' },
  { use: 'focus ring on dark-text panels (Litoral)', foreground: 'green', background: 'panel-litoral', size: 'non-text' },
  { use: 'focus ring on dark-text panels (Buenos Aires)', foreground: 'green', background: 'panel-buenos-aires', size: 'non-text' },
  { use: 'skip link focus outline on the page', foreground: 'ink', background: 'cream', size: 'non-text' },

  // Placeholder marker outline (--placeholder-ink per surface).
  { use: 'placeholder outline on cream', foreground: 'green', background: 'cream', size: 'non-text' },
  { use: 'placeholder outline on green surfaces', foreground: 'cream', background: 'green', size: 'non-text' },
  { use: 'placeholder outline on the sticker', foreground: 'cream', background: 'terracotta', size: 'non-text' },
  { use: 'placeholder outline on Salta', foreground: 'cream', background: 'panel-salta', size: 'non-text' },
  { use: 'placeholder outline on Jujuy', foreground: 'cream', background: 'panel-jujuy', size: 'non-text' },
  { use: 'placeholder outline on Río Negro', foreground: 'cream', background: 'panel-rio-negro', size: 'non-text' },
  { use: 'placeholder outline on Litoral', foreground: 'ink', background: 'panel-litoral', size: 'non-text' },
  { use: 'placeholder outline on Buenos Aires', foreground: 'ink', background: 'panel-buenos-aires', size: 'non-text' },
  { use: 'placeholder outline on mustard', foreground: 'ink', background: 'mustard', size: 'non-text' },
];

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** WCAG relative luminance of a validated `#rrggbb` color. */
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * WCAG 2.1 contrast ratio (1–21) between two `#rrggbb` colors, order independent.
 * @throws {TypeError} "invalid hex color" when either argument is not `#rrggbb`.
 */
export function contrastRatio(hexA: string, hexB: string): number {
  if (typeof hexA !== 'string' || typeof hexB !== 'string' || !HEX_COLOR.test(hexA) || !HEX_COLOR.test(hexB)) {
    throw new TypeError('invalid hex color');
  }
  const [lighter, darker] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
