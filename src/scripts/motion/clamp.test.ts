import { describe, expect, it } from 'vitest';
import { clampRotation } from './clamp';

describe('clampRotation', () => {
  it('never exceeds ±6° for any progress', () => {
    const samples = [
      Number.NEGATIVE_INFINITY,
      -10,
      -0.5,
      0,
      0.25,
      0.5,
      0.75,
      1,
      1.5,
      42,
      Number.POSITIVE_INFINITY,
      Number.NaN,
    ];
    for (let step = 0; step <= 100; step += 1) samples.push(step / 100);

    for (const progress of samples) {
      const degrees = clampRotation(progress, 6);
      expect(Number.isFinite(degrees), `finite for ${progress}`).toBe(true);
      expect(Math.abs(degrees), `within ±6° for ${progress}`).toBeLessThanOrEqual(6);
    }

    // It actually sweeps the full range, from -6° at the start to +6° at the end.
    expect(clampRotation(0, 6)).toBe(-6);
    expect(clampRotation(0.5, 6)).toBe(0);
    expect(clampRotation(1, 6)).toBe(6);
  });

  it('throws RangeError for invalid maxDeg', () => {
    for (const maxDeg of [0, -1, 45.01, 90, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => clampRotation(0.5, maxDeg), `maxDeg ${maxDeg}`).toThrow(RangeError);
    }
    expect(clampRotation(1, 45)).toBe(45);
  });
});
