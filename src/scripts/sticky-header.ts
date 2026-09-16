/**
 * The header stays pinned to the top of the viewport (CSS `position: sticky`, see
 * `.site-header`) and is transparent over the hero. This toggles `.site-header--scrolled` once
 * the page scrolls past that point, so the header gets an opaque background and stays legible
 * over every other section. Runs with or without motion.
 *
 * It also hides the header (`.site-header--hidden`) once the footer starts entering the
 * viewport: being sticky, it would otherwise sit permanently over the footer's own heading and
 * CTA for the entire last screenful of the page.
 */
export const SCROLLED_CLASS = 'site-header--scrolled';
export const HIDDEN_CLASS = 'site-header--hidden';
export const SCROLL_THRESHOLD = 8;

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

  let ticking = false;
  const applyScrolledState = () => {
    header.classList.toggle(SCROLLED_CLASS, window.scrollY > SCROLL_THRESHOLD);
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
