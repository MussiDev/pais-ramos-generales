import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FLOAT_HIDDEN_CLASS, footerShowing, initWhatsAppFloat } from './whatsapp-float';

type Callback = (entries: Array<{ target: Element; isIntersecting: boolean }>) => void;

let callback: Callback | null = null;
const observed: Element[] = [];

class FakeObserver {
  constructor(cb: Callback) {
    callback = cb;
  }
  observe(element: Element) {
    observed.push(element);
  }
}

/** Renders the float, the Cómo pedir CTA and a `<main>` whose bottom edge sits at `mainBottom`. */
function renderFixture(mainBottom = 5000) {
  document.body.innerHTML = `
    <a class="whatsapp-float" href="#">WhatsApp</a>
    <main><div class="como-pedir__cta"><a href="#">Escribinos</a></div></main>
    <footer class="site-footer"></footer>
  `;
  const main = document.querySelector('main')!;
  main.getBoundingClientRect = () => ({ bottom: mainBottom }) as DOMRect;
  return {
    float: document.querySelector('.whatsapp-float')!,
    cta: document.querySelector('.como-pedir__cta')!,
  };
}

const isHidden = (float: Element) => float.classList.contains(FLOAT_HIDDEN_CLASS);

describe('footerShowing', () => {
  it('is true once the end of main is above the bottom of the viewport', () => {
    expect(footerShowing(700, 800)).toBe(true);
    expect(footerShowing(800, 800)).toBe(false);
    expect(footerShowing(2400, 800)).toBe(false);
  });
});

describe('initWhatsAppFloat', () => {
  beforeEach(() => {
    callback = null;
    observed.length = 0;
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    vi.stubGlobal('innerHeight', 800);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('observes the Cómo pedir CTA', () => {
    const { cta } = renderFixture();
    initWhatsAppFloat();
    expect(observed).toEqual([cta]);
  });

  it('hides the float while the Cómo pedir CTA is visible and shows it again after', () => {
    const { float, cta } = renderFixture();
    initWhatsAppFloat();
    expect(isHidden(float)).toBe(false);

    callback!([{ target: cta, isIntersecting: true }]);
    expect(isHidden(float)).toBe(true);

    callback!([{ target: cta, isIntersecting: false }]);
    expect(isHidden(float)).toBe(false);
  });

  it('hides the float when the footer is showing, even with the CTA out of view', () => {
    const { float } = renderFixture(600);
    initWhatsAppFloat();
    expect(isHidden(float)).toBe(true);
  });

  it('still reacts to the footer when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { float } = renderFixture(600);
    initWhatsAppFloat();
    expect(callback).toBeNull();
    expect(isHidden(float)).toBe(true);
  });

  it('does nothing without the float button', () => {
    renderFixture();
    document.querySelector('.whatsapp-float')!.remove();
    initWhatsAppFloat();
    expect(observed).toEqual([]);
  });
});
