import { describe, expect, it } from 'vitest';
import { footerReachedHeader, isDarkAt } from './sticky-header';

/** A top-level section at the given viewport rect, dark-toned or not. */
function section(top: number, bottom: number, dark = false): Element {
  const element = document.createElement('section');
  if (dark) element.dataset.headerTone = 'dark';
  element.getBoundingClientRect = () => ({ top, bottom }) as DOMRect;
  return element;
}

describe('isDarkAt', () => {
  it('is true over a dark section', () => {
    expect(isDarkAt([section(-900, 20), section(20, 4000, true)], 52)).toBe(true);
  });

  it('follows the section on top: a later section stacked over a dark one wins', () => {
    // The pantry rises over the still-pinned recorrido: both cross the line.
    expect(isDarkAt([section(-3000, 900, true), section(10, 2000)], 52)).toBe(false);
  });

  it('is false over light sections or none', () => {
    expect(isDarkAt([section(-100, 800)], 52)).toBe(false);
    expect(isDarkAt([], 52)).toBe(false);
  });

  it('counts the top edge as inside and the bottom edge as outside', () => {
    expect(isDarkAt([section(52, 400, true)], 52)).toBe(true);
    expect(isDarkAt([section(-400, 52, true)], 52)).toBe(false);
  });
});

describe('footerReachedHeader', () => {
  it('is true once the end of main reaches the header band', () => {
    expect(footerReachedHeader(72, 72)).toBe(true);
    expect(footerReachedHeader(-300, 72)).toBe(true);
    expect(footerReachedHeader(73, 72)).toBe(false);
    expect(footerReachedHeader(2400, 104)).toBe(false);
  });
});
