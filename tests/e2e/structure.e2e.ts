import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import * as copy from '../../src/content/copy';
import { nextFair } from '../../src/content/fairs';
import { categories, products } from '../../src/content/products';
import { provinces } from '../../src/content/provinces';
import { productMessage } from '../../src/lib/whatsapp';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const SECTION_IDS = [
  'hero',
  'manifiesto',
  'recorrido',
  'despensa',
  'ferias',
  'como-pedir',
  'contacto',
] as const;

const WA_HREF = /^https:\/\/wa\.me\/\d{10,15}\?text=(.+)$/;

/** Bracketed values are rendered visibly; strip markers to compare rendered text. */
function decodedWhatsAppText(href: string): string {
  const match = WA_HREF.exec(href);
  expect(match, `not a wa.me link with a message: ${href}`).not.toBeNull();
  const encoded = match![1];
  const decoded = decodeURIComponent(encoded);
  expect(encodeURIComponent(decoded), `message is not URL-encoded: ${href}`).toBe(encoded);
  return decoded;
}

async function sectionIds(page: Page): Promise<string[]> {
  return page.locator('section[id][aria-labelledby]').evaluateAll((sections) =>
    sections
      .filter((section) => {
        const labelId = section.getAttribute('aria-labelledby') ?? '';
        const label = document.getElementById(labelId);
        return !!label && (label.textContent ?? '').trim() !== '';
      })
      .map((section) => section.id),
  );
}

