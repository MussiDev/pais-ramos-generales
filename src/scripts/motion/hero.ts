import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { clampRotation } from './clamp';
import { resolveTarget } from './targets';

export const HERO_SELECTORS = {
  section: '#hero',
  jar: '[data-hero-jar]',
  stamp: '[data-stamp]',
} as const;

const MAX_JAR_ROTATION_DEG = 6;
/** On `#hero` while it is off screen: CSS loops (the ticker) pause with it. */
export const HERO_OFFSCREEN_CLASS = 'hero--offscreen';

/** The endless loops (jar float, stamp turn), paused while the hero is off screen. */
const loops: gsap.core.Tween[] = [];

/**
 * The hero's loops run forever; once the page scrolls past the hero they would keep rewriting
 * styles (and re-laying out the stamp text) every frame for nothing anyone sees. Pause them, and
 * the CSS ticker, while the hero is out of view.
 */
function pauseLoopsOffscreen(section: HTMLElement): () => void {
  if (typeof IntersectionObserver !== 'function') return () => undefined;
  const observer = new IntersectionObserver(([entry]) => {
    const visible = entry.isIntersecting;
    section.classList.toggle(HERO_OFFSCREEN_CLASS, !visible);
    for (const loop of loops) {
      if (visible) loop.resume();
      else loop.pause();
    }
  });
  observer.observe(section);
  return () => {
    observer.disconnect();
    section.classList.remove(HERO_OFFSCREEN_CLASS);
  };
}
const STAMP_TURN_SECONDS = 24;

/** Jar float + scroll-tied rotation (clamped to ±6°). Returns a cleanup for the rotation. */
function animateJar(section: HTMLElement, jar: HTMLElement): () => void {
  loops.push(gsap.to(jar, {
    yPercent: -4,
    duration: 2.6,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  }));

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
  loops.push(gsap.to(ring, {
    rotation: 360,
    duration: STAMP_TURN_SECONDS,
    ease: 'none',
    repeat: -1,
    transformOrigin: '50% 50%',
  }));
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

  loops.length = 0;
  const cleanupJar = section && jar ? isolated('jar', () => animateJar(section, jar)) : undefined;
  if (stamp) isolated('stamp', () => animateStamp(stamp));
  const cleanupPause = section ? isolated('offscreen pause', () => pauseLoopsOffscreen(section)) : undefined;

  return () => {
    cleanupJar?.();
    cleanupPause?.();
  };
}
