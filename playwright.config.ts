import { defineConfig, devices } from '@playwright/test';

// Dedicated port: e2e always runs against its own production preview, never a running `pnpm dev`
// (4321). Set PW_REUSE=1 to reuse a preview that is already running on this port.
const PORT = 4322;
const BASE_URL = `http://localhost:${PORT}`;
const PERF_SPECS = '**/perf.e2e.ts';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: PERF_SPECS,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      testIgnore: PERF_SPECS,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'no-js',
      testIgnore: PERF_SPECS,
      use: { ...devices['Desktop Chrome'], javaScriptEnabled: false },
    },
    {
      name: 'reduced-motion',
      testIgnore: PERF_SPECS,
      use: { ...devices['Desktop Chrome'], contextOptions: { reducedMotion: 'reduce' } },
    },
    {
      // NFR-06 frame sampling: runs after every other project finishes, one test at a time, so
      // parallel workers never compete for the CPU being measured.
      name: 'perf',
      testMatch: PERF_SPECS,
      dependencies: ['desktop', 'mobile', 'no-js', 'reduced-motion'],
      fullyParallel: false,
      workers: 1,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    // Not `astro preview`: since Astro 7 it detaches into the background under AI-agent
    // environments and exits, which the runner reports as an early exit (see the script).
    command: `pnpm build && node scripts/preview-server.mjs --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !!process.env.PW_REUSE,
    timeout: 180_000,
  },
});
