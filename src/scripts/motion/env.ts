export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export type MatchMediaLike = (query: string) => { matches: boolean };

/**
 * Motion is progressive enhancement: animate only when the browser can tell us the user has not
 * asked for reduced motion. Missing or broken `matchMedia` keeps the static layout.
 */
export function shouldAnimate(matchMedia: MatchMediaLike | null | undefined): boolean {
  if (typeof matchMedia !== 'function') return false;
  try {
    return !matchMedia(REDUCED_MOTION_QUERY).matches;
  } catch {
    return false;
  }
}
