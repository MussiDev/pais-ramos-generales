/**
 * Pure helpers for the El recorrido map camera: the SVG viewBox that frames the current leg of the
 * route (origin, previous stop, active stop) at the aspect ratio of the rendered map box, so the
 * map fills its pane instead of letterboxing a tall country into a narrow column.
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameOptions {
  /** Width / height of the rendered SVG box. */
  aspect: number;
  /** Space kept around the framed boxes, in viewBox units. */
  padding: number;
  /** Smallest viewBox height, so a short leg is not over-zoomed. */
  minHeight: number;
  /** The full map viewBox; the camera never shows more than this fitted to `aspect`. */
  bounds: Box;
}

const round = (value: number) => Math.round(value * 10) / 10;

function assertBox(box: Box, name: string): void {
  const values = [box.x, box.y, box.width, box.height];
  if (!values.every(Number.isFinite) || box.width < 0 || box.height < 0) {
    throw new RangeError(`${name} must be a finite box with non-negative size`);
  }
}

/** Grows `box` around its center until it has the given aspect ratio. */
export function fitAspect(box: Box, aspect: number): Box {
  if (!(aspect > 0) || !Number.isFinite(aspect)) {
    throw new RangeError(`aspect must be > 0, received ${aspect}`);
  }
  assertBox(box, 'box');
  const width = Math.max(box.width, box.height * aspect);
  const height = width / aspect;
  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  };
}

/** Smallest box containing every box in `boxes`. */
export function unionBoxes(boxes: readonly Box[]): Box {
  if (boxes.length === 0) throw new RangeError('boxes must not be empty');
  boxes.forEach((box, index) => assertBox(box, `boxes[${index}]`));
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * The viewBox that frames `boxes`: padded, at least `minHeight` tall, at `aspect`, and kept inside
 * the full map (fitted to the same aspect) so the camera never reveals more than the whole country.
 */
export function frameViewBox(boxes: readonly Box[], options: FrameOptions): Box {
  const { aspect, padding, minHeight, bounds } = options;
  if (!(padding >= 0) || !(minHeight >= 0)) {
    throw new RangeError('padding and minHeight must be >= 0');
  }
  const full = fitAspect(bounds, aspect);
  const union = unionBoxes(boxes);
  const padded = {
    x: union.x - padding,
    y: union.y - padding,
    width: union.width + padding * 2,
    height: union.height + padding * 2,
  };
  const tall = Math.max(padded.height, minHeight);
  const framed = fitAspect({ ...padded, y: padded.y - (tall - padded.height) / 2, height: tall }, aspect);
  if (framed.width >= full.width) return roundBox(full);

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  return roundBox({
    x: clamp(framed.x, full.x, full.x + full.width - framed.width),
    y: clamp(framed.y, full.y, full.y + full.height - framed.height),
    width: framed.width,
    height: framed.height,
  });
}

function roundBox(box: Box): Box {
  return { x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height) };
}

export function viewBoxAttribute(box: Box): string {
  return `${box.x} ${box.y} ${box.width} ${box.height}`;
}
