/**
 * Filtering la despensa changes its height, which moves every ScrollTrigger below it (the footer
 * curtain). This listens for `DESPENSA_FILTERED_EVENT` and refreshes ScrollTrigger at most once per
 * animation frame. It receives ScrollTrigger from the motion context instead of importing GSAP.
 */
import { DESPENSA_FILTERED_EVENT } from '../despensa-filter';

export interface RefreshableLike {
  refresh(): void;
}

/** Returns a cleanup that removes the listener and cancels a pending refresh. */
export function refreshOnDespensaFilter(
  scrollTrigger: RefreshableLike,
  root: ParentNode = document,
): () => void {
  const section = root.querySelector<HTMLElement>('#despensa');
  if (!section) return () => {};

  let frame: number | null = null;
  const schedule = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      scrollTrigger.refresh();
    });
  };

  section.addEventListener(DESPENSA_FILTERED_EVENT, schedule);
  return () => {
    section.removeEventListener(DESPENSA_FILTERED_EVENT, schedule);
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  };
}
