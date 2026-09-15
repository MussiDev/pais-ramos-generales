import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * NFR-04 / WCAG 2.1 AA: axe scan of the production build on desktop and mobile, with motion
 * allowed (desktop, mobile) and with prefers-reduced-motion (reduced-motion project).
 * The no-js project is covered by structure.e2e.ts; axe itself needs script evaluation.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

/** Scroll positions scanned: the whole page at rest, El recorrido mid-way and the footer. */
const POSITIONS = ['top', 'recorrido', 'bottom'] as const;

async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 400)));
      }),
  );
}

async function scrollTo(page: Page, position: (typeof POSITIONS)[number]) {
  await page.evaluate((where) => {
    const root = document.scrollingElement ?? document.documentElement;
    let y = 0;
    if (where === 'bottom') y = root.scrollHeight;
    if (where === 'recorrido') {
      const section = document.querySelector<HTMLElement>('#recorrido');
      if (section) y = section.getBoundingClientRect().top + window.scrollY + section.offsetHeight / 2;
    }
    window.scrollTo(0, y);
  }, position);
  await settle(page);
}

test.describe('accessibility', () => {
  test('no serious or critical axe violations', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'no-js', 'axe needs script evaluation');

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', /animated|static/);

    const found: string[] = [];
    for (const position of POSITIONS) {
      await scrollTo(page, position);
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      for (const violation of violations) {
        if (!BLOCKING_IMPACTS.has(violation.impact ?? '')) continue;
        const targets = violation.nodes
          .slice(0, 5)
          .map((node) => `${node.target.join(' ')} — ${node.failureSummary?.split('\n').slice(1).join(' ')}`)
          .join('\n      ');
        found.push(`[${position}] ${violation.id} (${violation.impact}): ${violation.help}\n      ${targets}`);
      }
    }

    expect(found, `axe violations on ${testInfo.project.name}:\n${found.join('\n')}`).toEqual([]);
  });
});
