/**
 * Build-time font subsetting (NFR-01/NFR-02: Lighthouse mobile LCP). After `astro build`, every
 * web font referenced by the built CSS/HTML is replaced with a subset that only keeps the glyphs
 * the built pages use plus a safety set. Each subset is renamed by the hash of its content and
 * every reference (CSS `url()`, preload `href`) is rewritten, so a copy change never ships new
 * glyphs under a URL browsers already cached. `font-display: swap` is untouched. Runs as the `subset-fonts` Astro integration
 * (`astro:build:done`), so the subset is regenerated whenever the copy changes.
 *
 * Output is deterministic: the glyph string is deduped and sorted by code point.
 * Any referenced font that cannot be subset fails the build.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const PRINTABLE_ASCII = Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => String.fromCharCode(0x20 + i)).join('');

/** Always kept, so later copy edits do not render missing glyphs before the next build. */
export const SAFETY_CHARACTERS = `${PRINTABLE_ASCII}áéíóúüñÁÉÍÓÚÜÑ¿¡«»“”‘’–—…·✦`;

/** Attributes whose values browsers render as text. */
const TEXT_ATTRIBUTES = /\s(?:aria-label|alt|title|placeholder)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', laquo: '«', raquo: '»',
  ndash: '–', mdash: '—', hellip: '…', middot: '·', iexcl: '¡', iquest: '¿',
};

function decodeHtmlEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body) => {
    if (body[0] === '#') {
      const codepoint = body[1] === 'x' || body[1] === 'X' ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));
      return Number.isInteger(codepoint) && codepoint <= 0x10ffff ? String.fromCodePoint(codepoint) : entity;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}

function decodeCssString(value) {
  return value
    .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/\\(.)/g, '$1');
}

/** Visible text and text attributes of an HTML document (scripts, styles and comments excluded). */
function htmlText(html) {
  const markup = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, ' ');
  const parts = [];
  for (const tag of markup.match(/<[a-zA-Z][^>]*>/g) ?? []) {
    for (const match of tag.matchAll(TEXT_ATTRIBUTES)) parts.push(match[1] ?? match[2] ?? '');
  }
  parts.push(markup.replace(/<[^>]*>/g, ' '));
  return decodeHtmlEntities(parts.join(' '));
}

/** Strings drawn by CSS `content` declarations. */
function cssContentText(css) {
  const parts = [];
  for (const match of css.matchAll(/content\s*:\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')/g)) {
    parts.push(decodeCssString(match[1] ?? match[2] ?? ''));
  }
  return parts.join('');
}

/**
 * Every character rendered by the given HTML documents and CSS `content` strings, plus the
 * safety set; deduped, without control characters, sorted by code point.
 * @param {string[]} [htmlDocuments]
 * @param {string[]} [cssDocuments]
 * @returns {string}
 */
export function collectGlyphs(htmlDocuments = [], cssDocuments = []) {
  const characters = new Set(SAFETY_CHARACTERS);
  const sources = [...htmlDocuments.map(htmlText), ...cssDocuments.map(cssContentText)];
  for (const source of sources) {
    for (const character of source) {
      const codepoint = character.codePointAt(0);
      if (codepoint < 0x20 || (codepoint >= 0x7f && codepoint <= 0x9f)) continue;
      characters.add(character);
    }
  }
  return [...characters].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join('');
}

/**
 * Root-relative URLs of the woff2/woff files referenced by `url(...)` in CSS, unique and sorted.
 * @param {string} css
 * @returns {string[]}
 */
export function referencedFontFiles(css) {
  const urls = new Set();
  for (const match of css.matchAll(/url\(\s*(['"]?)([^'")]+?\.woff2?)(?:[?#][^'")]*)?\1\s*\)/g)) {
    urls.add(match[2]);
  }
  return [...urls].sort();
}

const HASHED_NAME = /^(.+)\.([^.]+)\.(woff2?)$/i;

/**
 * `<name>.<oldHash>.<ext>` → `<name>.<newHash>.<ext>`, where newHash is the first 8 base64url
 * characters of sha256(content). A name without a hash segment gets one added.
 * @param {string} fileName
 * @param {Buffer} content
 * @returns {string}
 */
