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
import { SplitText } from 'gsap/SplitText';
import { frameViewBox, viewBoxAttribute, type Box } from './camera';
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
  map: '[data-map]',
  origin: '.map__origin',
  route: '[data-route]',
  stops: '.recorrido__stops > [data-stop-index]',
  pin: (index: number) => `[data-pin][data-stop-index="${index}"]`,
  stopProvinces: (index: number) => `[data-stop-province="${index}"]`,
  stopName: '.stop__name',
  terrainBack: '.terrain__back, .terrain__snow',
  flipTarget: '[data-flip-target]',
  despensa: '#despensa',
} as const;

export const DESKTOP_QUERY = '(min-width: 768px)';
export const MOBILE_QUERY = '(max-width: 767px)';

/** Resting angle of the revealed product (the "3/4" pose from the design). */
const SETTLED_ROTATION_DEG = -6;
/** Quiet time after the last scroll update before snapping. */
const SNAP_DELAY_MS = 180;
const SNAP_DURATION_S = 0.6;
/** Camera framing, in map viewBox units: room for labels, and the closest it ever zooms. */
const CAMERA_PADDING = 28;
const CAMERA_MIN_HEIGHT = 230;
const CAMERA_DURATION_S = 1.1;
/** Back terrain layer drift across one stop, in terrain viewBox units (the SVG is 360 tall). */
const TERRAIN_DRIFT = { from: 40, to: -20 } as const;

type Gsap = MotionContext['gsap'];
type Reveals = Map<HTMLElement, gsap.core.Timeline>;

/**
 * The map camera: on each stop the SVG viewBox glides to frame Funes, the previous stop and the
 * active one, at the aspect of the rendered box ("slice", so it fills the pane). The static markup
 * keeps the whole country, which is what mobile, reduced motion and no-JS show.
 */
function createCamera(gsap: Gsap, section: HTMLElement, total: number) {
  const svg = section.querySelector<SVGSVGElement>(RECORRIDO_SELECTORS.map);
  const origin = section.querySelector<SVGGraphicsElement>(RECORRIDO_SELECTORS.origin);
  if (!svg || !origin || typeof origin.getBBox !== 'function') {
    console.warn('motion: recorrido map camera skipped (map or origin missing)');
    return null;
  }
  const initialViewBox = svg.getAttribute('viewBox');
  const initialAspect = svg.getAttribute('preserveAspectRatio');
  const base = svg.viewBox.baseVal;
  const bounds: Box = { x: base.x, y: base.y, width: base.width, height: base.height };
  const pins = Array.from({ length: total }, (_, index) =>
    section.querySelector<SVGGraphicsElement>(RECORRIDO_SELECTORS.pin(index)),
  );
  let tween: gsap.core.Tween | null = null;

  const frame = (index: number): string | null => {
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    // The leg (origin, previous and active pin with their labels) plus the whole active province.
    const framed = [
      origin,
      pins[index - 1],
      pins[index],
      ...svg.querySelectorAll(RECORRIDO_SELECTORS.stopProvinces(index)),
    ].filter((element): element is SVGGraphicsElement => element instanceof SVGGraphicsElement);
    const boxes = framed.map((element) => element.getBBox());
    return viewBoxAttribute(
      frameViewBox(boxes, {
        aspect: rect.width / rect.height,
        padding: CAMERA_PADDING,
        minHeight: CAMERA_MIN_HEIGHT,
        bounds,
      }),
    );
  };

  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

  return {
    /** Frames stop `index`, gliding there when `animate`, jumping otherwise (refresh, first paint). */
    show(index: number, animate: boolean) {
      const viewBox = frame(index);
      if (!viewBox) return;
      tween?.kill();
      tween = animate
        ? gsap.to(svg, { attr: { viewBox }, duration: CAMERA_DURATION_S, ease: 'power3.inOut' })
        : null;
      if (!animate) svg.setAttribute('viewBox', viewBox);
    },
    reset() {
      tween?.kill();
      if (initialViewBox) svg.setAttribute('viewBox', initialViewBox);
      if (initialAspect) svg.setAttribute('preserveAspectRatio', initialAspect);
      else svg.removeAttribute('preserveAspectRatio');
    },
  };
}

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

/**
 * Giant province names: split into characters behind a line mask, which rise into place when the
 * stop is entered (or drop in, scrolling back up). Only the entrance animates; at rest the name is
 * plain visible text, and SplitText keeps it readable as one label for assistive tech.
 */
function createNameReveals(gsap: Gsap, stops: HTMLElement[]) {
  const splits = stops.map((stop) => {
    const name = stop.querySelector<HTMLElement>(RECORRIDO_SELECTORS.stopName);
    return name ? SplitText.create(name, {
          // Word masks, not line masks: they keep the natural (balanced) wrapping of the name.
          type: 'words,chars',
          mask: 'words',
          wordsClass: 'stop__name-word',
        }) : null;
  });
  let tween: gsap.core.Tween | null = null;

  return {
    play(index: number, direction: 1 | -1) {
      const chars = splits[index]?.chars;
      if (!chars?.length) return;
      tween?.progress(1).kill();
      tween = gsap.from(chars, {
        yPercent: 110 * direction,
        duration: 0.9,
        ease: 'expo.out',
        stagger: 0.025 * direction,
      });
    },
    revert() {
      tween?.kill();
      for (const split of splits) split?.revert();
    },
  };
}

