/**
 * La despensa category filter. Chips are native `<button type="button" aria-pressed>`, so click,
 * Enter and Space all arrive as a `click` event. Cards are hidden with the `hidden` attribute (no
 * animation, no inline styles). Without JavaScript the chips are hidden by `.no-js` CSS and every
 * card stays visible.
 *
 * All copy is server-rendered: the empty message in `[data-empty]`, and the live-region templates
 * as data attributes on `[data-filter-status]`. This script only toggles and fills them.
 *
 * Filtering changes the section height, so each selection dispatches `DESPENSA_FILTERED_EVENT` on
 * the section; the motion layer listens and refreshes ScrollTrigger (this module never loads GSAP).
 */

export const ALL_CATEGORY = 'todo';

/** Dispatched on `#despensa` after each selection (its height may have changed). */
export const DESPENSA_FILTERED_EVENT = 'despensa:filtered';

const SELECTORS = {
  section: '#despensa',
  chips: '.chip[data-category]',
  cards: '[data-product-id][data-category]',
  empty: '[data-empty]',
  status: '[data-filter-status]',
} as const;

interface FilterResult {
  /** The category actually applied: the requested one, or "todo" when it was not allowed. */
  category: string;
  /** Number of cards left visible. */
  visible: number;
}

/**
 * Shows the cards of `category` and hides the rest. `allowed` lists the valid categories (besides
 * "todo"); it defaults to the categories present in `cards`. An unknown category shows every card.
 */
export function filterProducts(
  cards: Iterable<HTMLElement>,
  category: string,
  allowed?: Iterable<string>,
): FilterResult {
  const list = Array.from(cards);
  const valid = new Set(allowed ?? list.map((card) => card.dataset.category ?? ''));
  const applied = category !== ALL_CATEGORY && valid.has(category) ? category : ALL_CATEGORY;

  let visible = 0;
  for (const card of list) {
    const show = applied === ALL_CATEGORY || card.dataset.category === applied;
    card.hidden = !show;
    if (show) visible += 1;
  }
  return { category: applied, visible };
}

/** Live-region text for a result, from the templates rendered in the markup (or null). */
function statusText(status: HTMLElement, visible: number): string | null {
  const { templateOne, templateOther, emptyText } = status.dataset;
  if (visible === 0) return emptyText ?? null;
  const template = visible === 1 ? templateOne : templateOther;
  return template ? template.replace('{count}', String(visible)) : null;
}

export function initDespensaFilter(root: ParentNode = document): void {
  const section = root.querySelector<HTMLElement>(SELECTORS.section);
  if (!section) return;
  const chips = Array.from(section.querySelectorAll<HTMLButtonElement>(SELECTORS.chips));
  if (chips.length === 0) return;
  const cards = Array.from(section.querySelectorAll<HTMLElement>(SELECTORS.cards));
  const empty = section.querySelector<HTMLElement>(SELECTORS.empty);
  const status = section.querySelector<HTMLElement>(SELECTORS.status);

  // Captured once: category values written into the DOM later are not trusted.
  const chipCategory = new Map(chips.map((chip) => [chip, chip.dataset.category ?? '']));
  const allowed = new Set(
    [...chipCategory.values(), ...cards.map((card) => card.dataset.category ?? '')].filter(
      (category) => category !== '' && category !== ALL_CATEGORY,
    ),
  );

  const select = (requested: string) => {
    const { category, visible } = filterProducts(cards, requested, allowed);
    for (const chip of chips) {
      chip.setAttribute('aria-pressed', String(chipCategory.get(chip) === category));
    }
    if (empty) empty.hidden = visible > 0;
    if (status) {
      const text = statusText(status, visible);
      if (text !== null) status.textContent = text;
    }
    section.dispatchEvent(new CustomEvent(DESPENSA_FILTERED_EVENT, { detail: { category, visible } }));
  };

  for (const chip of chips) {
    chip.addEventListener('click', () => select(chip.dataset.category ?? ''));
  }
}
