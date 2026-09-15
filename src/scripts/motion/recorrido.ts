/**
 * El recorrido choreography (project doc §5.1) and stacking 2, Despensa over the end of the route
 * (§5.2). Loaded lazily by `main.ts`; runs synchronously inside the motion matchMedia context.
 *
 * On viewports >= 768 px a nested matchMedia pins the map pane while the stops scroll by, maps the
 * progress to the active stop (`data-stop` drives colors via recorrido.css), scrubs the route,
 * reveals the featured product from its pin with Flip, snaps gently through Lenis and updates the
 * indicator. Below 768 px nothing is pinned: the CSS sticky strip applies and
 * `recorrido-stops.ts` keeps the indicator in sync.
 */
import { Flip } from 'gsap/Flip';
import {
  PIN_DRIVER,
  PIN_RELEASED_EVENT,
  writeStopIndicator,
} from '../recorrido-stops';
import type { MotionContext } from './smooth-scroll';
import {
  routeDashOffset,
  snapProgress,
  stopIndexForProgress,
  stopProgressFromScroll,
  type StopRange,
} from './route';
import { stackOver } from './stacking';
import { resolveTarget } from './targets';

export const RECORRIDO_SELECTORS = {
  section: '#recorrido',
  mapPane: '[data-map-pane]',
  route: '[data-route]',
  stops: '.recorrido__stops > [data-stop-index]',
  pin: (index: number) => `[data-pin][data-stop-index="${index}"]`,
  flipTarget: '[data-flip-target]',
  despensa: '#despensa',
} as const;

export const DESKTOP_QUERY = '(min-width: 768px)';

/** Resting angle of the revealed product (the "3/4" pose from the design). */
const SETTLED_ROTATION_DEG = -6;
/** Quiet time after the last scroll update before snapping. */
const SNAP_DELAY_MS = 180;
const SNAP_DURATION_S = 0.6;

type Gsap = MotionContext['gsap'];
type Reveals = Map<HTMLElement, gsap.core.Timeline>;

/** The route path and its length, or null (with a warning) when the scrub cannot run. */
function measureRoute(section: HTMLElement): { path: SVGPathElement; length: number } | null {
  const path = section.querySelector<SVGPathElement>(RECORRIDO_SELECTORS.route);
  if (!path) {
    console.warn(`motion: route ${RECORRIDO_SELECTORS.route} is missing, route scrub skipped`);
    return null;
  }
  const length = typeof path.getTotalLength === 'function' ? path.getTotalLength() : Number.NaN;
  if (!(length > 0)) {
    console.warn('motion: route getTotalLength is unavailable, route scrub skipped');
    return null;
  }
  return { path, length };
}

/**
 * The featured product scales out of its map pin into the card and settles at an angle. One live
 * reveal per product: a new one kills the previous, so nothing accumulates while scrolling.
 */
function revealProduct(gsap: Gsap, stop: HTMLElement, pin: Element | null, reveals: Reveals) {
  const media = stop.querySelector<HTMLElement>(RECORRIDO_SELECTORS.flipTarget);
  const product = media?.firstElementChild instanceof HTMLElement ? media.firstElementChild : media;
  const origin = pin?.querySelector('.map__pin-halo') ?? pin;
  if (!product || !origin) return;

  reveals.get(product)?.kill();
  gsap.set(product, { clearProps: 'transform' });
  const from = origin.getBoundingClientRect();
  const to = product.getBoundingClientRect();
  if (to.width === 0 || to.height === 0) return;

  // Start state: the product shrunk onto the pin. Flip records it, then animates to the card.
  gsap.set(product, {
    x: from.left + from.width / 2 - (to.left + to.width / 2),
    y: from.top + from.height / 2 - (to.top + to.height / 2),
    scale: Math.max(0.05, from.width / to.width),
    rotation: 0,
    transformOrigin: '50% 50%',
  });
  const state = Flip.getState(product);
  gsap.set(product, { x: 0, y: 0, scale: 1, rotation: SETTLED_ROTATION_DEG });

  stop.classList.add('is-revealing');
  const reveal = Flip.from(state, {
    scale: true,
    duration: 0.9,
    ease: 'back.out(1.3)',
    onComplete: () => {
      stop.classList.remove('is-revealing');
      reveals.delete(product);
    },
  });
  reveals.set(product, reveal);
}

