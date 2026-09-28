import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FLOAT_HIDDEN_CLASS, initWhatsAppFloat } from './whatsapp-float';

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

function renderFixture({ footer = true } = {}) {
  document.body.innerHTML = `
    <a class="whatsapp-float" href="#">WhatsApp</a>
    <div class="como-pedir__cta"><a href="#">Escribinos</a></div>
    ${footer ? '<footer class="site-footer"></footer>' : ''}
  `;
  return {
    float: document.querySelector('.whatsapp-float')!,
    cta: document.querySelector('.como-pedir__cta')!,
    footer: document.querySelector('.site-footer'),
  };
}

describe('initWhatsAppFloat', () => {
  beforeEach(() => {
    callback = null;
    observed.length = 0;
    vi.stubGlobal('IntersectionObserver', FakeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('observes the inline CTAs', () => {
    const { cta, footer } = renderFixture();
    initWhatsAppFloat();
    expect(observed).toEqual([cta, footer]);
  });

  it('hides the float while any inline CTA is visible and shows it again after', () => {
    const { float, cta, footer } = renderFixture();
    initWhatsAppFloat();

    callback!([{ target: cta, isIntersecting: true }]);
    expect(float.classList.contains(FLOAT_HIDDEN_CLASS)).toBe(true);

    // The footer enters while the CTA leaves: still one inline CTA on screen.
    callback!([
      { target: cta, isIntersecting: false },
      { target: footer!, isIntersecting: true },
    ]);
    expect(float.classList.contains(FLOAT_HIDDEN_CLASS)).toBe(true);

    callback!([{ target: footer!, isIntersecting: false }]);
    expect(float.classList.contains(FLOAT_HIDDEN_CLASS)).toBe(false);
  });

  it('keeps the float when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { float } = renderFixture();
    initWhatsAppFloat();
    expect(callback).toBeNull();
    expect(float.classList.contains(FLOAT_HIDDEN_CLASS)).toBe(false);
  });

  it('does nothing without the float button', () => {
    renderFixture();
    document.querySelector('.whatsapp-float')!.remove();
    initWhatsAppFloat();
    expect(observed).toEqual([]);
  });
});
