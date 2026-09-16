/**
 * In-page nav links (`[data-nav-link]`) jump to their target section. Without this script the
 * jump is the browser's native, instant scroll. With it, the scroll animates through Lenis when
 * motion is running (falling back to `scrollIntoView`), and the section receives focus for
 * keyboard and screen-reader users, matching the skip-link pattern (`skip-link.ts`).
 */
import { shouldAnimate, type MatchMediaLike } from './motion/env';

export const NAV_SCROLL_SELECTOR = '[data-nav-link]';

/** The subset of Lenis the nav scroll needs. */
export interface ScrollerLike {
  scrollTo(target: HTMLElement, options?: { immediate?: boolean; force?: boolean }): void;
}

export interface NavScrollOptions {
  root?: ParentNode;
  matchMedia?: MatchMediaLike | null;
  /** Returns the active smooth scroller, if any. */
  getScroller?: () => ScrollerLike | null | undefined;
}

function isPlainClick(event: MouseEvent): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/** Moves focus to `target` without scrolling to it a second time; restores its tabindex after. */
function focusTarget(target: HTMLElement): void {
  const hadTabIndex = target.hasAttribute('tabindex');
  if (!hadTabIndex) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  if (!hadTabIndex) {
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
  }
}

export function initNavScroll({
  root = document,
  matchMedia = typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : null,
  getScroller = () => null,
}: NavScrollOptions = {}): void {
  const links = root.querySelectorAll<HTMLAnchorElement>(NAV_SCROLL_SELECTOR);
  if (links.length === 0) return;

  for (const link of links) {
    link.addEventListener('click', (event) => {
      if (!isPlainClick(event)) return;

      const hash = link.getAttribute('href') ?? '';
      if (!hash.startsWith('#') || hash.length < 2) return;

      const target = root.querySelector<HTMLElement>(hash);
      if (!target) return;

      event.preventDefault();

      const animate = shouldAnimate(matchMedia);
      const scroller = animate ? getScroller() : null;
      if (scroller) {
        scroller.scrollTo(target, { force: true });
      } else {
        target.scrollIntoView({ behavior: animate ? 'smooth' : 'instant', block: 'start' });
      }

      // Never touches the URL: the hash isn't wanted, in sync or otherwise.
      focusTarget(target);
    });
  }
}
