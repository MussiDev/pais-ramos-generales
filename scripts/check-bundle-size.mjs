#!/usr/bin/env node
/**
 * NFR-03: total JavaScript shipped <= 120 KB gzipped. Sums the gzipped size of every
 * `dist/_astro/*.js` file of the production build.
 *
 * Usage: `pnpm build && pnpm check:size` (optional first argument: the dist directory).
 * Exit codes: 0 within budget, 1 dist missing ("run pnpm build first") or budget exceeded.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

/** 120 KB (1 KB = 1000 bytes). */
export const BUDGET_BYTES = 120_000;
export const METRIC = 'JavaScript gzipped';

const kb = (bytes) => `${(bytes / 1000).toFixed(1)} KB`;

/**
 * Gzipped size (level 9) of each `.js` file directly inside `<distDir>/_astro`.
 * @param {string} distDir
 * @returns {{ files: { name: string, bytes: number, gzipBytes: number }[], gzipBytes: number }}
 */
export function measureBundle(distDir) {
  const assets = join(distDir, '_astro');
  const files = existsSync(assets)
    ? readdirSync(assets)
        .filter((name) => name.endsWith('.js') && statSync(join(assets, name)).isFile())
        .map((name) => {
          const contents = readFileSync(join(assets, name));
          return { name, bytes: contents.length, gzipBytes: gzipSync(contents, { level: 9 }).length };
        })
    : [];
  return { files, gzipBytes: files.reduce((total, file) => total + file.gzipBytes, 0) };
}

/**
 * @param {{ distDir?: string, budgetBytes?: number }} [options]
 * @returns {{ exitCode: 0 | 1, message: string, gzipBytes?: number }}
 */
export function checkBundleSize({ distDir = resolve('dist'), budgetBytes = BUDGET_BYTES } = {}) {
  if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
    return { exitCode: 1, message: `check:size: ${distDir} not found, run pnpm build first` };
  }

  const { files, gzipBytes } = measureBundle(distDir);
  const lines = files
    .sort((a, b) => b.gzipBytes - a.gzipBytes)
    .map((file) => `  ${file.name.padEnd(48)} ${kb(file.gzipBytes).padStart(9)}`);
  const summary = `${METRIC}: ${kb(gzipBytes)} of ${kb(budgetBytes)} budget (${files.length} files)`;

  if (gzipBytes > budgetBytes) {
    return {
      exitCode: 1,
      gzipBytes,
      message: [...lines, `FAIL ${METRIC} ${kb(gzipBytes)} exceeds the ${kb(budgetBytes)} budget (NFR-03)`].join('\n'),
    };
  }
  return { exitCode: 0, gzipBytes, message: [...lines, summary].join('\n') };
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  const result = checkBundleSize({ distDir: resolve(process.argv[2] ?? 'dist') });
  (result.exitCode === 0 ? console.log : console.error)(result.message);
  process.exitCode = result.exitCode;
}
