import { expect, test, type Page, type TestInfo } from '@playwright/test';

const SECTION_IDS = [
  'hero',
  'manifiesto',
  'recorrido',
  'despensa',
  'ferias',
  'como-pedir',
  'contacto',
] as const;

/** Motion tests need JavaScript and a motion-friendly preference. */
function skipUnlessAnimated(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name === 'no-js' || testInfo.project.name === 'reduced-motion',
    'motion only runs with JavaScript and without prefers-reduced-motion',
  );
}

async function scrollToY(page: Page, y: number) {
  await page.evaluate(async (target) => {
    window.scrollTo(0, target);
    // Two frames: one for the scroll event, one for the ticker to apply the scrubbed values.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }, y);
}

/** Document offset of an element, independent of transforms applied to its ancestors. */
async function documentTop(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate((element) => {
    return element.getBoundingClientRect().top + window.scrollY;
  });
}

/** Rotation (degrees) and uniform scale read from the computed transform matrix. */
async function transformOf(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const { transform } = getComputedStyle(element);
    if (transform === 'none') return { transform, rotation: 0, scale: 1 };
    const matrix = new DOMMatrixReadOnly(transform);
    return {
      transform,
      rotation: (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI,
      scale: Math.hypot(matrix.a, matrix.b),
    };
  });
}

/** Computed transforms of an element and all its descendants, as one comparable string. */
async function transformSnapshot(page: Page, selector: string): Promise<string> {
  return page.locator(selector).evaluate((root) =>
    [root, ...Array.from(root.querySelectorAll('*'))]
      .map((element) => getComputedStyle(element).transform)
      .join('|'),
  );
}

async function expectKeepsAnimating(page: Page, selector: string) {
  const before = await transformSnapshot(page, selector);
  await expect
    .poll(() => transformSnapshot(page, selector), {
      message: `${selector} keeps animating`,
      timeout: 3_000,
    })
    .not.toBe(before);
}

async function waitForMotion(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'animated');
  await expect(page.locator('html')).toHaveClass(/\bis-animated\b/);
}

async function expectHeroScaledUnderManifiesto(page: Page) {
  const manifiestoTop = await documentTop(page, '#manifiesto');
  await scrollToY(page, manifiestoTop);
  // Poll the distance to 0.92 so the assertion is exactly the range [0.90, 0.94].
  await expect
    .poll(async () => Math.abs((await transformOf(page, '#hero')).scale - 0.92), {
      message: 'hero scale while the manifiesto covers it is 0.92 ± 0.02',
      timeout: 3_000,
    })
    .toBeLessThanOrEqual(0.02 + 1e-6);

  // The manifiesto really covers the hero: it sits at the top of the viewport.
  const manifiestoViewportTop = await page
    .locator('#manifiesto')
    .evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(manifiestoViewportTop)).toBeLessThanOrEqual(2);
}

/** No section is transformed, fixed or pinned, and all seven are visible. */
async function expectStaticSections(page: Page) {
  const offenders = await page.evaluate(() =>
    Array.from(document.querySelectorAll('main section, footer, footer section'))
      .map((element) => {
        const style = getComputedStyle(element);
        return { id: element.id || element.tagName, transform: style.transform, position: style.position };
      })
      .filter((entry) => entry.transform !== 'none' || entry.position === 'fixed'),
  );
  expect(offenders).toEqual([]);
  await expect(page.locator('.pin-spacer')).toHaveCount(0);

  for (const id of SECTION_IDS) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }

  const hiddenContent = await page.evaluate(() =>
    Array.from(document.querySelectorAll('main *, footer *'))
      .filter((element) => {
        const style = getComputedStyle(element);
        return (
          (style.opacity === '0' || style.visibility === 'hidden') &&
          (element.textContent ?? '').trim() !== '' &&
          !element.closest('[data-empty], .chips')
        );
      })
      .map((element) => element.outerHTML.slice(0, 80)),
  );
  expect(hiddenContent).toEqual([]);
}

/** Serves the page with an attribute hook stripped from the markup. */
async function serveWithout(page: Page, attribute: string) {
  await page.route('/', async (route) => {
    const response = await route.fetch();
    const pattern = new RegExp(`\\s${attribute}(?=[\\s>=])`, 'g');
    const html = (await response.text()).replace(pattern, '');
    expect(html).not.toContain(attribute);
    await route.fulfill({ response, body: html });
  });
}

function collectWarnings(page: Page): string[] {
  const warnings: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  return warnings;
}

