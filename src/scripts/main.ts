/**
 * Client entry. Enhancements (non-motion behavior) always run; motion runs only when
 * `shouldAnimate` allows it. GSAP and Lenis are loaded lazily after the browser is idle, so the
 * static page never waits on them. Any failure leaves the static, fully visible layout.
 *
 * All motion lives inside one `gsap.matchMedia()` condition: if the user switches to reduced
 * motion after load, pins, pin spacers, inline styles, tweens, loops and Lenis are reverted.
 *
 * `<html data-motion>` records the state: `static` (reduced motion or no matchMedia),
 * `animated`, or `disabled` (GSAP/Lenis failed to initialize).
 */
import { initDespensaFilter } from './despensa-filter';
import { shouldAnimate } from './motion/env';
import type { MotionContext, MotionInit } from './motion/smooth-scroll';
import { initStopFollower } from './recorrido-stops';
import { initSkipLink } from './skip-link';

export type { MotionContext, MotionInit } from './motion/smooth-scroll';

export type Enhancement = () => void | Promise<void>;

/** Loads a motion module's code (dynamic import) and returns its synchronous setup. */
export type MotionLoader = () => MotionInit | Promise<MotionInit>;

const enhancements: Enhancement[] = [];
const motionLoaders: MotionLoader[] = [];

/** Lenis while motion is active, so enhancements (skip link) can scroll through it. */
let activeLenis: MotionContext['lenis'] | null = null;

/** Registers behavior that must run with or without motion (e.g. skip link, pantry filter). */
export function registerEnhancement(enhancement: Enhancement): void {
  enhancements.push(enhancement);
}

/**
 * Registers a motion module. The loader runs once (it may import code); the returned init runs
 * synchronously inside the shared matchMedia context each time motion becomes allowed, and
 * receives `{ gsap, ScrollTrigger, lenis, matchMedia, context }`.
 */
export function registerMotion(loader: MotionLoader): void {
  motionLoaders.push(loader);
}

function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => resolve(), { timeout: 1500 });
    } else {
      setTimeout(resolve, 1);
    }
  });
}

function runSafely(kind: string, run: () => void) {
  try {
    run();
  } catch (error) {
    console.warn(`${kind} failed`, error);
  }
}

async function start(): Promise<void> {
  const root = document.documentElement;
  for (const enhancement of enhancements) {
    try {
      await enhancement();
    } catch (error) {
      console.warn('enhancement failed', error);
    }
  }

  const matchMedia =
    typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : undefined;
  if (!shouldAnimate(matchMedia)) {
    root.dataset.motion = 'static';
    return;
  }

  const disable = (error: unknown) => {
    root.classList.remove('is-animated');
    root.dataset.motion = 'disabled';
    console.warn('motion disabled', error);
  };

  root.classList.add('is-animated');
  let runtime: typeof import('./motion/smooth-scroll');
  try {
    await whenIdle();
    runtime = await import('./motion/smooth-scroll');
  } catch (error) {
    disable(error);
    return;
  }

  const inits: MotionInit[] = [];
  for (const load of motionLoaders) {
    try {
      inits.push(await load());
    } catch (error) {
      console.warn('motion module failed to load', error);
    }
  }

  const { gsap, ScrollTrigger, MOTION_ALLOWED_QUERY, startSmoothScroll } = runtime;
  const media = gsap.matchMedia();

  media.add(MOTION_ALLOWED_QUERY, (context) => {
    let smoothScroll: ReturnType<typeof startSmoothScroll>;
    try {
      smoothScroll = startSmoothScroll();
    } catch (error) {
      disable(error);
      return;
    }

    activeLenis = smoothScroll.lenis;
    root.classList.add('is-animated');
    const cleanups: Array<() => void> = [];
    for (const init of inits) {
      runSafely('motion module', () => {
        const cleanup = init({
          gsap,
          ScrollTrigger,
          lenis: smoothScroll.lenis,
          matchMedia: media,
          context,
        });
        if (typeof cleanup === 'function') cleanups.push(cleanup);
      });
    }
    smoothScroll.refresh();
    root.dataset.motion = 'animated';

    return () => {
      for (const cleanup of cleanups) runSafely('motion cleanup', cleanup);
      activeLenis = null;
      smoothScroll.destroy();
      root.classList.remove('is-animated');
      root.dataset.motion = 'static';
    };
  });

  // The preference may have changed while the runtime was loading.
  if (root.dataset.motion !== 'animated' && root.dataset.motion !== 'disabled') {
    root.classList.remove('is-animated');
    root.dataset.motion = 'static';
  }
}

registerMotion(async () => {
  const { initHero } = await import('./motion/hero');
  return () => initHero();
});

registerMotion(async () => {
  const [{ curtainReveal, stackOver }, { refreshOnDespensaFilter }] = await Promise.all([
    import('./motion/stacking'),
    import('./motion/refresh-on-filter'),
  ]);
  return ({ ScrollTrigger }) => {
    stackOver('#hero', '#manifiesto', { scale: 0.92 });
    curtainReveal('#como-pedir', '.site-footer');
    // Filtering la despensa changes its height and moves the curtain start below it.
    return refreshOnDespensaFilter(ScrollTrigger);
  };
});

registerMotion(async () => (await import('./motion/recorrido')).init);

registerEnhancement(() => initSkipLink({ getScroller: () => activeLenis }));

// Keeps the Recorrido indicator on the stop in view whenever the desktop pin is not driving it.
registerEnhancement(() => initStopFollower());

// La despensa category filter; runs with or without motion (including reduced motion).
registerEnhancement(() => initDespensaFilter());

void start();
