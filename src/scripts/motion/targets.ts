export type MotionTarget = string | Element | null | undefined;

/**
 * Resolves a timeline target to an HTMLElement. A missing target is not an error: the caller
 * skips that timeline and the warning names the selector so the gap is easy to find.
 */
export function resolveTarget(target: MotionTarget, root: ParentNode = document): HTMLElement | null {
  const candidate = typeof target === 'string' ? root.querySelector(target) : target;
  if (candidate instanceof HTMLElement) return candidate;

  const name = typeof target === 'string' ? target : 'element (none given)';
  const reason = candidate ? 'is not an HTMLElement' : 'is missing';
  console.warn(`motion: target ${name} ${reason}, timeline skipped`);
  return null;
}
