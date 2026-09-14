import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { clampRotation } from './clamp';
import { resolveTarget } from './targets';

export const HERO_SELECTORS = {
  section: '#hero',
  jar: '[data-hero-jar]',
  stamp: '[data-stamp]',
  ticker: '[data-ticker]',
} as const;

const MAX_JAR_ROTATION_DEG = 6;
const STAMP_TURN_SECONDS = 24;
const TICKER_PX_PER_SECOND = 45;

/** Jar float + scroll-tied rotation (clamped to ±6°). Returns a cleanup for the rotation. */
function animateJar(section: HTMLElement, jar: HTMLElement): () => void {
  gsap.to(jar, {
    yPercent: -4,
    duration: 2.6,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });

  const setRotation = gsap.quickSetter(jar, 'rotation', 'deg') as (value: number) => void;
  const applyProgress = (progress: number) =>
    setRotation(clampRotation(progress, MAX_JAR_ROTATION_DEG));

  // Absolute scroll range (the hero is the first section and gets pinned by the stacking),
  // so the range does not depend on the pinned element's own measurements.
  ScrollTrigger.create({
    start: 0,
    end: () => Math.max(1, section.offsetHeight),
    onUpdate: (self) => applyProgress(self.progress),
    onRefresh: (self) => applyProgress(self.progress),
  });
  applyProgress(0);

  // quickSetter writes are not recorded by the matchMedia context, so clear them explicitly.
  return () => gsap.set(jar, { clearProps: 'transform' });
}

/** Slow endless turn of the stamp ring (the icon in the middle stays upright). */
function animateStamp(stamp: HTMLElement) {
  const ring = stamp.querySelector<SVGSVGElement>('.stamp__ring') ?? stamp;
  gsap.to(ring, {
    rotation: 360,
    duration: STAMP_TURN_SECONDS,
    ease: 'none',
    repeat: -1,
    transformOrigin: '50% 50%',
  });
}

/** Horizontal loop: the track holds the list twice, so -50% lands exactly on the copy. */
function animateTicker(ticker: HTMLElement) {
  const track = resolveTarget('.ticker__track', ticker);
  if (!track) return;
  const lists = track.querySelectorAll<HTMLElement>('.ticker__list');
  if (lists.length < 2) {
    console.warn('motion: ticker needs a duplicated .ticker__list, timeline skipped');
    return;
  }
  const loopWidth = lists[0].offsetWidth;
  gsap.fromTo(
    track,
    { xPercent: 0 },
    {
      xPercent: -50,
      duration: Math.max(8, loopWidth / TICKER_PX_PER_SECOND),
      ease: 'none',
      repeat: -1,
    },
  );
}

function isolated<T>(name: string, run: () => T): T | undefined {
  try {
    return run();
  } catch (error) {
    console.warn(`motion: hero ${name} failed`, error);
    return undefined;
  }
}

/**
 * Sets up the hero timelines. Must run synchronously inside the motion matchMedia context so the
 * tweens and ScrollTriggers are reverted with it; returns a cleanup for what GSAP cannot revert.
 */
export function initHero(root: ParentNode = document): () => void {
  gsap.registerPlugin(ScrollTrigger);

  const section = resolveTarget(HERO_SELECTORS.section, root);
  const jar = resolveTarget(HERO_SELECTORS.jar, root);
  const stamp = resolveTarget(HERO_SELECTORS.stamp, root);
  const ticker = resolveTarget(HERO_SELECTORS.ticker, root);

  const cleanupJar = section && jar ? isolated('jar', () => animateJar(section, jar)) : undefined;
  if (stamp) isolated('stamp', () => animateStamp(stamp));
  if (ticker) isolated('ticker', () => animateTicker(ticker));

  return () => cleanupJar?.();
}
