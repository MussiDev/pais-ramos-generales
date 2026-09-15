// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { BUDGET_BYTES, checkBundleSize, measureBundle } from './check-bundle-size.mjs';

const SCRIPT = fileURLToPath(new URL('./check-bundle-size.mjs', import.meta.url));
const temps: string[] = [];

/** A temp project root, optionally with dist/_astro files ({ name: contents }). */
function project(files?: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'bundle-size-'));
  temps.push(root);
  if (files) {
    const astro = join(root, 'dist', '_astro');
    mkdirSync(astro, { recursive: true });
    for (const [name, contents] of Object.entries(files)) writeFileSync(join(astro, name), contents);
  }
  return root;
}

/** Incompressible JavaScript: base64 of random bytes gzips to roughly its byte count. */
const incompressible = (bytes: number) =>
  `export const x = "${randomBytes(bytes).toString('base64')}";`;

function run(cwd: string) {
  const result = spawnSync(process.execPath, [SCRIPT], { cwd, encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('check-bundle-size.mjs', () => {
  it('budget is 120 KB gzipped', () => {
    expect(BUDGET_BYTES).toBe(120_000);
  });

  it('exits 1 when dist is missing', () => {
    const { status, output } = run(project());
    expect(status).toBe(1);
    expect(output).toContain('run pnpm build first');
  });

  it('exits non-zero naming the metric when the budget is exceeded', () => {
    const { status, output } = run(project({ 'big.js': incompressible(200_000), 'small.js': 'a' }));
    expect(status).not.toBe(0);
    expect(output).toMatch(/JavaScript gzipped/);
    expect(output).toMatch(/exceeds/);
    expect(output).toMatch(/120(\.0)? KB/);
  });

  it('exits 0 and reports the size when the bundle is within budget', () => {
    const { status, output } = run(
      project({ 'a.js': 'console.log(1);'.repeat(500), 'b.css': incompressible(400_000) }),
    );
    expect(status).toBe(0);
    expect(output).toMatch(/JavaScript gzipped: \d+(\.\d+)? KB/);
  });

  it('measures only dist/_astro/*.js, summing gzipped sizes', () => {
    const root = project({
      'a.js': incompressible(30_000),
      'b.js': incompressible(30_000),
      'c.css': incompressible(90_000),
    });
    const { files, gzipBytes } = measureBundle(join(root, 'dist'));
    expect(files.map((file: { name: string }) => file.name).sort()).toEqual(['a.js', 'b.js']);
    expect(gzipBytes).toBeGreaterThan(55_000);
    expect(gzipBytes).toBeLessThan(90_000);
  });

  it('checkBundleSize returns a failing result for a missing dist without throwing', () => {
    const result = checkBundleSize({ distDir: join(project(), 'dist') });
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('run pnpm build first');
  });
});
