import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { resolveTarget, type MotionTarget } from './targets';

export interface StackOverOptions {
  /** Final scale of the covered section. */
  scale?: number;
  /** Final opacity of the dark shade drawn over the covered section (0–1). */
  dim?: number;
}

/**
 * Stacking transition (project doc §5.2): `under` stays pinned once its bottom reaches the
 * viewport bottom, scales down and darkens while `over` slides across it. Only transform and the
 * opacity of a decorative shade are animated; content is never hidden.
 */
export function stackOver(
  under: MotionTarget,
  over: MotionTarget,
  { scale = 0.92, dim = 0.45 }: StackOverOptions = {},
): ScrollTrigger | null {
  gsap.registerPlugin(ScrollTrigger);
  const underElement = resolveTarget(under);
  const overElement = resolveTarget(over);
  if (!underElement || !overElement) return null;

  underElement.classList.add('stack-under');
  overElement.classList.add('stack-over');

  const timeline = gsap.timeline({ defaults: { ease: 'none' } }).fromTo(
    underElement,
    {
      scale: 1,
      '--stack-dim': 0,
      // Scale toward the top edge of what is on screen while pinned.
      transformOrigin: () =>
        `50% ${Math.max(0, underElement.offsetHeight - window.innerHeight)}px`,
    },
    { scale, '--stack-dim': dim },
  );

  return ScrollTrigger.create({
    trigger: underElement,
    start: 'bottom bottom',
    endTrigger: overElement,
    end: 'top top',
    pin: true,
    pinSpacing: false,
    scrub: true,
    animation: timeline,
    invalidateOnRefresh: true,
    // will-change only while the stacking runs, so the covered section is not kept promoted.
    onToggle: (self) => underElement.classList.toggle('is-stacking', self.isActive),
  });
}

/**
 * Footer curtain (project doc §5.2): the footer sits underneath and holds still while `section`
 * lifts away, revealing the giant wordmark. Implemented as a scrubbed counter-translation of the
 * footer (transform only), so it also works when the footer is taller than the viewport.
 */
export function curtainReveal(section: MotionTarget, footer: MotionTarget): ScrollTrigger | null {
  gsap.registerPlugin(ScrollTrigger);
  const sectionElement = resolveTarget(section);
  const footerElement = resolveTarget(footer);
  if (!sectionElement || !footerElement) return null;

  sectionElement.classList.add('curtain');
  footerElement.classList.add('curtain-reveal');

  const distance = () => Math.min(footerElement.offsetHeight, window.innerHeight);
  const timeline = gsap
    .timeline({ defaults: { ease: 'none' } })
    .fromTo(footerElement, { y: () => -distance() }, { y: 0 }, 0);

  const wordmark = resolveTarget('[data-footer-wordmark]', footerElement);
  if (wordmark) {
    timeline.fromTo(wordmark, { yPercent: 35, scale: 0.94 }, { yPercent: 0, scale: 1 }, 0);
  }

  // The trigger is the section (never transformed), whose bottom is the footer's natural top.
  return ScrollTrigger.create({
    trigger: sectionElement,
    start: 'bottom bottom',
    end: () => `+=${distance()}`,
    scrub: true,
    animation: timeline,
    invalidateOnRefresh: true,
  });
}