export function hashedFontName(fileName, content) {
  const hash = createHash('sha256').update(content).digest('base64url').slice(0, 8);
  const hashed = HASHED_NAME.exec(fileName);
  if (hashed) return `${hashed[1]}.${hash}.${hashed[3]}`;
  const extension = extname(fileName);
  return `${fileName.slice(0, -extension.length)}.${hash}${extension}`;
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Matches `value` not glued to a longer name (so `x.woff` never matches inside `x.woff2`). */
const standalone = (value) => new RegExp(`(?<![\\w.-])${escapeRegExp(value)}(?![\\w.-])`, 'g');

function subsetError(file, reason) {
  return new Error(`subset-fonts: cannot subset ${file}: ${reason}`);
}

/**
 * Overwrites `file` (woff2 or woff) with a subset containing only the glyphs for `text`.
 * @param {string} file
 * @param {string} text
 * @returns {Promise<{ file: string, before: number, after: number }>}
 */
export async function subsetFontFile(file, text) {
  let original;
  try {
    original = await readFile(file);
  } catch (error) {
    throw subsetError(file, error.code === 'ENOENT' ? 'file not found' : error.message);
  }

  const targetFormat = extname(file).toLowerCase() === '.woff' ? 'woff' : 'woff2';
  let subset;
  try {
    subset = await subsetFont(original, text, { targetFormat });
  } catch (error) {
    throw subsetError(file, error instanceof Error ? error.message : String(error));
  }
  if (!subset || subset.length === 0) throw subsetError(file, 'the subset is empty');

  await writeFile(file, subset);
  return { file, before: original.length, after: subset.length };
}

async function filesWithExtension(dir, extension) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name))
    .sort();
}

/** Renames a subset font to its content-hashed name; fails on a same-name file with other content. */
async function renameByContent(file) {
  const content = await readFile(file);
  const hashedName = hashedFontName(basename(file), content);
  const hashedFile = join(dirname(file), hashedName);
  if (hashedFile === file) return hashedFile;

  const existing = await readFile(hashedFile).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (existing && !existing.equals(content)) {
    throw new Error(`subset-fonts: cannot rename ${file}: ${hashedFile} already exists with different content`);
  }
  if (existing) await unlink(file);
  else await rename(file, hashedFile);
  return hashedFile;
}

/**
 * Subsets every font referenced by the built CSS and HTML under `distDir`, renames each one by
 * the hash of its new content and rewrites every reference (CSS `url()`, HTML preload `href`).
 * Fails if the CSS references no fonts, a font cannot be subset or renamed, or an old file name
 * is still referenced afterwards.
 * @param {{ distDir: string }} options
 * @returns {Promise<{ text: string, files: { file: string, url: string, hashedUrl: string, hashedFile: string, before: number, after: number }[] }>}
 */
export async function subsetFonts({ distDir }) {
  const [htmlFiles, cssFiles] = await Promise.all([
    filesWithExtension(distDir, '.html'),
    filesWithExtension(distDir, '.css'),
  ]);
  const documents = new Map();
  for (const file of [...cssFiles, ...htmlFiles]) documents.set(file, await readFile(file, 'utf8'));
  const htmlDocuments = htmlFiles.map((file) => documents.get(file));
  const cssDocuments = cssFiles.map((file) => documents.get(file));

  const cssUrls = new Set(cssDocuments.flatMap(referencedFontFiles));
  if (cssUrls.size === 0) {
    throw new Error(
      `subset-fonts: no font URLs found in the built CSS under ${distDir} (${cssFiles.length} CSS files); has the Astro output format changed?`,
    );
  }

  const text = collectGlyphs(htmlDocuments, cssDocuments);
  const urls = new Set([...cssUrls, ...htmlDocuments.flatMap(referencedFontFiles)]);
  const files = [];
  for (const url of [...urls].sort()) {
    const file = join(distDir, ...url.split('/').filter(Boolean));
    await stat(file).catch(() => {
      throw subsetError(file, `file not found (referenced as ${url})`);
    });
    const result = await subsetFontFile(file, text);
    const hashedFile = await renameByContent(file);
    const hashedUrl = `${url.slice(0, url.lastIndexOf('/') + 1)}${basename(hashedFile)}`;
    files.push({ ...result, url, hashedUrl, hashedFile });
  }

  // One pass per document: every old URL replaced by its hashed URL.
  const renamed = files.filter((entry) => entry.hashedUrl !== entry.url);
  for (const [file, original] of documents) {
    let content = original;
    for (const { url, hashedUrl } of renamed) content = content.replace(standalone(url), hashedUrl);
    if (content !== original) {
      await writeFile(file, content);
      documents.set(file, content);
    }
  }

  // Anything still naming an old file (escaped, relative, ...) would ship a broken font URL.
  for (const [file, content] of documents) {
    for (const { url } of renamed) {
      const oldName = url.slice(url.lastIndexOf('/') + 1);
      if (standalone(oldName).test(content)) {
        throw new Error(`subset-fonts: stale reference to ${oldName} in ${file}`);
      }
    }
  }
  return { text, files };
}

/** Astro integration: subsets the fonts of the production build; a failure fails the build. */
export function subsetFontsIntegration() {
  return {
    name: 'subset-fonts',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const { text, files } = await subsetFonts({ distDir: fileURLToPath(dir) });
        const before = files.reduce((total, file) => total + file.before, 0);
        const after = files.reduce((total, file) => total + file.after, 0);
        logger.info(
          `${files.length} font files subset to ${[...text].length} glyphs: ${(before / 1000).toFixed(1)} KB -> ${(after / 1000).toFixed(1)} KB, renamed by content hash`,
        );
      },
    },
  };
}
