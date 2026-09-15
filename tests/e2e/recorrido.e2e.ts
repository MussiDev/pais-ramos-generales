import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { recorrido as recorridoCopy } from '../../src/content/copy';
import { provinces } from '../../src/content/provinces';

/** Accessible indicator text, e.g. "Parada 4 de 5" (the visual "04 / 05" is aria-hidden). */
const stopLabel = (index: number) => `${recorridoCopy.stopLabel} ${index + 1} de ${provinces.length}`;

async function scrollToY(page: Page, y: number) {
  await page.evaluate(async (target) => {
    window.scrollTo(0, target);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }, y);
}

/** Waits until the scroll position has been still for a moment (e.g. a Lenis snap has finished). */
async function waitForScrollIdle(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const before = window.scrollY;
          await new Promise((resolve) => setTimeout(resolve, 350));
          return Math.abs(window.scrollY - before);
        }),
      { message: 'scrolling settles', timeout: 5_000 },
    )
    .toBeLessThan(0.5);
}

async function waitForMotion(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'animated');
}

function collectWarnings(page: Page): string[] {
  const warnings: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  return warnings;
}

/** Serves the page with an attribute hook stripped from the markup. */
async function serveWithout(page: Page, pattern: RegExp) {
  await page.route('/', async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(pattern, '');
    expect(pattern.test(html)).toBe(false);
    await route.fulfill({ response, body: html });
  });
}

/** Document offsets of the five stop panels. */
async function stopTops(page: Page): Promise<number[]> {
  return page
    .locator('#recorrido [data-stop-index]:not([data-pin])')
    .evaluateAll((stops) =>
      stops.map((stop) => Math.round(stop.getBoundingClientRect().top + window.scrollY)),
    );
}

async function viewportTop(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate((element) => element.getBoundingClientRect().top);
}

/** A token such as `--panel-salta` resolved to `rgb(r, g, b)`. */
async function tokenAsRgb(page: Page, token: string): Promise<string> {
  return page.evaluate((name) => {
    const probe = document.createElement('i');
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const rgb = getComputedStyle(probe).color;
    probe.remove();
    return rgb;
  }, token);
}

async function indicatorText(page: Page): Promise<string | null> {
  return page.evaluate(
    () => document.querySelector('#recorrido [data-indicator-text]')?.textContent?.trim() ?? null,
  );
}

async function noHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, 'document scrollWidth equals clientWidth').toBe(clientWidth);
}

function onlyDesktop(testInfo: TestInfo) {
  test.skip(testInfo.project.name !== 'desktop', 'the pinned map runs on desktop with motion');
}

