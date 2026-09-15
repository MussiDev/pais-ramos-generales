/**
 * `pnpm lighthouse`: runs `lhci autorun` (config and assertions in lighthouserc.json) with an
 * explicit Chrome binary.
 *
 * The security override `@puppeteer/browsers@^3` (pnpm-workspace.yaml, removes the vulnerable
 * extract-zip) makes the puppeteer-core 24 bundled with @lhci/cli throw while guessing its default
 * Chrome path. lhci skips that guess whenever CHROME_PATH is set, so this wrapper sets it to
 * Playwright's Chromium (already installed for the e2e suite) unless the caller provides one.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';

const chromePath = process.env.CHROME_PATH || chromium.executablePath();
if (!existsSync(chromePath)) {
  console.error(
    `lighthouse: Chrome not found at ${chromePath}. Run \`pnpm exec playwright install chromium\` or set CHROME_PATH.`,
  );
  process.exit(1);
}

const require = createRequire(import.meta.url);
const lhciBin = require.resolve('@lhci/cli/src/cli.js');
const result = spawnSync(process.execPath, [lhciBin, 'autorun', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, CHROME_PATH: chromePath },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