function pinMap(
  { gsap, ScrollTrigger, lenis }: MotionContext,
  section: HTMLElement,
): (() => void) | undefined {
  const mapPane = resolveTarget(RECORRIDO_SELECTORS.mapPane, section);
  const stops = Array.from(section.querySelectorAll<HTMLElement>(RECORRIDO_SELECTORS.stops));
  if (!mapPane) return undefined;
  if (stops.length === 0) {
    console.warn(`motion: target ${RECORRIDO_SELECTORS.stops} is missing, timeline skipped`);
    return undefined;
  }

  const total = stops.length;
  const route = measureRoute(section);
  const setDashOffset = route
    ? (gsap.quickSetter(route.path, 'strokeDashoffset') as (value: number) => void)
    : null;
  if (route && setDashOffset) {
    gsap.set(route.path, { strokeDasharray: route.length });
    setDashOffset(routeDashOffset(0, route.length, 0, total));
  }

  // The pin drives the stop from here on; the IntersectionObserver follower stands by.
  section.dataset.stopDriver = PIN_DRIVER;

  const reveals: Reveals = new Map();
  let ranges: StopRange[] = stops.map(() => ({ start: 0, settle: 0 }));
  let active = -1;
  let snapTimer: number | undefined;

  const measure = (self: ScrollTrigger) => {
    const distance = Math.max(1, self.end - self.start);
    const viewport = window.innerHeight;
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    let previous = 0;
    ranges = stops.map((stop) => {
      // offsetTop is relative to the section (position: relative) and ignores transforms and pins.
      const start = Math.max(previous, clamp(stop.offsetTop / distance));
      const settle = Math.max(start, clamp((stop.offsetTop + stop.offsetHeight - viewport) / distance));
      previous = start;
      return { start, settle };
    });
  };

  const apply = (rawProgress: number, reveal: boolean) => {
    const progress = stopProgressFromScroll(
      rawProgress,
      ranges.map((range) => range.start),
    );
    const index = stopIndexForProgress(progress, total);
    if (route && setDashOffset) setDashOffset(routeDashOffset(progress, route.length, index, total));
    if (index === active) return;

    const entered = active !== -1;
    active = index;
    writeStopIndicator(section, index, total);
    // A refresh (fonts, images, resize) re-measures and may move the index back and forth: that is
    // not the user entering a stop. `isRefreshing` exists at runtime but is missing from the types.
    const refreshing = (ScrollTrigger as unknown as { isRefreshing?: boolean }).isRefreshing === true;
    if (!reveal || !entered || refreshing) return;
    try {
      revealProduct(gsap, stops[index], section.querySelector(RECORRIDO_SELECTORS.pin(index)), reveals);
    } catch (error) {
      console.warn('motion: recorrido product reveal failed', error);
    }
  };

  const trigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    pin: mapPane,
    pinSpacing: false,
    // The section is scaled by the Despensa stacking right after; a transform pin is not affected
    // by transformed ancestors the way position: fixed is.
    pinType: 'transform',
    invalidateOnRefresh: true,
    onToggle: (self) => mapPane.classList.toggle('is-pinned', self.isActive),
    onRefresh: (self) => {
      measure(self);
      apply(self.progress, false);
    },
    onUpdate: (self) => {
      apply(self.progress, true);
      scheduleSnap();
    },
  });

  /**
   * Gentle snap through Lenis (not ScrollTrigger's own scroll tween, which would fight Lenis):
   * once scrolling has been quiet for a moment inside the pin, glide to the nearer stop edge.
   */
  function snapToStop() {
    if (!trigger.isActive) return;
    const distance = trigger.end - trigger.start;
    if (distance <= 0) return;
    const current = window.scrollY;
    const target = trigger.start + snapProgress((current - trigger.start) / distance, ranges) * distance;
    if (Math.abs(target - current) < 1) return;
    lenis.scrollTo(target, {
      duration: SNAP_DURATION_S,
      easing: (time: number) => 1 - (1 - time) ** 3,
    });
  }

  function scheduleSnap() {
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(snapToStop, SNAP_DELAY_MS);
  }

  // Not recorded by the matchMedia context (quickSetter writes, callbacks-created tweens,
  // attributes and texts): reset them here.
  return () => {
    window.clearTimeout(snapTimer);
    for (const [product, reveal] of reveals) {
      reveal.kill();
      gsap.set(product, { clearProps: 'transform' });
    }
    reveals.clear();
    if (route) gsap.set(route.path, { clearProps: 'strokeDasharray,strokeDashoffset' });
    mapPane.classList.remove('is-pinned');
    for (const stop of stops) stop.classList.remove('is-revealing');
    delete section.dataset.stopDriver;
    writeStopIndicator(section, 0, total);
    section.dispatchEvent(new Event(PIN_RELEASED_EVENT));
  };
}

export function init(motion: MotionContext): () => void {
  const { gsap } = motion;
  gsap.registerPlugin(motion.ScrollTrigger, Flip);

  const section = resolveTarget(RECORRIDO_SELECTORS.section);
  if (!section) return () => undefined;

  // Stacking 2 (the third and last stacking call site): the pantry rises over the end of the trip.
  try {
    stackOver(section, RECORRIDO_SELECTORS.despensa, { scale: 0.92 });
  } catch (error) {
    console.warn('motion: recorrido stacking failed', error);
  }

  const desktop = gsap.matchMedia();
  desktop.add(DESKTOP_QUERY, () => {
    try {
      return pinMap(motion, section);
    } catch (error) {
      console.warn('motion: recorrido pin failed', error);
      return undefined;
    }
  });

  return () => desktop.kill();
}
