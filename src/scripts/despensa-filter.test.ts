import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { despensa } from '../content/copy';
import { ALL_CATEGORY, DESPENSA_FILTERED_EVENT, filterProducts, initDespensaFilter } from './despensa-filter';

interface FixtureOptions {
  extraChips?: string[];
  chips?: boolean;
  empty?: boolean;
  status?: 'templated' | 'bare' | 'none';
}

/** Mirrors the Despensa.astro markup: chips, cards, empty message and filter live region. */
function renderFixture({
  extraChips = [],
  chips = true,
  empty = true,
  status = 'templated',
}: FixtureOptions = {}) {
  const chipCategories = [ALL_CATEGORY, 'dulces', 'yerbas', ...extraChips];
  const statusAttributes =
    status === 'templated'
      ? `data-template-one="{count} producto" data-template-other="{count} productos" data-empty-text="${despensa.emptyState}"`
      : '';
  document.body.innerHTML = `
    <section id="despensa">
      ${
        chips
          ? `<div class="chips" role="group">${chipCategories
              .map(
                (category) =>
                  `<button type="button" class="chip" aria-pressed="${category === ALL_CATEGORY}" data-category="${category}">${category}</button>`,
              )
              .join('')}</div>`
          : ''
      }
      <div class="product-grid" data-product-grid>
        <article class="product-card" data-product-id="d1" data-category="dulces"></article>
        <article class="product-card" data-product-id="d2" data-category="dulces"></article>
        <article class="product-card" data-product-id="y1" data-category="yerbas"></article>
      </div>
      ${empty ? `<p class="despensa__empty" data-empty hidden>${despensa.emptyState}</p>` : ''}
      ${
        status === 'none'
          ? ''
          : `<p class="visually-hidden" aria-live="polite" data-filter-status ${statusAttributes}></p>`
      }
    </section>`;
}

const chip = (category: string) =>
  document.querySelector<HTMLButtonElement>(`.chip[data-category="${category}"]`)!;
const cards = () => Array.from(document.querySelectorAll<HTMLElement>('[data-product-id]'));
const visibleIds = () => cards().filter((card) => !card.hidden).map((card) => card.dataset.productId);
const pressedChips = () => Array.from(document.querySelectorAll<HTMLElement>('.chip[aria-pressed="true"]'));
const pressed = () => pressedChips().map((element) => element.dataset.category);
const empty = () => document.querySelector<HTMLElement>('[data-empty]')!;
const status = () => document.querySelector<HTMLElement>('[data-filter-status]')!;

