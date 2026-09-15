// @vitest-environment node
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  SAFETY_CHARACTERS,
  collectGlyphs,
  hashedFontName,
  referencedFontFiles,
  subsetFontFile,
  subsetFonts,
  subsetFontsIntegration,
} from './subset-fonts.mjs';

const require = createRequire(import.meta.url);
// harfbuzzjs and fontverter ship with subset-font; resolve them from there to inspect outputs.
const fromSubsetFont = createRequire(require.resolve('subset-font'));
const FIXTURE_FONT = require.resolve('@fontsource/hanken-grotesk/files/hanken-grotesk-latin-400-normal.woff2');

/** Unicode code points mapped by the font's cmap. */
async function mappedCharacters(file: string): Promise<Set<string>> {
  const fontverter = fromSubsetFont('fontverter');
  const hb = await fromSubsetFont('harfbuzzjs');
  const sfnt: Buffer = await fontverter.convert(readFileSync(file), 'truetype');
  const blob = hb.createBlob(sfnt);
  const face = hb.createFace(blob, 0);
  const codepoints = Array.from(face.collectUnicodes() as Iterable<number>);
  face.destroy();
  blob.destroy();
  return new Set(codepoints.map((codepoint) => String.fromCodePoint(codepoint)));
}

const temps: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'subset-fonts-'));
  temps.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const HTML = `<!doctype html><html><head>
  <title>Título</title>
  <script type="application/ld+json">{"name":"Ж only in json"}</script>
  <style>.x{content:"Щ"}</style>
</head><body>
  <!-- Ю comment -->
  <h1 aria-label="Etiqueta ÿ">Cariño &amp; más &#8364; &#x2192;</h1>
  <img alt="Frasco þ" src="/a.png">
  <p>Cariño otra vez</p>
</body></html>`;

describe('collectGlyphs', () => {
  it('collects the characters of text content and text attributes, decoding entities', () => {
    const glyphs = collectGlyphs([HTML]);
    for (const character of ['C', 'ñ', 'í', '&', '€', '→', 'ÿ', 'þ']) {
      expect(glyphs, character).toContain(character);
    }
  });

  it('ignores scripts, styles and comments', () => {
    const glyphs = collectGlyphs([HTML]);
    expect(glyphs, 'the visible text is still collected').toContain('ñ');
    for (const character of ['Ж', 'Щ', 'Ю']) expect(glyphs, character).not.toContain(character);
  });

  it('adds glyphs from CSS content strings, including escapes', () => {
    const glyphs = collectGlyphs([], ['.a::before{content:"✦"}.b::after{content:"\\2014"}']);
    expect(glyphs).toContain('✦');
    expect(glyphs).toContain('—');
  });

  it('always includes the safety set', () => {
    const glyphs = collectGlyphs([]);
    const required = [
      ...Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => String.fromCharCode(0x20 + i)),
      ...'áéíóúüñÁÉÍÓÚÜÑ¿¡«»“”‘’–—…·✦0123456789',
    ];
    for (const character of required) {
      expect(SAFETY_CHARACTERS, character).toContain(character);
      expect(glyphs, character).toContain(character);
    }
  });

  it('dedupes and sorts by code point (deterministic), without control characters', () => {
    const glyphs = [...collectGlyphs([HTML, HTML], ['.a{content:"✦"}'])];
    // 95 printable ASCII characters at least (the safety set alone).
    expect(glyphs.length).toBeGreaterThanOrEqual(95);
    expect(new Set(glyphs).size).toBe(glyphs.length);
    const codepoints = glyphs.map((character) => character.codePointAt(0)!);
    expect(codepoints).toEqual([...codepoints].sort((a, b) => a - b));
    expect(codepoints.every((codepoint) => codepoint >= 0x20)).toBe(true);
    expect(collectGlyphs([HTML])).toBe(collectGlyphs([HTML]));
  });
});

describe('referencedFontFiles', () => {
  it('lists the woff2 and woff URLs referenced by the CSS, once each, sorted', () => {
    const css =
      '@font-face{src:url(/_astro/b.woff2) format("woff2"),url(/_astro/b.woff) format("woff")}' +
      '@font-face{src:url("/_astro/a.woff2") format("woff2")}@font-face{src:url(/_astro/a.woff2)}' +
      '.bg{background:url(/_astro/pic.png)}';
    expect(referencedFontFiles(css)).toEqual(['/_astro/a.woff2', '/_astro/b.woff', '/_astro/b.woff2']);
  });
});

