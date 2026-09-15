// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  TOKENS,
  TOKEN_PAIRS,
  WCAG_AA_MINIMUM,
  contrastRatio,
  type ColorSpec,
  type TokenName,
} from './contrast';

const tokensCss = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');

/** Hex value of `--name: #xxxxxx;` in tokens.css. */
function cssToken(name: TokenName): string | undefined {
  return new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(tokensCss)?.[1]?.toLowerCase();
}

/**
 * Resolves a declared color to #rrggbb. `color-mix(in srgb, A p%, B)` interpolates the
 * gamma-encoded channels: p * A + (1 - p) * B, rounded to the nearest 8-bit value.
 */
function resolveColor(color: ColorSpec): string {
  if (typeof color === 'string') return TOKENS[color];
  const channels = (hex: string) => [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  const a = channels(TOKENS[color.mix]);
  const b = channels(TOKENS[color.with]);
  const p = color.percent / 100;
  return `#${a.map((value, i) => Math.round(value * p + b[i] * (1 - p)).toString(16).padStart(2, '0')).join('')}`;
}

/** Rows of the spec's "Contrast decisions" table, with the ratio the human lead approved. */
const CONTRAST_DECISIONS: Array<[TokenName, TokenName, number]> = [
  ['terracotta', 'cream', 3.38],
  ['green', 'cream', 8.22],
  ['cream', 'panel-salta', 5.84],
  ['cream', 'panel-rio-negro', 6.19],
  ['ink', 'mustard', 7.72],
  ['label-brown', 'cream', 5.54],
];

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colors, in either order', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#f3ebdd', '#F3EBDD')).toBeCloseTo(1, 5);
  });

  it.each(CONTRAST_DECISIONS)('%s on %s matches the approved ratio %d:1', (fg, bg, ratio) => {
    expect(contrastRatio(TOKENS[fg], TOKENS[bg])).toBeCloseTo(ratio, 1);
  });

  it('mustard on green is 5.00:1', () => {
    expect(contrastRatio(TOKENS.mustard, TOKENS.green)).toBeCloseTo(5.0, 1);
  });

  it.each(['', '#fff', 'f3ebdd', '#f3ebdg', '#f3ebdd0', ' #f3ebdd', 'red'])(
    'throws on invalid hex %j',
    (value) => {
      expect(() => contrastRatio(value, '#000000')).toThrow(new TypeError('invalid hex color'));
      expect(() => contrastRatio('#000000', value)).toThrow(TypeError);
    },
  );
});

describe('token pairs in use', () => {
  it('uses the palette exactly as declared in tokens.css', () => {
    for (const name of Object.keys(TOKENS) as TokenName[]) {
      expect(cssToken(name), `--${name}`).toBe(TOKENS[name].toLowerCase());
    }
  });

  it('declares every row of the "Contrast decisions" table with a text size', () => {
    for (const [fg, bg] of CONTRAST_DECISIONS) {
      expect(
        TOKEN_PAIRS.some((pair) => pair.foreground === fg && pair.background === bg),
        `${fg} on ${bg}`,
      ).toBe(true);
    }
    // Terracotta is never declared for small text.
    expect(
      TOKEN_PAIRS.filter(
        (pair) =>
          (pair.foreground === 'terracotta' || pair.background === 'terracotta' ||
            pair.background === 'panel-jujuy') &&
          pair.size === 'small',
      ),
    ).toEqual([]);
  });

  it('mixes colors like color-mix(in srgb) (helper sanity check)', () => {
    expect(resolveColor({ mix: 'ink', percent: 100, with: 'cream' })).toBe(TOKENS.ink);
    expect(resolveColor({ mix: 'ink', percent: 0, with: 'cream' })).toBe(TOKENS.cream);
    // label-brown #6b5b43 at 12% over cream #f3ebdd: 0.12 * 107 + 0.88 * 243 = 226.68 -> e3, ...
    expect(resolveColor({ mix: 'label-brown', percent: 12, with: 'cream' })).toBe('#e3dacb');
  });

  it('declares cream on ink for the primary button hover (small text)', () => {
    expect(TOKEN_PAIRS).toContainEqual(
      expect.objectContaining({ foreground: 'cream', background: 'ink', size: 'small' }),
    );
  });

  it('declares the text and outline on the label-brown 12% / cream placeholder surface', () => {
    const surface = { mix: 'label-brown', percent: 12, with: 'cream' };
    // .image-slot--missing label text is ink; the placeholder outline (--placeholder-ink) is green.
    expect(TOKEN_PAIRS).toContainEqual(
      expect.objectContaining({ foreground: 'ink', background: surface, size: 'small' }),
    );
    expect(TOKEN_PAIRS).toContainEqual(
      expect.objectContaining({ foreground: 'green', background: surface, size: 'non-text' }),
    );
  });

  it('every declared token pair meets WCAG AA for its declared text size (table in "Contrast decisions")', () => {
    expect(TOKEN_PAIRS.length).toBeGreaterThanOrEqual(CONTRAST_DECISIONS.length);
    const failures = TOKEN_PAIRS.map((pair) => ({
      ...pair,
      ratio: contrastRatio(resolveColor(pair.foreground), resolveColor(pair.background)),
      minimum: WCAG_AA_MINIMUM[pair.size],
    })).filter((pair) => !(pair.ratio >= pair.minimum));
    expect(failures).toEqual([]);
  });
});
