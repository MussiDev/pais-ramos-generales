/**
 * The header stays pinned to the top of the viewport (CSS `position: sticky`, see
 * `.site-header`) and is transparent over the hero. This toggles `.site-header--scrolled` once
 * the page scrolls past that point, so the header gets an opaque background and stays legible
 * over every other section. Runs with or without motion.
 *
 * It also hides the header (`.site-header--hidden`) once the footer starts entering the
 * viewport: being sticky, it would otherwise sit permanently over the footer's own heading and
 * CTA for the entire last screenful of the page.
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
  footer?: Element | null;
}

export function initStickyHeader({
  root = document,
  header = root.querySelector<HTMLElement>('.site-header'),
  footer = root.querySelector('.site-footer'),
}: StickyHeaderOptions = {}): void {
  if (!header) return;
  const hasDarkSections = root.querySelector(DARK_SECTION_SELECTOR) !== null;

  let ticking = false;
  const applyScrolledState = () => {
    header.classList.toggle(SCROLLED_CLASS, window.scrollY > SCROLL_THRESHOLD);
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

  if (footer && typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(
      ([entry]) => header.classList.toggle(HIDDEN_CLASS, entry.isIntersecting),
    );
    observer.observe(footer);
  }
}
