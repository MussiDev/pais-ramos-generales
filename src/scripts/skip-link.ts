/**
 * "Saltar a la despensa" (project doc §5.1.6). Without this script the link is a plain anchor to
 * `#despensa`. With it, the jump also moves focus to the pantry heading, and scrolls smoothly only
 * when motion is allowed (through Lenis when it is running, so both stay in sync).
 */
import { shouldAnimate, type MatchMediaLike } from './motion/env';

export const SKIP_LINK_SELECTORS = {
  link: '[data-skip-link]',
  target: '#despensa',
  focus: '#despensa-title',
} as const;

/** The subset of Lenis the skip link needs. */
export interface ScrollerLike {
  scrollTo(target: HTMLElement, options?: { immediate?: boolean; force?: boolean }): void;
}

export interface SkipLinkOptions {
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

export function initSkipLink({
  root = document,
  matchMedia = typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : null,
  getScroller = () => null,
}: SkipLinkOptions = {}): void {
  const links = root.querySelectorAll<HTMLAnchorElement>(SKIP_LINK_SELECTORS.link);
  if (links.length === 0) return;

  const target = root.querySelector<HTMLElement>(SKIP_LINK_SELECTORS.target);
  const heading = root.querySelector<HTMLElement>(SKIP_LINK_SELECTORS.focus);
  if (!target || !heading) {
    const missing = target ? SKIP_LINK_SELECTORS.focus : SKIP_LINK_SELECTORS.target;
    console.warn(`skip link: ${missing} is missing, using the native anchor jump`);
    return;
  }

  for (const link of links) {
    link.addEventListener('click', (event) => {
      if (!isPlainClick(event)) return;
      event.preventDefault();

      const animate = shouldAnimate(matchMedia);
      const scroller = animate ? getScroller() : null;
      if (scroller) {
        scroller.scrollTo(target, { force: true });
      } else {
        target.scrollIntoView({ behavior: animate ? 'smooth' : 'instant', block: 'start' });
      }

      if (location.hash !== SKIP_LINK_SELECTORS.target) {
        history.pushState(null, '', SKIP_LINK_SELECTORS.target);
      }
      heading.focus({ preventScroll: true });
    });
  }
}
