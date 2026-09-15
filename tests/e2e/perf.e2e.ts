import { expect, test } from '@playwright/test';

/**
 * NFR-06: scroll animations sustain >= 55 fps on average during El recorrido on a mid-range
 * profile (Chrome DevTools 4x CPU throttling). Desktop only: that is where the map is pinned, the
 * route is scrubbed and products are revealed. Runs in the `perf` Playwright project, after every
 * other project and alone, so parallel workers do not compete for the CPU being measured.
 */
const CPU_THROTTLING_RATE = 4;
const MIN_AVERAGE_FPS = 55;
const SCROLL_DURATION_MS = 6_000;

test.describe('performance', () => {
  test('average fps ≥ 55 during el recorrido with 4× CPU throttling', async ({ page, browserName }, testInfo) => {
    test.skip(testInfo.project.name !== 'perf', 'runs only in the dedicated perf project');
    test.skip(browserName !== 'chromium', 'CPU throttling needs the Chrome DevTools Protocol');
    test.setTimeout(60_000);

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'animated');

    const { from, to } = await page.locator('#recorrido').evaluate((section: HTMLElement) => {
      const top = section.getBoundingClientRect().top + window.scrollY;
      return { from: Math.round(top), to: Math.round(top + section.offsetHeight - window.innerHeight) };
    });
    expect(to - from, 'el recorrido is taller than the viewport').toBeGreaterThan(1_000);

    // Start just above the section, once everything has been laid out and idle.
    await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, from - 10));
    await page.waitForTimeout(500);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLING_RATE });

    try {
      // Scroll through the section on the page's own frames and count them.
      const sample = await page.evaluate(
        ({ start, end, duration }) =>
          new Promise<{ frames: number; elapsed: number; longest: number; visited: string[] }>((resolve) => {
            const section = document.querySelector<HTMLElement>('#recorrido')!;
            const visited = new Set<string>();
            let first: number | null = null;
            let previous = 0;
            let frames = 0;
            let longest = 0;
            const tick = (now: number) => {
              if (first === null) {
                first = now;
              } else {
                frames += 1;
                longest = Math.max(longest, now - previous);
              }
              previous = now;
              visited.add(section.dataset.stop ?? '');
              const progress = Math.min(1, (now - first) / duration);
              window.scrollTo(0, start + (end - start) * progress);
              if (progress < 1) requestAnimationFrame(tick);
              else resolve({ frames, elapsed: now - first, longest, visited: [...visited] });
            };
            requestAnimationFrame(tick);
          }),
        { start: from, end: to, duration: SCROLL_DURATION_MS },
      );

      const averageFps = sample.frames / (sample.elapsed / 1000);
      testInfo.annotations.push({
        type: 'fps',
        description: `${averageFps.toFixed(1)} fps average, ${sample.frames} frames in ${Math.round(sample.elapsed)} ms, longest frame ${Math.round(sample.longest)} ms, stops ${sample.visited.join(',')}`,
      });
      console.log(`[perf] ${testInfo.annotations.at(-1)?.description}`);

      expect(sample.visited.length, 'the scroll went through every stop').toBeGreaterThanOrEqual(5);
      expect(averageFps, 'average fps during el recorrido').toBeGreaterThanOrEqual(MIN_AVERAGE_FPS);
    } finally {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await cdp.detach();
    }
  });
});