describe('despensa filter', () => {
  beforeEach(() => renderFixture());
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows only cards of the selected category', () => {
    initDespensaFilter();

    chip('dulces').click();
    expect(visibleIds()).toEqual(['d1', 'd2']);
    expect(pressed()).toEqual(['dulces']);
    expect(chip(ALL_CATEGORY).getAttribute('aria-pressed')).toBe('false');
    expect(empty().hidden).toBe(true);

    chip('yerbas').click();
    expect(visibleIds()).toEqual(['y1']);
    expect(pressed()).toEqual(['yerbas']);

    chip(ALL_CATEGORY).click();
    expect(visibleIds()).toEqual(['d1', 'd2', 'y1']);
    expect(pressed()).toEqual([ALL_CATEGORY]);

    // The pure function reports what it applied.
    expect(filterProducts(cards(), 'yerbas')).toEqual({ category: 'yerbas', visible: 1 });
    expect(visibleIds()).toEqual(['y1']);
  });

  it('unknown category shows all cards and selects Todo', () => {
    initDespensaFilter();
    chip('dulces').click();
    expect(visibleIds()).toEqual(['d1', 'd2']);

    // Tampered after load: the value is not "todo" nor a rendered category.
    const tampered = chip('yerbas');
    tampered.dataset.category = 'no-existe';
    tampered.click();

    expect(visibleIds()).toEqual(['d1', 'd2', 'y1']);
    expect(pressed()).toEqual([ALL_CATEGORY]);
    expect(tampered.getAttribute('aria-pressed')).toBe('false');
    expect(empty().hidden).toBe(true);

    expect(filterProducts(cards(), '<img src=x>')).toEqual({ category: ALL_CATEGORY, visible: 3 });
  });

  it('empty result shows the empty message', () => {
    renderFixture({ extraChips: ['vinos'] });
    initDespensaFilter();

    chip('vinos').click();
    expect(visibleIds()).toEqual([]);
    expect(pressed()).toEqual(['vinos']);
    expect(empty().hidden).toBe(false);
    // The copy comes from the markup (content layer), not from the script.
    expect(empty().textContent).toBe('No hay productos en esta categoría todavía.');

    chip('dulces').click();
    expect(empty().hidden).toBe(true);
    expect(visibleIds()).toEqual(['d1', 'd2']);
  });

  it('only one chip is pressed when a chip is tampered to another valid category', () => {
    initDespensaFilter();
    const dulcesChip = chip('dulces');
    const tampered = chip('yerbas');
    tampered.dataset.category = 'dulces';

    tampered.click();

    expect(visibleIds()).toEqual(['d1', 'd2']);
    expect(pressedChips()).toEqual([dulcesChip]);
    expect(tampered.getAttribute('aria-pressed')).toBe('false');
  });

  it('announces the result in the live region on selection only', () => {
    renderFixture({ extraChips: ['vinos'] });
    initDespensaFilter();
    expect(status().textContent).toBe('');

    chip('dulces').click();
    expect(status().textContent).toBe('2 productos');
    chip('yerbas').click();
    expect(status().textContent).toBe('1 producto');
    chip('vinos').click();
    expect(status().textContent).toBe(despensa.emptyState);
    chip(ALL_CATEGORY).click();
    expect(status().textContent).toBe('3 productos');
  });

  it('dispatches despensa:filtered on the section after each selection', () => {
    initDespensaFilter();
    const listener = vi.fn();
    document.querySelector('#despensa')!.addEventListener(DESPENSA_FILTERED_EVENT, listener);

    chip('dulces').click();
    chip(ALL_CATEGORY).click();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
  });

  it('leaves every card visible when the section renders no chips', () => {
    renderFixture({ chips: false });
    const listener = vi.fn();
    document.querySelector('#despensa')!.addEventListener(DESPENSA_FILTERED_EVENT, listener);

    initDespensaFilter();

    expect(visibleIds()).toEqual(['d1', 'd2', 'y1']);
    expect(status().textContent).toBe('');
    expect(listener).not.toHaveBeenCalled();
  });

  it('still filters when the empty message and live region are missing', () => {
    renderFixture({ extraChips: ['vinos'], empty: false, status: 'none' });
    initDespensaFilter();

    chip('vinos').click();
    expect(visibleIds()).toEqual([]);
    expect(pressed()).toEqual(['vinos']);
    chip('yerbas').click();
    expect(visibleIds()).toEqual(['y1']);
  });

  it('leaves the live region silent when its templates are missing', () => {
    renderFixture({ extraChips: ['vinos'], status: 'bare' });
    initDespensaFilter();

    chip('dulces').click();
    chip('vinos').click();
    expect(visibleIds()).toEqual([]);
    expect(status().textContent).toBe('');
  });

  it('does nothing when the pantry is not on the page', () => {
    document.body.innerHTML = '<main></main>';
    expect(() => initDespensaFilter()).not.toThrow();
  });

  it('filterProducts accepts an explicit allowed list', () => {
    expect(filterProducts(cards(), 'vinos', ['dulces', 'yerbas', 'vinos'])).toEqual({
      category: 'vinos',
      visible: 0,
    });
    expect(visibleIds()).toEqual([]);
    expect(filterProducts(cards(), ALL_CATEGORY, [])).toEqual({ category: ALL_CATEGORY, visible: 3 });
  });
});
