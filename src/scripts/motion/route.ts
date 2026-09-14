/**
 * Pure helpers for El recorrido (project doc §5.1). `progress` is always the progress of the pinned
 * map across the stops: stop `i` of `n` sits at `i / (n - 1)` (the 1/4 snap points for 5 stops).
 */

function clampProgress(progress: number): number {
  return Number.isNaN(progress) ? 0 : Math.min(1, Math.max(0, progress));
}

function assertStops(stops: number): void {
  if (!Number.isInteger(stops) || stops < 1) {
    throw new RangeError(`stops must be an integer >= 1, received ${stops}`);
  }
}

/** Active stop for a progress in [0, 1]; the switch happens halfway between two snap points. */
export function stopIndexForProgress(progress: number, stops: number): number {
  assertStops(stops);
  return Math.round(clampProgress(progress) * (stops - 1));
}

/**
 * `stroke-dashoffset` for a route of `stops` legs (Funes → stop 0 → … → stop n-1), assuming legs of
 * equal length. At stop `i` the route reaches its pin; between stops the next leg is scrubbed. The
 * drawn length never strays more than half a leg from the active stop.
 */
export function routeDashOffset(
  progress: number,
  pathLength: number,
  stopIndex: number,
  stops = 5,
): number {
  if (!Number.isFinite(pathLength) || pathLength <= 0) {
    throw new RangeError(`pathLength must be > 0, received ${pathLength}`);
  }
  assertStops(stops);
  if (!Number.isInteger(stopIndex) || stopIndex < 0 || stopIndex >= stops) {
    throw new RangeError(`stopIndex must be an integer in [0, ${stops - 1}], received ${stopIndex}`);
  }
  const scrubbedLegs = 1 + clampProgress(progress) * (stops - 1);
  const drawnLegs = Math.min(
    stops,
    Math.max(1, stopIndex + 0.5, Math.min(stopIndex + 1.5, scrubbedLegs)),
  );
  return pathLength * (1 - drawnLegs / stops);
}

/**
 * Maps raw scroll progress of the pin to stop progress when panels have uneven heights.
 * `stopStarts` holds the raw progress at which each stop reaches the top (ascending); each gap
 * between two starts is spread over an equal share, so snap points stay at `i / (n - 1)`.
 */
export function stopProgressFromScroll(progress: number, stopStarts: readonly number[]): number {
  if (stopStarts.length === 0) throw new RangeError('stopStarts must not be empty');
  for (let index = 1; index < stopStarts.length; index += 1) {
    if (!(stopStarts[index] >= stopStarts[index - 1])) {
      throw new RangeError('stopStarts must be ascending');
    }
  }
  const last = stopStarts.length - 1;
  if (last === 0) return 1;
  if (Number.isNaN(progress) || progress <= stopStarts[0]) return 0;
  if (progress >= stopStarts[last]) return 1;

  let index = 0;
  while (progress >= stopStarts[index + 1]) index += 1;
  const span = stopStarts[index + 1] - stopStarts[index];
  const local = span > 0 ? (progress - stopStarts[index]) / span : 0;
  return (index + local) / last;
}

/** Scroll range of one stop in raw pin progress: where it reaches the top, and where it settles. */
export interface StopRange {
  /** Raw progress at which the stop's top reaches the viewport top. */
  start: number;
  /** Raw progress at which the stop's bottom reaches the viewport bottom (= start if it fits). */
  settle: number;
}

/**
 * Gentle snap: inside a stop taller than the viewport the scroll is left alone (its content stays
 * readable); between two stops it settles on the nearer edge, so nobody rests between provinces.
 */
export function snapProgress(value: number, ranges: readonly StopRange[]): number {
  if (Number.isNaN(value) || ranges.length === 0) return value;
  const inside = ranges.some((range) => value >= range.start && value <= range.settle);
  if (inside) return value;
  for (let index = 0; index < ranges.length - 1; index += 1) {
    const from = ranges[index].settle;
    const to = ranges[index + 1].start;
    if (value > from && value < to) return value - from <= to - value ? from : to;
  }
  return value;
}
