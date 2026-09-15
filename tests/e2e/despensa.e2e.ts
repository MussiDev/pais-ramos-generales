import { expect, test, type Page } from '@playwright/test';
import { products } from '../../src/content/products';

const cardsOf = (category: string) => products.filter((product) => product.category === category);

const visibleCards = (page: Page) => page.locator('#despensa [data-product-id]:visible');
const chip = (page: Page, category: string) =>
  page.locator(`#despensa .chip[data-category="${category}"]`);
const pressedChips = (page: Page) => page.locator('#despensa .chip[aria-pressed="true"]');

async function expectOnly(page: Page, category: string) {
  const expected = cardsOf(category);
  await expect(visibleCards(page)).toHaveCount(expected.length);
  for (const product of expected) {
    await expect(page.locator(`#despensa [data-product-id="${product.id}"]`)).toBeVisible();
  }
  await expect(pressedChips(page)).toHaveCount(1);
  await expect(chip(page, category)).toHaveAttribute('aria-pressed', 'true');
}

test.describe('la despensa filter', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'no-js', 'filtering needs JavaScript');
    await page.goto('/');
  });

  test('selecting a chip filters cards and sets aria-pressed="true"', async ({ page }) => {
    await chip(page, 'dulces').click();
    await expectOnly(page, 'dulces');
    await expect(chip(page, 'todo')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#despensa [data-empty]')).toBeHidden();

    await chip(page, 'yerbas').click();
    await expectOnly(page, 'yerbas');

    await chip(page, 'todo').click();
    await expect(visibleCards(page)).toHaveCount(products.length);
    await expect(pressedChips(page)).toHaveCount(1);
    await expect(chip(page, 'todo')).toHaveAttribute('aria-pressed', 'true');
  });

  test('keyboard activation (Enter and Space) filters like a click', async ({ page }) => {
    await chip(page, 'conservas').focus();
    await page.keyboard.press('Enter');
    await expectOnly(page, 'conservas');

    await chip(page, 'chipa').focus();
    await page.keyboard.press('Space');
    await expectOnly(page, 'chipa');

    await chip(page, 'todo').focus();
    await page.keyboard.press('Enter');
    await expect(visibleCards(page)).toHaveCount(products.length);
    await expect(chip(page, 'todo')).toHaveAttribute('aria-pressed', 'true');
  });

  test('a tampered chip category shows all cards and selects Todo', async ({ page }) => {
    await chip(page, 'dulces').click();
    await expectOnly(page, 'dulces');

    const tampered = chip(page, 'vinos');
    await tampered.evaluate((element) => element.setAttribute('data-category', 'no-existe'));
    await page.locator('#despensa .chip[data-category="no-existe"]').click();

    await expect(visibleCards(page)).toHaveCount(products.length);
    await expect(pressedChips(page)).toHaveCount(1);
    await expect(chip(page, 'todo')).toHaveAttribute('aria-pressed', 'true');
  });
});

test('the live region announces the filter result only after a selection', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'no-js', 'filtering needs JavaScript');
  await page.goto('/');
  const status = page.locator('#despensa [data-filter-status][aria-live="polite"]');
  await expect(status).toHaveCount(1);
  await expect(status).toHaveText('');

  await chip(page, 'chipa').click();
  await expect(status).toHaveText('1 producto');

  await chip(page, 'dulces').click();
  await expect(status).toHaveText(`${cardsOf('dulces').length} productos`);
});

test('after filtering, the footer curtain still ends fully revealed at the bottom', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the footer curtain runs on desktop with motion');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'animated');

  // The category with the fewest cards shrinks la despensa the most.
  const smallest = [...new Set(products.map((product) => product.category))].sort(
    (a, b) => cardsOf(a).length - cardsOf(b).length,
  )[0];
  await chip(page, smallest).click();
  await expectOnly(page, smallest);

  await expect
    .poll(
      async () => {
        await page.evaluate(async () => {
          window.scrollTo(0, document.documentElement.scrollHeight);
          await new Promise((resolve) => setTimeout(resolve, 300));
        });
        return page.evaluate(() => {
          const wordmark = document.querySelector('[data-footer-wordmark]')!.getBoundingClientRect();
          const comoPedir = document.querySelector('#como-pedir')!.getBoundingClientRect();
          return {
            atBottom:
              Math.ceil(window.scrollY + window.innerHeight) >=
              document.documentElement.scrollHeight - 1,
            wordmarkInViewport: wordmark.top >= 0 && wordmark.bottom <= window.innerHeight + 1,
            notOverlapped: comoPedir.bottom <= wordmark.top + 1,
          };
        });
      },
      { message: 'footer wordmark fully visible and clear of Cómo pedir', timeout: 8_000 },
    )
    .toEqual({ atBottom: true, wordmarkInViewport: true, notOverlapped: true });
});

test('without JavaScript every card is visible and the chips are hidden', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'no-js', 'no-JS project only');
  await page.goto('/');
  await expect(page.locator('#despensa .chips')).toBeHidden();
  await expect(visibleCards(page)).toHaveCount(products.length);
});
