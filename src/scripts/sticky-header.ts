/**
 * The header stays pinned to the top of the viewport (CSS `position: sticky`, see
 * `.site-header`) and is transparent over the hero. This toggles `.site-header--scrolled` once
 * the page scrolls past that point, so the header gets an opaque background and stays legible
 * over every other section. Runs with or without motion.
 *
 * It also hides the header (`.site-header--hidden`) once the footer reaches it: being sticky, it
 * would otherwise sit over the footer's own heading and CTA. The footer's own box cannot tell:
 * the curtain reveal (stacking.ts) holds it one screen higher, underneath Cómo pedir, so it
 * "intersects" the viewport long before it is uncovered. The end of `<main>` is where the
 * uncovered footer begins, with or without the curtain.
 *
 * Over a section marked `data-header-tone="dark"` (El recorrido) the header switches to the dark
 * tone (`.site-header--dark`: green background, cream ink) instead of a cream veil over color.
 */
export const SCROLLED_CLASS = 'site-header--scrolled';
export const HIDDEN_CLASS = 'site-header--hidden';
export const DARK_CLASS = 'site-header--dark';
export const SCROLL_THRESHOLD = 8;
export const DARK_SECTION_SELECTOR = '[data-header-tone="dark"]';

/**
 * Whether the topmost thing painted under the header (the first element of `stack`, the
 * `elementsFromPoint` hit list, that is not the header itself) belongs to a dark-tone section.
 * Hit testing, not rects: when the pantry is stacked over the pinned recorrido, both rects cross
 * the header but only the pantry is actually on top.
 */
export function isDarkUnder(stack: readonly Element[], header: Element): boolean {
  const below = stack.find((element) => !header.contains(element));
  return below?.closest(DARK_SECTION_SELECTOR) != null;
}

export interface StickyHeaderOptions {
  root?: ParentNode;
  header?: HTMLElement | null;
  main?: Element | null;
}

/** Whether the footer, which starts where `<main>` ends, has reached the header's band. */
export function footerReachedHeader(mainBottom: number, headerHeight: number): boolean {
  return mainBottom <= headerHeight;
}

export function initStickyHeader({
  root = document,
  header = root.querySelector<HTMLElement>('.site-header'),
  main = root.querySelector('main'),
}: StickyHeaderOptions = {}): void {
  if (!header) return;
  const hasDarkSections = root.querySelector(DARK_SECTION_SELECTOR) !== null;

  let ticking = false;
  const applyScrolledState = () => {
    header.classList.toggle(SCROLLED_CLASS, window.scrollY > SCROLL_THRESHOLD);
    if (main) {
      const reached = footerReachedHeader(main.getBoundingClientRect().bottom, header.offsetHeight);
      header.classList.toggle(HIDDEN_CLASS, reached);
    }
    if (hasDarkSections) {
      // Probe the middle of the header's band: that is where its links and mark sit.
      const stack = document.elementsFromPoint(window.innerWidth / 2, header.offsetHeight / 2);
      header.classList.toggle(DARK_CLASS, isDarkUnder(stack, header));
    }
    ticking = false;
  };

  applyScrolledState();
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(applyScrolledState);
    },
    { passive: true },
  );
}
