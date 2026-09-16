import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

export { gsap, ScrollTrigger };

/** Media query under which every motion module lives; leaving it reverts everything. */
export const MOTION_ALLOWED_QUERY = '(prefers-reduced-motion: no-preference)';

/** Handed to every motion module when it initializes. */
export interface MotionContext {
  gsap: typeof gsap;
  ScrollTrigger: typeof ScrollTrigger;
  lenis: Lenis;
  /**
   * The shared `gsap.matchMedia()` for the motion-allowed condition. Nested conditions (e.g.
   * ≥ 768 px) create their own `gsap.matchMedia()` inside the init and kill it in its cleanup.
   */
  matchMedia: gsap.MatchMedia;
  /** The active matchMedia context; wrap animations created later (events) in `context.add`. */
  context: gsap.Context;
}

/** Synchronous module setup; may return a cleanup for anything GSAP cannot revert by itself. */
export type MotionInit = (motion: MotionContext) => void | (() => void);

export interface SmoothScroll {
  lenis: Lenis;
  /** Re-sorts and recomputes every ScrollTrigger once all timelines are registered. */
  refresh: () => void;
  /** Stops Lenis and removes it from the shared ticker. */
  destroy: () => void;
}

/**
 * Starts Lenis on the shared `gsap.ticker` loop (a single RAF for smooth scroll and GSAP) and
 * forwards every Lenis scroll to ScrollTrigger. Throws if GSAP or Lenis cannot initialize.
 */
export function startSmoothScroll(): SmoothScroll {
  gsap.registerPlugin(ScrollTrigger);

  // wheelMultiplier > 1: less scrolling is needed to cross a pinned section (e.g. El recorrido,
  // one full viewport per stop) than Lenis's smoothing default would otherwise take.
  const lenis = new Lenis({ autoRaf: false, wheelMultiplier: 1.4, duration: 1.0 });
  const stopScrollSync = lenis.on('scroll', ScrollTrigger.update);
  const tickLenis = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tickLenis);
  gsap.ticker.lagSmoothing(0);

  return {
    lenis,
    refresh: () => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    },
    destroy: () => {
      gsap.ticker.remove(tickLenis);
      gsap.ticker.lagSmoothing(500, 33);
      stopScrollSync();
      lenis.destroy();
    },
  };
}