test.describe('recorrido', () => {
  test('map stays pinned, indicator reads 0X / 05 and panel color matches the stop token', async ({
    page,
  }, testInfo) => {
    onlyDesktop(testInfo);
    await page.goto('/');
    await waitForMotion(page);

    const tops = await stopTops(page);
    expect(tops).toHaveLength(provinces.length);
    const route = page.locator('#recorrido-route');
    let previousOffset = Number.POSITIVE_INFINITY;

    for (const [index, province] of provinces.entries()) {
      // Land a little past the stop start: snapping must settle back onto the stop.
      await scrollToY(page, tops[index] + (index === 0 ? 0 : 40));
      // A Lenis snap may glide back to the stop start; let it finish before reading and moving on.
      await waitForScrollIdle(page);
      await expect
        .poll(() => page.locator('#recorrido').getAttribute('data-stop'), {
          message: `stop ${index} is active`,
        })
        .toBe(String(index));

      // The map pane stays at the top of the viewport while the stops scroll by.
      expect(Math.abs(await viewportTop(page, '[data-map-pane]')), 'map pane pinned').toBeLessThanOrEqual(2);

      // Panel color: the section exposes the active token and the visible panel paints it.
      const expected = await tokenAsRgb(page, province.panelToken);
      const active = await page
        .locator('#recorrido')
        .evaluate((section) => {
          const probe = document.createElement('i');
          probe.style.color = 'var(--active-panel)';
          section.append(probe);
          const rgb = getComputedStyle(probe).color;
          probe.remove();
          return rgb;
        });
      expect(active, `--active-panel for ${province.id}`).toBe(expected);
      const panelBackground = await page
        .locator(`#recorrido [data-province="${province.id}"]`)
        .evaluate((stop) => getComputedStyle(stop).backgroundColor);
      expect(panelBackground).toBe(expected);

      await expect.poll(() => indicatorText(page)).toBe(stopLabel(index));
      await expect(page.locator('#recorrido [data-indicator-current]')).toHaveText(`0${index + 1}`);

      // The route draws further at every stop.
      const offset = await route.evaluate((path) =>
        Number.parseFloat(getComputedStyle(path).strokeDashoffset),
      );
      expect(offset, `route offset at stop ${index}`).toBeLessThan(previousOffset);
      previousOffset = offset;
    }
    expect(previousOffset).toBeLessThanOrEqual(1);
  });

  test('skip link scrolls to la despensa and focuses its heading', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'no-js', 'the enhanced skip link needs JavaScript');
    await page.goto('/');
    if (testInfo.project.name === 'reduced-motion') {
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'static');
    } else {
      await waitForMotion(page);
    }

    await scrollToY(page, (await stopTops(page))[1]);
    await page.locator('#recorrido [data-skip-link]').click();

    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id), {
        message: 'the despensa heading has focus',
      })
      .toBe('despensa-title');
    await expect
      .poll(async () => Math.abs(await viewportTop(page, '#despensa')), {
        message: 'la despensa reaches the top of the viewport',
        timeout: 5_000,
      })
      .toBeLessThanOrEqual(2);
    await expect(page).toHaveURL(/#despensa$/);
  });

  test('map is a sticky strip, stops are vertical, no horizontal scroll', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile layout');
    await page.goto('/');
    await waitForMotion(page);

    // No pin context below 768 px: no pin spacer inside the section, the strip is CSS sticky.
    await expect(page.locator('#recorrido .pin-spacer')).toHaveCount(0);
    const map = page.locator('#recorrido [data-map-pane]');
    expect(await map.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');

    const tops = await stopTops(page);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const stripHeight = await map.evaluate((element) => element.getBoundingClientRect().height);
    expect(stripHeight).toBeLessThanOrEqual(viewportHeight * 0.5);

    for (const [index, top] of tops.entries()) {
      await scrollToY(page, top + 120);
      expect(Math.abs(await viewportTop(page, '[data-map-pane]')), `strip sticks at stop ${index}`).toBeLessThanOrEqual(2);
      await noHorizontalScroll(page);
      // Without a pin context the indicator still follows the stop in view.
      await expect.poll(() => indicatorText(page), { message: `indicator at stop ${index}` }).toBe(stopLabel(index));
      await expect(page.locator('#recorrido [data-indicator-current]')).toHaveText(`0${index + 1}`);
      await expect(page.locator('#recorrido')).toHaveAttribute('data-stop', String(index));
    }

    // Stops stack vertically at full width (layout offsets: the stacking may be scaling the section).
    const boxes = await page
      .locator('#recorrido [data-stop-index]:not([data-pin])')
      .evaluateAll((stops) =>
        stops.map((stop) => {
          const element = stop as HTMLElement;
          return { left: element.offsetLeft, width: element.offsetWidth, top: element.offsetTop };
        }),
      );
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    for (const [index, box] of boxes.entries()) {
      expect(box.left).toBe(0);
      expect(box.width).toBe(clientWidth);
      if (index > 0) expect(box.top).toBeGreaterThan(boxes[index - 1].top);
    }

    await scrollToY(page, await page.locator('#despensa').evaluate((el) => el.getBoundingClientRect().top + window.scrollY));
    await noHorizontalScroll(page);
  });

  test('stops still activate when the route path is missing', async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    const warnings = collectWarnings(page);
    await serveWithout(page, /\sdata-route(?=[\s>=])/g);

    await page.goto('/');
    await waitForMotion(page);

    await expect
      .poll(() => warnings.some((text) => text.includes('[data-route]')), {
        message: 'a warning names the missing route selector',
      })
      .toBe(true);

    const tops = await stopTops(page);
    await scrollToY(page, tops[2]);
    await expect
      .poll(() => page.locator('#recorrido').getAttribute('data-stop'))
      .toBe('2');
    await expect.poll(() => indicatorText(page)).toBe(stopLabel(2));
    expect(Math.abs(await viewportTop(page, '[data-map-pane]'))).toBeLessThanOrEqual(2);
  });

  test('skip link falls back to anchor jump when the script is disabled', async ({
    browser,
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'no-js', 'covered by the explicit no-JS context below');
    const baseURL = testInfo.project.use.baseURL;

    // 1. Without JavaScript the native anchor does the job.
    const noJs = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const staticPage = await noJs.newPage();
    await staticPage.goto('/');
    await staticPage.locator('#recorrido [data-skip-link]').click();
    await expect(staticPage).toHaveURL(/#despensa$/);
    await expect
      .poll(async () => Math.abs(await viewportTop(staticPage, '#despensa')))
      .toBeLessThanOrEqual(2);
    await noJs.close();

    // 2. With JavaScript but no heading to focus, the script leaves the native jump in place.
    const warnings = collectWarnings(page);
    await serveWithout(page, /\sid="despensa-title"/g);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', /animated|static/);
    await expect
      .poll(() => warnings.some((text) => text.includes('#despensa-title')), {
        message: 'the skip link warns that its focus target is missing',
      })
      .toBe(true);

    await page.locator('#recorrido [data-skip-link]').click();
    await expect(page).toHaveURL(/#despensa$/);
    await expect
      .poll(async () => Math.abs(await viewportTop(page, '#despensa')), { timeout: 5_000 })
      .toBeLessThanOrEqual(2);
  });

  test('featured card keeps a readable text column at 1024 and 1280 px, also without JavaScript', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop' && testInfo.project.name !== 'no-js',
      'intermediate desktop widths, with and without JavaScript',
    );
    for (const [width, height] of [
      [1024, 768],
      [1280, 720],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      const columns = await page
        .locator('#recorrido .featured__text')
        .evaluateAll((bodies) =>
          bodies.map((body) => ({
            stop: body.closest('[data-province]')?.getAttribute('data-province'),
            width: (body as HTMLElement).offsetWidth,
          })),
        );
      expect(columns).toHaveLength(provinces.length);
      for (const column of columns) {
        expect(column.width, `${column.stop} text column at ${width}px`).toBeGreaterThanOrEqual(200);
      }
    }

    if (testInfo.project.name === 'no-js') {
      // Without JavaScript nothing moves the active stop, so no pin is dimmed as "ahead".
      const dimmed = await page
        .locator('#recorrido .map__pin-dot')
        .evaluateAll((dots) => dots.filter((dot) => getComputedStyle(dot).opacity !== '1').length);
      expect(dimmed, 'dimmed pins without JavaScript').toBe(0);
    }
  });

  test('snaps onto the stop start after a wheel scroll near a stop boundary', async ({
    page,
  }, testInfo) => {
    onlyDesktop(testInfo);
    await page.goto('/');
    await waitForMotion(page);

    const tops = await stopTops(page);
    await scrollToY(page, tops[1]);
    await page.waitForTimeout(600);
    await page.mouse.move(900, 450);
    // A real wheel gesture (through Lenis) that stops 60 px short of stop 3.
    await page.mouse.wheel(0, tops[2] - tops[1] - 60);

    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)), {
        message: 'scroll settles on the start of stop 3',
        timeout: 6_000,
      })
      .toBeGreaterThanOrEqual(tops[2] - 3);
    await page.waitForTimeout(500);
    const settled = await page.evaluate(() => window.scrollY);
    expect(Math.abs(settled - tops[2]), 'stays on the stop start').toBeLessThanOrEqual(3);
    await expect(page.locator('#recorrido')).toHaveAttribute('data-stop', '2');
  });

  test('entering a stop reveals its featured product from the map pin', async ({ page }, testInfo) => {
    onlyDesktop(testInfo);
    await page.goto('/');
    await waitForMotion(page);
    const tops = await stopTops(page);

    await page.evaluate(() => {
      const stop = document.querySelector<HTMLElement>('.recorrido__stops > [data-stop-index="1"]')!;
      const product = stop.querySelector('[data-flip-target]')!.firstElementChild as HTMLElement;
      const record = { revealing: false, maxScaleDelta: 0, maxShift: 0 };
      (window as unknown as { __reveal: typeof record }).__reveal = record;
      new MutationObserver(() => {
        if (stop.classList.contains('is-revealing')) record.revealing = true;
      }).observe(stop, { attributes: true, attributeFilter: ['class'] });
      const started = performance.now();
      const sample = () => {
        const { transform } = getComputedStyle(product);
        if (transform !== 'none') {
          const matrix = new DOMMatrixReadOnly(transform);
          record.maxScaleDelta = Math.max(record.maxScaleDelta, Math.abs(1 - Math.hypot(matrix.a, matrix.b)));
          record.maxShift = Math.max(record.maxShift, Math.hypot(matrix.e, matrix.f));
        }
        if (performance.now() - started < 4000) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });

    await scrollToY(page, tops[1]);
    const reveal = () =>
      page.evaluate(() => (window as unknown as { __reveal: Record<string, number | boolean> }).__reveal);
    await expect.poll(async () => (await reveal()).revealing, { message: 'is-revealing was set' }).toBe(true);
    await expect
      .poll(async () => (await reveal()).maxScaleDelta as number, { message: 'the product starts scaled down on the pin' })
      .toBeGreaterThan(0.3);
    expect((await reveal()).maxShift as number, 'the product starts away from its card').toBeGreaterThan(100);

    // Settles in the card at its resting angle.
    const stop = page.locator('.recorrido__stops > [data-stop-index="1"]');
    await expect(stop).not.toHaveClass(/is-revealing/, { timeout: 3_000 });
    const product = stop.locator('[data-flip-target] > *').first();
    const pose = () =>
      product.evaluate((element) => {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
        return {
          rotation: Math.round((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI),
          scale: Math.round(Math.hypot(matrix.a, matrix.b) * 100) / 100,
          shift: Math.round(Math.hypot(matrix.e, matrix.f)),
        };
      });
    await expect
      .poll(pose, { message: 'the product settles in its card at -6°', timeout: 3_000 })
      .toEqual({ rotation: -6, scale: 1, shift: 0 });
  });
});
