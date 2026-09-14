const MAX_ALLOWED_DEG = 45;

/**
 * Maps scroll progress to a rotation that sweeps from `-maxDeg` (progress 0) to `+maxDeg`
 * (progress 1). Progress outside [0, 1] (or NaN) is clamped, so the result never leaves the range.
 */
export function clampRotation(progress: number, maxDeg: number): number {
  if (!Number.isFinite(maxDeg) || maxDeg <= 0 || maxDeg > MAX_ALLOWED_DEG) {
    throw new RangeError(`maxDeg must be in (0, ${MAX_ALLOWED_DEG}], received ${maxDeg}`);
  }
  const clamped = Number.isNaN(progress) ? 0 : Math.min(1, Math.max(0, progress));
  return (clamped * 2 - 1) * maxDeg;
}
