import { describe, expect, it } from 'vitest';
import {
  routeDashOffset,
  snapProgress,
  stopIndexForProgress,
  stopProgressFromScroll,
} from './route';

describe('stopIndexForProgress', () => {
  it('maps progress to stops 0–4 at boundaries', () => {
    // Snap points (1/4 increments) land exactly on each stop.
    expect([0, 0.25, 0.5, 0.75, 1].map((progress) => stopIndexForProgress(progress, 5))).toEqual([
      0, 1, 2, 3, 4,
    ]);
    // The active stop switches halfway between two snap points.
    expect(stopIndexForProgress(0.12, 5)).toBe(0);
    expect(stopIndexForProgress(0.13, 5)).toBe(1);
    expect(stopIndexForProgress(0.87, 5)).toBe(3);
    expect(stopIndexForProgress(0.88, 5)).toBe(4);
    // Progress is clamped to [0, 1].
    expect(stopIndexForProgress(-0.5, 5)).toBe(0);
    expect(stopIndexForProgress(3, 5)).toBe(4);
    expect(stopIndexForProgress(Number.NaN, 5)).toBe(0);
    // A single stop is always active.
    expect(stopIndexForProgress(0.7, 1)).toBe(0);
  });

  it('throws RangeError for zero or non-integer stops', () => {
    for (const stops of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => stopIndexForProgress(0.5, stops), `stops ${stops}`).toThrow(RangeError);
    }
  });
});

describe('routeDashOffset', () => {
  it('throws RangeError for non-positive path length', () => {
    for (const pathLength of [0, -120, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => routeDashOffset(0.5, pathLength, 2), `pathLength ${pathLength}`).toThrow(
        RangeError,
      );
    }
    for (const stopIndex of [-1, 5, 1.5]) {
      expect(() => routeDashOffset(0.5, 500, stopIndex), `stopIndex ${stopIndex}`).toThrow(
        RangeError,
      );
    }
    expect(() => routeDashOffset(0.5, 500, 0, 0)).toThrow(RangeError);
  });

  it('draws the route from Funes up to the active stop', () => {
    // Five legs (Funes → Salta → … → Río Negro); stop i is reached at progress i / 4.
    expect(routeDashOffset(0, 500, 0)).toBeCloseTo(400);
    expect(routeDashOffset(0.25, 500, 1)).toBeCloseTo(300);
    expect(routeDashOffset(0.5, 500, 2)).toBeCloseTo(200);
    expect(routeDashOffset(1, 500, 4)).toBeCloseTo(0);
    // Scrubbed between stops.
    expect(routeDashOffset(0.375, 500, 1)).toBeCloseTo(250);
    // Never more than half a leg away from the active stop, whatever the progress says.
    expect(routeDashOffset(1, 500, 0)).toBeCloseTo(350);
    expect(routeDashOffset(0, 500, 4)).toBeCloseTo(50);
    expect(routeDashOffset(Number.NaN, 500, 0)).toBeCloseTo(400);
  });
});

describe('stopProgressFromScroll', () => {
  it('spreads uneven stop heights evenly over the stop range', () => {
    // Stops start at 0, 0.1, 0.5 and 0.6 of the pinned scroll (uneven heights).
    const starts = [0, 0.1, 0.5, 0.6];
    expect(stopProgressFromScroll(0, starts)).toBe(0);
    expect(stopProgressFromScroll(0.1, starts)).toBeCloseTo(1 / 3);
    expect(stopProgressFromScroll(0.3, starts)).toBeCloseTo(0.5);
    expect(stopProgressFromScroll(0.5, starts)).toBeCloseTo(2 / 3);
    expect(stopProgressFromScroll(0.6, starts)).toBe(1);
    expect(stopProgressFromScroll(0.9, starts)).toBe(1);
    expect(stopProgressFromScroll(-1, starts)).toBe(0);
    expect(stopProgressFromScroll(Number.NaN, starts)).toBe(0);
    expect(stopProgressFromScroll(0.4, [0])).toBe(1);
    expect(() => stopProgressFromScroll(0.5, [])).toThrow(RangeError);
    expect(() => stopProgressFromScroll(0.5, [0, 0.6, 0.3])).toThrow(RangeError);
  });
});

describe('snapProgress', () => {
  it('settles between stops and never strands the content of a tall stop', () => {
    const ranges = [
      { start: 0, settle: 0 },
      { start: 0.25, settle: 0.4 }, // taller than the viewport
      { start: 1, settle: 1 },
    ];
    expect(snapProgress(0.1, ranges)).toBe(0);
    expect(snapProgress(0.2, ranges)).toBe(0.25);
    expect(snapProgress(0.3, ranges)).toBe(0.3);
    expect(snapProgress(0.6, ranges)).toBe(0.4);
    expect(snapProgress(0.8, ranges)).toBe(1);
    expect(snapProgress(Number.NaN, ranges)).toBeNaN();
    expect(snapProgress(0.5, [])).toBe(0.5);
    expect(snapProgress(1.2, ranges)).toBe(1.2);
  });
});
