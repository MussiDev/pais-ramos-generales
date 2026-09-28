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
 * Whether the section on top at viewport line `y` is a dark-tone one. On this page a later
 * section always paints over an earlier one (the manifiesto covers the hero, the pantry covers the
 * pinned recorrido), so the topmost is the last section crossing the line. Reading rects instead
 * of hit testing (`elementsFromPoint`) matters: that forced a hit test and a layout on every
 * scroll frame and doubled the script time while scrolling El recorrido.
 */
export function isDarkAt(sections: readonly Element[], y: number): boolean {
  for (let index = sections.length - 1; index >= 0; index -= 1) {
    const { top, bottom } = sections[index].getBoundingClientRect();
    if (top <= y && bottom > y) return sections[index].matches(DARK_SECTION_SELECTOR);
  }
  return false;
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
  // The page's top-level sections, in paint order (see isDarkAt).
  const sections = Array.from(root.querySelectorAll('main > section'));
  const hasDarkSections = sections.some((section) => section.matches(DARK_SECTION_SELECTOR));

  let ticking = false;
  const applyScrolledState = () => {
    header.classList.toggle(SCROLLED_CLASS, window.scrollY > SCROLL_THRESHOLD);
    if (main) {
      const reached = footerReachedHeader(main.getBoundingClientRect().bottom, header.offsetHeight);
      header.classList.toggle(HIDDEN_CLASS, reached);
    }
    if (hasDarkSections) {
      // Probe the middle of the header's band: that is where its links and mark sit.
      header.classList.toggle(DARK_CLASS, isDarkAt(sections, header.offsetHeight / 2));
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
