import { describe, expect, it } from 'vitest';
import { REDUCED_MOTION_QUERY, shouldAnimate } from './env';

const mediaMatching = (reduced: boolean) => (query: string) => ({
  matches: query === REDUCED_MOTION_QUERY ? reduced : false,
});

describe('shouldAnimate', () => {
  it('returns false when prefers-reduced-motion is reduce', () => {
    expect(shouldAnimate(mediaMatching(true))).toBe(false);
    expect(shouldAnimate(mediaMatching(false))).toBe(true);
  });

  it('returns false when matchMedia is unavailable', () => {
    expect(shouldAnimate(undefined)).toBe(false);
    expect(shouldAnimate(null)).toBe(false);
    expect(
      shouldAnimate(() => {
        throw new Error('matchMedia not supported');
      }),
    ).toBe(false);
  });
});