describe('subsetFontFile', () => {
  it('overwrites the font with a smaller woff2 that still maps the requested glyphs', async () => {
    const file = join(tempDir(), 'hanken.woff2');
    copyFileSync(FIXTURE_FONT, file);
    const before = statSync(file).size;

    const result = await subsetFontFile(file, 'Hola cariño ¿qué? 0123');

    const after = statSync(file).size;
    expect(result).toEqual({ file, before, after });
    expect(after).toBeLessThan(before);
    expect(readFileSync(file).subarray(0, 4).toString('latin1')).toBe('wOF2');
    const mapped = await mappedCharacters(file);
    for (const character of 'Holacariño¿qué0123') expect(mapped.has(character), character).toBe(true);
    expect(mapped.has('Z'), 'Z was not requested').toBe(false);
  });

  it('is deterministic for the same input and text', async () => {
    const dir = tempDir();
    const [a, b] = [join(dir, 'a.woff2'), join(dir, 'b.woff2')];
    copyFileSync(FIXTURE_FONT, a);
    copyFileSync(FIXTURE_FONT, b);
    await subsetFontFile(a, 'Cariño');
    await subsetFontFile(b, 'Cariño');
    expect(statSync(a).size, 'the font was actually subset').toBeLessThan(statSync(FIXTURE_FONT).size);
    expect(readFileSync(a).equals(readFileSync(b))).toBe(true);
  });

  it('fails loudly when the font file is missing', async () => {
    const file = join(tempDir(), 'missing.woff2');
    await expect(subsetFontFile(file, 'abc')).rejects.toThrow(/subset-fonts: cannot subset .*missing\.woff2/);
  });

  it('fails loudly when the file is not a font', async () => {
    const file = join(tempDir(), 'broken.woff2');
    writeFileSync(file, 'not a font');
    await expect(subsetFontFile(file, 'abc')).rejects.toThrow(/subset-fonts: cannot subset .*broken\.woff2/);
  });
});

describe('hashedFontName', () => {
  const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('base64url').slice(0, 8);

  it('replaces the hash segment with the first 8 base64url chars of sha256(content)', () => {
    const bytes = Buffer.from('subset bytes');
    expect(hashedFontName('cormorant-garamond-latin-600-normal.Co1r35X9.woff2', bytes)).toBe(
      `cormorant-garamond-latin-600-normal.${sha(bytes)}.woff2`,
    );
    expect(hashedFontName('hanken.zIXX3Q-H.woff', bytes)).toBe(`hanken.${sha(bytes)}.woff`);
  });

  it('adds a hash segment to a name that has none', () => {
    const bytes = Buffer.from('x');
    expect(hashedFontName('h.woff2', bytes)).toBe(`h.${sha(bytes)}.woff2`);
  });

  it('gives the same content the same name and different content a different name', () => {
    const name = 'font.OLDHASH1.woff2';
    expect(hashedFontName(name, Buffer.from('a'))).toBe(hashedFontName(name, Buffer.from('a')));
    expect(hashedFontName(name, Buffer.from('a'))).not.toBe(hashedFontName(name, Buffer.from('b')));
  });
});