test.describe('structure', () => {
  test('renders the seven sections in order', async ({ page }) => {
    await page.goto('/');

    expect(await sectionIds(page)).toEqual([...SECTION_IDS]);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('#hero h1')).toContainText(copy.hero.titleLead);
    await expect(page.locator('#despensa')).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('#despensa-title')).toHaveAttribute('tabindex', '-1');
  });

  test('shows bracketed placeholders as marked elements', async ({ page }) => {
    await page.goto('/');

    const marks = page.locator('mark.placeholder');
    expect(await marks.count()).toBeGreaterThan(10);
    await expect(page.locator('#ferias mark.placeholder', { hasText: nextFair.date })).toHaveCount(1);
    await expect(page.locator('#ferias mark.placeholder', { hasText: nextFair.hours })).toHaveCount(
      1,
    );

    // No bracketed value may appear as plain text outside a <mark class="placeholder">.
    const unmarked = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const offenders: string[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (!parent || parent.closest('script, style, mark.placeholder')) continue;
        if (/\[[^\]]+\]/.test(node.textContent ?? '')) offenders.push(node.textContent ?? '');
      }
      return offenders;
    });
    expect(unmarked).toEqual([]);

    // FR-07: the dashed marker must stand out from the surface it sits on (>= 3:1 non-text).
    const lowContrast = await page.locator('#ferias mark.placeholder').evaluateAll((elements) => {
      const parse = (color: string) => {
        const [r, g, b, a = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
        return { r, g, b, a };
      };
      const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
        const channel = (value: number) => {
          const s = value / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      const surfaceOf = (element: Element) => {
        for (let node: Element | null = element; node; node = node.parentElement) {
          const background = parse(getComputedStyle(node).backgroundColor);
          if (background.a > 0) return background;
        }
        return { r: 255, g: 255, b: 255, a: 1 };
      };
      return elements
        .map((element) => {
          const outline = parse(getComputedStyle(element).outlineColor);
          const surface = surfaceOf(element.parentElement!);
          const [light, dark] = [luminance(outline), luminance(surface)].sort((x, y) => y - x);
          return { text: element.textContent, ratio: (light + 0.05) / (dark + 0.05) };
        })
        .filter((item) => item.ratio < 3);
    });
    expect(lowContrast).toEqual([]);
  });

  test('every order CTA targets wa.me with an encoded message', async ({ page }) => {
    await page.goto('/');

    const ctas = await page
      .locator('a')
      .evaluateAll((links) =>
        links
          .filter((link) => /whatsapp|pedido|consultar/i.test(link.textContent ?? ''))
          .map((link) => ({
            href: link.getAttribute('href') ?? '',
            target: link.getAttribute('target'),
            rel: link.getAttribute('rel') ?? '',
          })),
      );

    // nav + hero + 5 featured products + every pantry card + cómo pedir + footer CTA and link
    expect(ctas.length).toBeGreaterThanOrEqual(1 + 1 + provinces.length + products.length + 1 + 2);
    for (const cta of ctas) {
      expect(decodedWhatsAppText(cta.href).length).toBeGreaterThan(0);
      expect(cta.target).toBe('_blank');
      expect(cta.rel).toContain('noopener');
    }

    const waLinks = await page.locator('a[href*="wa.me"]').count();
    expect(waLinks).toBe(ctas.length);
  });

  test('product card links include the product name', async ({ page }) => {
    await page.goto('/');

    const cards = page.locator('#despensa [data-product-id]');
    await expect(cards).toHaveCount(products.length);

    for (const product of products) {
      const card = page.locator(`#despensa [data-product-id="${product.id}"]`);
      await expect(card).toHaveAttribute('data-category', product.category);
      const href = await card.locator('a[href*="wa.me"]').getAttribute('href');
      expect(decodedWhatsAppText(href ?? '')).toBe(productMessage(product.name));
    }

    for (const province of provinces) {
      const featured = products.find((product) => product.id === province.featuredProductId);
      const stop = page.locator(`#recorrido [data-province="${province.id}"]`);
      const href = await stop.locator('a[href*="wa.me"]').getAttribute('href');
      expect(decodedWhatsAppText(href ?? '')).toBe(productMessage(featured!.name));
    }

    // Chips: one "Todo" plus one per category, as toggle buttons.
    const chips = page.locator('#despensa button[type="button"][aria-pressed][data-category]');
    await expect(chips).toHaveCount(categories.length + 1);
    await expect(page.locator('#despensa [data-empty]')).toBeHidden();
  });

  test('missing images render labelled placeholder boxes with aspect ratio', async ({ page }) => {
    await page.goto('/');

    const slots = page.locator('[data-image-slot]');
    expect(await slots.count()).toBeGreaterThanOrEqual(2 + products.length);
    await expect(page.locator(`[data-image-slot="${copy.hero.jarImage.id}"]`)).toHaveCount(1);
    await expect(page.locator(`[data-image-slot="${copy.manifiesto.photo.id}"]`)).toHaveCount(1);

    const boxes = await slots.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          id: element.getAttribute('data-image-slot'),
          role: element.getAttribute('role'),
          label: element.getAttribute('aria-label') ?? '',
          aspectRatio: getComputedStyle(element).aspectRatio,
          width: rect.width,
          height: rect.height,
        };
      }),
    );

    for (const box of boxes) {
      expect(box.role, `${box.id} role`).toBe('img');
      expect(box.label.trim(), `${box.id} label`).not.toBe('');
      expect(box.aspectRatio, `${box.id} aspect-ratio`).not.toBe('auto');
      expect(box.width, `${box.id} width`).toBeGreaterThan(0);
      const [w, h] = box.aspectRatio.split('/').map((part) => Number.parseFloat(part));
      expect(box.width / box.height, `${box.id} rendered ratio`).toBeCloseTo(w / h, 1);
    }
  });

  test('all headings, copy and links are present without JavaScript', async ({
    browser,
  }, testInfo) => {
    // Every project runs this check with JS off; the no-js project is already configured so.
    const { baseURL, viewport, isMobile, hasTouch, userAgent, deviceScaleFactor } =
      testInfo.project.use;
    const context = await browser.newContext({
      baseURL,
      viewport,
      isMobile,
      hasTouch,
      userAgent,
      deviceScaleFactor,
      javaScriptEnabled: false,
    });
    const page = await context.newPage();
    await page.goto('/');

    await expect(page.locator('html')).toHaveClass(/\bno-js\b/);

    await expect(page.locator('#hero h1')).toBeVisible();
    for (const id of SECTION_IDS) {
      const heading = page.locator(`#${id} [id="${id}-title"]`);
      await expect(heading, `heading of #${id}`).toBeVisible();
    }

    const visibleTexts = [
      copy.hero.titleEmphasis,
      copy.manifiesto.titleEmphasis,
      copy.manifiesto.about,
      copy.recorrido.titleEmphasis,
      copy.recorrido.skipLink,
      copy.despensa.titleEmphasis,
      nextFair.name,
      copy.comoPedir.titleEmphasis,
      ...copy.comoPedir.steps.map((step) => step.title),
      ...copy.comoPedir.storeFacts,
      copy.footer.legal,
    ];
    for (const text of visibleTexts) {
      await expect(page.getByText(text, { exact: false }).first(), text).toBeVisible();
    }

    for (const province of provinces) {
      await expect(
        page.locator(`#recorrido [data-province="${province.id}"] h3`),
        province.name,
      ).toHaveText(province.name);
      await expect(page.locator(`#recorrido [data-province="${province.id}"] h3`)).toBeVisible();
    }

    for (const product of products.filter((item) => !/\[/.test(item.name))) {
      await expect(
        page.locator(`#despensa [data-product-id="${product.id}"]`).getByText(product.name).first(),
      ).toBeVisible();
    }
    await expect(page.locator('#despensa [data-product-id]:visible')).toHaveCount(products.length);

    for (const link of copy.nav.links) {
      await expect(page.locator(`a[href="${link.href}"]`).first()).toBeAttached();
    }
    await expect(page.locator('#recorrido a[href="#despensa"]')).toBeVisible();
    expect(await page.locator('a[href*="wa.me"]').count()).toBeGreaterThanOrEqual(
      products.length + provinces.length + 4,
    );

    // Without the JS loop, ticker names wrap instead of being clipped off-screen.
    const viewportWidth = page.viewportSize()!.width;
    const clippedTicker = await page
      .locator('#hero .ticker__list:not([aria-hidden]) .ticker__item')
      .evaluateAll(
        (items, width) =>
          items
            .filter((item) => item.getBoundingClientRect().right > width)
            .map((item) => item.textContent),
        viewportWidth,
      );
    expect(clippedTicker).toEqual([]);

    // Chips need JS to filter, so they are hidden without it.
    await expect(page.locator('#despensa .chips')).toBeHidden();

    // Nothing inside the page is parked at opacity 0 or visibility hidden.
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

    await context.close();
  });

  test('build fails when content integrity fails', async ({}, testInfo) => {
    // A build-time check: independent of the browser, so it runs in one project only.
    test.skip(testInfo.project.name !== 'desktop', 'build-time check runs in the desktop project');
    test.setTimeout(240_000);

    const fixtureRoot = path.join(
      REPO_ROOT,
      '.tmp',
      `integrity-${testInfo.project.name}-${process.pid}-${Date.now()}`,
    );
    mkdirSync(fixtureRoot, { recursive: true });

    try {
      // Isolated copy of the site: committed content is never touched.
      cpSync(path.join(REPO_ROOT, 'src'), path.join(fixtureRoot, 'src'), { recursive: true });
      for (const file of ['astro.config.mjs', 'tsconfig.json']) {
        cpSync(path.join(REPO_ROOT, file), path.join(fixtureRoot, file));
      }
      const envSource = existsSync(path.join(REPO_ROOT, '.env')) ? '.env' : '.env.example';
      cpSync(path.join(REPO_ROOT, envSource), path.join(fixtureRoot, '.env'));

      const astroBin = path.join(REPO_ROOT, 'node_modules', 'astro', 'astro.js');
      const distIndex = path.join(fixtureRoot, 'dist', 'index.html');
      const build = () => {
        const result = spawnSync(process.execPath, [astroBin, 'build', '--root', fixtureRoot], {
          cwd: fixtureRoot,
          encoding: 'utf8',
          env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
          timeout: 100_000,
        });
        return { status: result.status, output: `${result.stdout ?? ''}\n${result.stderr ?? ''}` };
      };

      // Control: the untouched fixture builds the assembled page, so a failure below can only
      // come from the content mutation.
      const control = build();
      expect(control.status, control.output).toBe(0);
      const html = readFileSync(distIndex, 'utf8');
      for (const id of SECTION_IDS) {
        expect(html, `control build contains #${id}`).toContain(`id="${id}"`);
      }
      rmSync(path.join(fixtureRoot, 'dist'), { recursive: true, force: true });

      const provincesFile = path.join(fixtureRoot, 'src', 'content', 'provinces.ts');
      const original = readFileSync(provincesFile, 'utf8');
      const broken = original.replace(
        "featuredProductId: 'salta-destacado'",
        "featuredProductId: 'producto-inexistente'",
      );
      expect(broken, 'fixture mutation must apply').not.toBe(original);
      writeFileSync(provincesFile, broken);

      const failing = build();
      expect(failing.status, failing.output).not.toBe(0);
      expect(failing.output).toContain('unknown product id: producto-inexistente');
      expect(existsSync(distIndex)).toBe(false);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
      // Remove the shared parent once empty; another project's fixture may still be using it.
      try {
        rmdirSync(path.dirname(fixtureRoot));
      } catch {
        // not empty or already removed
      }
    }
  });
});
