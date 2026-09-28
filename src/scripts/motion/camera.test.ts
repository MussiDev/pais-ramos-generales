import { describe, expect, it } from 'vitest';
import { cameraTransform, fitAspect, frameViewBox, unionBoxes, viewBoxAttribute, type Box } from './camera';

const MAP: Box = { x: 0, y: 0, width: 380, height: 660 };
const point = (x: number, y: number): Box => ({ x, y, width: 0, height: 0 });

describe('fitAspect', () => {
  it('widens a tall box around its center', () => {
    expect(fitAspect({ x: 0, y: 0, width: 100, height: 200 }, 1)).toEqual({
      x: -50,
      y: 0,
      width: 200,
      height: 200,
    });
  });

  it('heightens a wide box around its center', () => {
    expect(fitAspect({ x: 0, y: 0, width: 200, height: 50 }, 2)).toEqual({
      x: 0,
      y: -25,
      width: 200,
      height: 100,
    });
  });

  it('throws RangeError for an invalid aspect or box', () => {
    for (const aspect of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => fitAspect(MAP, aspect), `aspect ${aspect}`).toThrow(RangeError);
    }
    expect(() => fitAspect({ ...MAP, width: -1 }, 1)).toThrow(RangeError);
    expect(() => fitAspect({ ...MAP, x: Number.NaN }, 1)).toThrow(RangeError);
  });
});

describe('unionBoxes', () => {
  it('returns the smallest box containing every box', () => {
    expect(unionBoxes([point(10, 20), { x: 50, y: 5, width: 10, height: 10 }])).toEqual({
      x: 10,
      y: 5,
      width: 50,
      height: 15,
    });
  });

  it('throws RangeError for no boxes', () => {
    expect(() => unionBoxes([])).toThrow(RangeError);
  });
});

describe('frameViewBox', () => {
  const options = { aspect: 1, padding: 10, minHeight: 0, bounds: MAP };

  it('frames the padded boxes at the requested aspect', () => {
    const box = frameViewBox([point(100, 100), point(160, 200)], options);
    // Union 60x100, padded 80x120, widened to 120x120 around x = 130.
    expect(box).toEqual({ x: 70, y: 90, width: 120, height: 120 });
  });

  it('never frames less than minHeight', () => {
    const box = frameViewBox([point(200, 300)], { ...options, padding: 0, minHeight: 100 });
    expect(box).toEqual({ x: 150, y: 250, width: 100, height: 100 });
  });

  it('keeps the frame inside the full map', () => {
    // A leg at the top-left corner would reach above and left of the map.
    const box = frameViewBox([point(5, 5), point(40, 40)], options);
    expect(box.x).toBeGreaterThanOrEqual(fitAspect(MAP, 1).x);
    expect(box.y).toBe(0);
    expect(box.width).toBe(55);
  });

  it('falls back to the whole map, fitted to the aspect, when the leg is larger', () => {
    const box = frameViewBox([point(0, 0), point(380, 660)], options);
    expect(box).toEqual({ x: -140, y: 0, width: 660, height: 660 });
  });

  it('throws RangeError for negative padding or minHeight', () => {
    expect(() => frameViewBox([point(0, 0)], { ...options, padding: -1 })).toThrow(RangeError);
    expect(() => frameViewBox([point(0, 0)], { ...options, minHeight: Number.NaN })).toThrow(
      RangeError,
    );
  });
});

describe('viewBoxAttribute', () => {
  it('serializes a box as an SVG viewBox', () => {
    expect(viewBoxAttribute({ x: 1, y: 2.5, width: 30, height: 40 })).toBe('1 2.5 30 40');
  });
});

describe('cameraTransform', () => {
  const container = { width: 400, height: 300 };

  it('is the identity when the frame is the whole map fitted to the container', () => {
    const frame = fitAspect(MAP, container.width / container.height);
    const transform = cameraTransform(frame, MAP, container);
    expect(transform.scale).toBeCloseTo(1);
    expect(transform.x).toBeCloseTo(0);
    expect(transform.y).toBeCloseTo(0);
  });

  it('maps the frame corners onto the container corners', () => {
    const frame = { x: 100, y: 200, width: 120, height: 90 };
    const { x, y, scale } = cameraTransform(frame, MAP, container);
    // Where a map point lands before the transform: the whole map is fitted ("meet"), centered.
    const fit = Math.min(container.width / MAP.width, container.height / MAP.height);
    const offsetX = (container.width - MAP.width * fit) / 2;
    const screen = (u: number, v: number) => ({
      x: x + (offsetX + u * fit) * scale,
      y: y + ((container.height - MAP.height * fit) / 2 + v * fit) * scale,
    });
    const topLeft = screen(frame.x, frame.y);
    const bottomRight = screen(frame.x + frame.width, frame.y + frame.height);
    expect(topLeft.x).toBeCloseTo(0);
    expect(topLeft.y).toBeCloseTo(0);
    expect(bottomRight.x).toBeCloseTo(container.width);
    expect(bottomRight.y).toBeCloseTo(container.height);
  });

  it('throws RangeError for an empty container or frame', () => {
    expect(() => cameraTransform(MAP, MAP, { width: 0, height: 300 })).toThrow(RangeError);
    expect(() => cameraTransform({ ...MAP, width: 0 }, MAP, container)).toThrow(RangeError);
  });
});