describe('subsetFonts', () => {
  const OLD = 'h.OLDHASH1.woff2';
  const OLD_URL = `/_astro/${OLD}`;
  const CSS = `@font-face{font-display:swap;src:url(${OLD_URL}) format("woff2")}`;

  function dist({
    css = CSS,
    html = `<html><head><link rel="preload" href="${OLD_URL}" as="font" crossorigin></head><body><h1>Cariño</h1></body></html>`,
    fonts = [OLD],
  }: { css?: string; html?: string; fonts?: string[] } = {}) {
    const root = tempDir();
    mkdirSync(join(root, '_astro'), { recursive: true });
    mkdirSync(join(root, 'nested'), { recursive: true });
    writeFileSync(join(root, 'index.html'), html);
    writeFileSync(join(root, 'nested', 'index.html'), `<p>Otra página</p>${html}`);
    writeFileSync(join(root, '_astro', 'index.css'), css);
    for (const font of fonts) copyFileSync(FIXTURE_FONT, join(root, '_astro', font));
    return root;
  }

  it('subsets every referenced font, renames it by content hash and keeps the glyphs of the built HTML', async () => {
    const root = dist({ fonts: [OLD, 'unreferenced.woff2'] });
    const report = await subsetFonts({ distDir: root });

    expect(report.files).toHaveLength(1);
    const [entry] = report.files;
    expect(entry.url).toBe(OLD_URL);
    expect(entry.hashedUrl).toMatch(/^\/_astro\/h\.[A-Za-z0-9_-]{8}\.woff2$/);
    expect(entry.hashedUrl).not.toBe(OLD_URL);
    expect(report.text).toContain('ñ');

    const renamed = join(root, ...entry.hashedUrl.split('/').filter(Boolean));
    expect(existsSync(join(root, '_astro', OLD)), 'the old file name is gone').toBe(false);
    expect(statSync(renamed).size).toBeLessThan(statSync(FIXTURE_FONT).size);
    expect(hashedFontName(OLD, readFileSync(renamed))).toBe(entry.hashedUrl.split('/').pop());
    expect(statSync(join(root, '_astro', 'unreferenced.woff2')).size).toBe(statSync(FIXTURE_FONT).size);
    expect((await mappedCharacters(renamed)).has('ñ')).toBe(true);
  });

  it('rewrites every reference in CSS and HTML (font-face src and preload href), keeping font-display', async () => {
    const root = dist();
    const { files } = await subsetFonts({ distDir: root });
    const newUrl = files[0].hashedUrl;

    const css = readFileSync(join(root, '_astro', 'index.css'), 'utf8');
    expect(css).toContain(`url(${newUrl})`);
    expect(css).toContain('font-display:swap');
    for (const page of ['index.html', join('nested', 'index.html')]) {
      const html = readFileSync(join(root, page), 'utf8');
      expect(html, page).toContain(`href="${newUrl}"`);
      expect(html, page).not.toContain(OLD);
    }
    expect(css).not.toContain(OLD);
  });

  it('names the subset by its glyph set: different copy gives a different name, the same copy the same name', async () => {
    const cariño = (await subsetFonts({ distDir: dist() })).files[0].hashedUrl;
    const again = (await subsetFonts({ distDir: dist() })).files[0].hashedUrl;
    const other = (await subsetFonts({
      // ß, Æ, ø are in the latin font but not in the safety set, so the glyph set really differs.
      distDir: dist({ html: `<html><head><link rel="preload" href="${OLD_URL}"></head><body>Straße Ærø</body></html>` }),
    })).files[0].hashedUrl;

    expect(again).toBe(cariño);
    expect(other).not.toBe(cariño);
  });

  it('fails when a reference to the old file name remains after rewriting', async () => {
    // A JSON-escaped path is not a plain URL reference, so it cannot be rewritten safely.
    const root = dist({
      html: `<html><body><h1>Cariño</h1><script type="application/json">{"font":"\\/_astro\\/${OLD}"}</script></body></html>`,
    });
    await expect(subsetFonts({ distDir: root })).rejects.toThrow(
      /subset-fonts: stale reference to h\.OLDHASH1\.woff2 in .*index\.html/,
    );
  });

  it('fails when the hashed name already exists with different content', async () => {
    const root = dist();
    // Predict the hashed name: same glyph set and same input font as subsetFonts will use.
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    const nested = readFileSync(join(root, 'nested', 'index.html'), 'utf8');
    const probe = join(tempDir(), OLD);
    copyFileSync(FIXTURE_FONT, probe);
    await subsetFontFile(probe, collectGlyphs([html, nested], [CSS]));
    const target = join(root, '_astro', hashedFontName(OLD, readFileSync(probe)));
    writeFileSync(target, 'different content');

    await expect(subsetFonts({ distDir: root })).rejects.toThrow(/subset-fonts: .*already exists with different content/);
  });

  it('fails when the built CSS references no font URLs', async () => {
    const root = dist({ css: '.a{color:red}', fonts: [] });
    await expect(subsetFonts({ distDir: root })).rejects.toThrow(
      /subset-fonts: no font URLs found in the built CSS/,
    );
  });

  it('rejects when a referenced font file does not exist', async () => {
    const root = dist({ css: '@font-face{src:url(/_astro/gone.woff2) format("woff2")}', fonts: [] });
    await expect(subsetFonts({ distDir: root })).rejects.toThrow(/subset-fonts: cannot subset .*gone\.woff2/);
  });

  it('is exposed as an Astro integration that runs on astro:build:done', () => {
    const integration = subsetFontsIntegration();
    expect(integration.name).toBe('subset-fonts');
    expect(typeof integration.hooks['astro:build:done']).toBe('function');
  });
});