test.describe('motion', () => {
  test('hero jar rotation stays within ±6° and hero scales to 0.92 ± 0.02 under the manifiesto', async ({
    page,
  }, testInfo) => {
    skipUnlessAnimated(testInfo);
    await page.goto('/');
    await waitForMotion(page);

    const heroHeight = await page.locator('#hero').evaluate((element) => (element as HTMLElement).offsetHeight);
    const rotations: number[] = [];
    for (const fraction of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      await scrollToY(page, Math.round(heroHeight * fraction));
      await page.waitForTimeout(150);
      rotations.push((await transformOf(page, '[data-hero-jar]')).rotation);
    }

    for (const rotation of rotations) {
      expect(Math.abs(rotation), `jar rotation ${rotation}`).toBeLessThanOrEqual(6.05);
    }
    // The rotation is tied to scroll: it actually changes along the hero.
    expect(Math.max(...rotations) - Math.min(...rotations)).toBeGreaterThan(2);

    await expectHeroScaledUnderManifiesto(page);
  });

  test('stamp and ticker keep animating after scroll', async ({ page }, testInfo) => {
    skipUnlessAnimated(testInfo);
    await page.goto('/');
    await waitForMotion(page);

    const heroHeight = await page.locator('#hero').evaluate((element) => (element as HTMLElement).offsetHeight);
    await scrollToY(page, Math.round(heroHeight * 0.4));
    await scrollToY(page, Math.round(heroHeight * 0.1));

    await expectKeepsAnimating(page, '#hero [data-stamp]');
    await expectKeepsAnimating(page, '#hero [data-ticker]');

    // The ticker loops horizontally only.
    const trackTransform = await page
      .locator('#hero [data-ticker] .ticker__track')
      .evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform));
    expect(trackTransform.f).toBe(0);
  });

  test('no pinned or transformed sections and all seven visible', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'reduced-motion', 'runs with reduced motion emulated');
    await page.goto('/');

    // The bootstrap ran and deliberately kept the static layout.
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'static');
    await expect(page.locator('html')).not.toHaveClass(/\bis-animated\b/);

    for (const selector of ['#manifiesto', '#recorrido', '#como-pedir', '#contacto']) {
      await scrollToY(page, await documentTop(page, selector));
      await page.waitForTimeout(100);
      await expectStaticSections(page);
    }
  });

  test('switching to reduced motion after load reverts pins, transforms and smooth scroll', async ({
    page,
  }, testInfo) => {
    skipUnlessAnimated(testInfo);
    await page.goto('/');
    await waitForMotion(page);

    // Motion is really active first: the hero is pinned and scaled under the manifiesto.
    await expectHeroScaledUnderManifiesto(page);
    expect(await page.locator('.pin-spacer').count()).toBeGreaterThan(0);

    await page.emulateMedia({ reducedMotion: 'reduce' });

    await expect(page.locator('html')).toHaveAttribute('data-motion', 'static');
    await expect(page.locator('html')).not.toHaveClass(/\bis-animated\b/);
    await expect(page.locator('html')).not.toHaveClass(/\blenis\b/);

    for (const selector of ['#hero', '#manifiesto', '#como-pedir', '#contacto']) {
      await scrollToY(page, await documentTop(page, selector));
      await expectStaticSections(page);
    }

    // Loops and scroll-tied transforms are reverted too.
    for (const selector of [
      '[data-hero-jar]',
      '[data-stamp] .stamp__ring',
      '[data-ticker] .ticker__track',
      '[data-footer-wordmark]',
    ]) {
      expect((await transformOf(page, selector)).transform, selector).toBe('none');
    }
  });

  test('content stays visible when GSAP fails to load', async ({ page }, testInfo) => {
    skipUnlessAnimated(testInfo);
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text());
    });

    let blocked = 0;
    await page.route('**/_astro/*.js', async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      // GSAP chunks carry GreenSock's license banner / gsap.com links.
      if (/GreenSock|gsap\.com/i.test(body)) {
        blocked += 1;
        await route.abort('failed');
        return;
      }
      await route.fulfill({ response, body });
    });

    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('data-motion', 'disabled');
    expect(blocked, 'the GSAP chunk was requested and blocked').toBeGreaterThan(0);
    await expect.poll(() => warnings.some((text) => text.includes('motion disabled'))).toBe(true);
    await expect(page.locator('html')).not.toHaveClass(/\bis-animated\b/);

    for (const selector of ['#hero', '#manifiesto', '#como-pedir', '#contacto']) {
      await scrollToY(page, await documentTop(page, selector));
      await expectStaticSections(page);
    }
  });

  test('missing timeline target logs a warning and other sections still animate', async ({
    page,
  }, testInfo) => {
    skipUnlessAnimated(testInfo);
    const warnings = collectWarnings(page);
    await serveWithout(page, 'data-ticker');

    await page.goto('/');
    await waitForMotion(page);

    await expect
      .poll(() => warnings.some((text) => text.includes('[data-ticker]')), {
        message: 'a warning names the missing selector',
      })
      .toBe(true);

    await expectKeepsAnimating(page, '#hero [data-stamp]');
    expect((await transformOf(page, '[data-hero-jar]')).transform).not.toBe('none');
    await expectHeroScaledUnderManifiesto(page);
  });

  test('missing stacking target logs a warning and the hero still animates', async ({
    page,
  }, testInfo) => {
    skipUnlessAnimated(testInfo);
    const warnings = collectWarnings(page);
    await serveWithout(page, 'data-footer-wordmark');

    await page.goto('/');
    await waitForMotion(page);

    await expect
      .poll(() => warnings.some((text) => text.includes('[data-footer-wordmark]')), {
        message: 'a warning names the missing stacking selector',
      })
      .toBe(true);

    await expectKeepsAnimating(page, '#hero [data-stamp]');
    await expectKeepsAnimating(page, '#hero [data-ticker]');
    await expectHeroScaledUnderManifiesto(page);
  });
});