/** The back terrain layer drifts slower than its panel scrolls: a little depth per province. */
function driftTerrain(gsap: Gsap, stops: HTMLElement[]) {
  for (const stop of stops) {
    const layers = stop.querySelectorAll(RECORRIDO_SELECTORS.terrainBack);
    if (layers.length === 0) continue;
    gsap.fromTo(
      layers,
      { y: TERRAIN_DRIFT.from },
      {
        y: TERRAIN_DRIFT.to,
        ease: 'none',
        scrollTrigger: { trigger: stop, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  }
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
  // The sticky header sits above the pinned map pane; without this offset both pin at the
  // same y and the header covers the top of the map/heading while this section scrolls.
  const header = document.querySelector<HTMLElement>('.site-header');
  const headerOffset = header?.offsetHeight ?? 0;
  const route = measureRoute(section);
  const setDashOffset = route
    ? (gsap.quickSetter(route.path, 'strokeDashoffset') as (value: number) => void)
    : null;
  if (route && setDashOffset) {
    gsap.set(route.path, { strokeDasharray: route.length });
    setDashOffset(routeDashOffset(0, route.length, 0, total));
  }
  const camera = createCamera(gsap, section, total);
  const names = createNameReveals(gsap, stops);
  driftTerrain(gsap, stops);

  // The pin drives the stop from here on; the IntersectionObserver follower stands by.
  section.dataset.stopDriver = PIN_DRIVER;

  const reveals: Reveals = new Map();
  let ranges: StopRange[] = stops.map(() => ({ start: 0, settle: 0 }));
  let active = -1;
  let snapTimer: number | undefined;

  const measure = (self: ScrollTrigger) => {
    const distance = Math.max(1, self.end - self.start);
    // Stops settle below the sticky header, so only this much of each one is ever on screen.
    const viewport = window.innerHeight - headerOffset;
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
    const direction = index > active ? 1 : -1;
    active = index;
    writeStopIndicator(section, index, total);
    // A refresh (fonts, images, resize) re-measures and may move the index back and forth: that is
    // not the user entering a stop. `isRefreshing` exists at runtime but is missing from the types.
    const refreshing = (ScrollTrigger as unknown as { isRefreshing?: boolean }).isRefreshing === true;
    const moving = reveal && entered && !refreshing;
    camera?.show(index, moving);
    if (!moving) return;
    names.play(index, direction);
    try {
      revealProduct(gsap, stops[index], section.querySelector(RECORRIDO_SELECTORS.pin(index)), reveals);
    } catch (error) {
      console.warn('motion: recorrido product reveal failed', error);
    }
  };

  const trigger = ScrollTrigger.create({
    trigger: section,
    start: `top ${headerOffset}`,
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
      // The map box may have been resized: re-frame the active stop at the new aspect.
      camera?.show(active, false);
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
    camera?.reset();
    names.revert();
    mapPane.classList.remove('is-pinned');
    for (const stop of stops) stop.classList.remove('is-revealing');
    delete section.dataset.stopDriver;
    writeStopIndicator(section, 0, total);
    section.dispatchEvent(new Event(PIN_RELEASED_EVENT));
  };
}

/**
 * Mobile: nothing is pinned (the CSS sticky strip applies and `recorrido-stops.ts` keeps
 * `data-stop` current), but the map camera follows the active stop so the strip shows the leg
 * up close instead of a country-sized thumbnail. It also measures how much of the pane sits above
 * the map row (`--strip-intro`), so only that row sticks below the site header.
 */
function followOnMobile(gsap: Gsap, section: HTMLElement): (() => void) | undefined {
  const pane = resolveTarget(RECORRIDO_SELECTORS.mapPane, section);
  const svg = section.querySelector<SVGSVGElement>(RECORRIDO_SELECTORS.map);
  if (!pane || !svg) return undefined;

  const measureIntro = () => {
    const intro = svg.getBoundingClientRect().top - pane.getBoundingClientRect().top;
    pane.style.setProperty('--strip-intro', `${Math.max(0, Math.round(intro))}px`);
  };
  measureIntro();
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(measureIntro) : null;
  resize?.observe(pane);

  const camera = createCamera(gsap, section, section.querySelectorAll('[data-pin]').length);
  const activeStop = () => Number(section.dataset.stop ?? 0) || 0;
  camera?.show(activeStop(), false);
  const follower = new MutationObserver(() => camera?.show(activeStop(), true));
  follower.observe(section, { attributes: true, attributeFilter: ['data-stop'] });

  return () => {
    follower.disconnect();
    resize?.disconnect();
    camera?.reset();
    pane.style.removeProperty('--strip-intro');
  };
}

export function init(motion: MotionContext): () => void {
  const { gsap } = motion;
  gsap.registerPlugin(motion.ScrollTrigger, Flip, SplitText);

  const section = resolveTarget(RECORRIDO_SELECTORS.section);
  if (!section) return () => undefined;

  // Stacking 2 (the third and last stacking call site): the pantry rises over the end of the trip.
  try {
    stackOver(section, RECORRIDO_SELECTORS.despensa, { scale: 0.92 });
  } catch (error) {
    console.warn('motion: recorrido stacking failed', error);
  }

  const media = gsap.matchMedia();
  media.add(DESKTOP_QUERY, () => {
    try {
      return pinMap(motion, section);
    } catch (error) {
      console.warn('motion: recorrido pin failed', error);
      return undefined;
    }
  });

  media.add(MOBILE_QUERY, () => {
    try {
      return followOnMobile(gsap, section);
    } catch (error) {
      console.warn('motion: recorrido mobile map camera failed', error);
      return undefined;
    }
  });

  return () => media.kill();
}
