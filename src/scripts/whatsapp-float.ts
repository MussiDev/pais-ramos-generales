/**
 * The floating WhatsApp button steps aside while an inline WhatsApp CTA is on screen (the "Cómo
 * pedir" actions and the footer): there it would only repeat that CTA, and in the footer it covered
 * the last link. `.whatsapp-float--hidden` also removes it from the tab order (CSS `visibility`).
 * Without JavaScript the button simply stays.
 *
 * The footer is detected by where `<main>` ends, not by the footer's own box: the curtain reveal
 * (stacking.ts) holds the footer one screen higher, underneath Cómo pedir, so its box "intersects"
 * the viewport long before it is uncovered.
 */
export const FLOAT_HIDDEN_CLASS = 'whatsapp-float--hidden';

export const WHATSAPP_FLOAT_SELECTORS = {
  float: '.whatsapp-float',
  inlineCta: '.como-pedir__cta',
  main: 'main',
} as const;

/** Whether the footer, which starts where `<main>` ends, is showing on screen. */
export function footerShowing(mainBottom: number, viewportHeight: number): boolean {
  return mainBottom < viewportHeight;
}

export function initWhatsAppFloat(root: ParentNode = document): void {
  const float = root.querySelector<HTMLElement>(WHATSAPP_FLOAT_SELECTORS.float);
  if (!float) return;
  const cta = root.querySelector(WHATSAPP_FLOAT_SELECTORS.inlineCta);
  const main = root.querySelector(WHATSAPP_FLOAT_SELECTORS.main);

  let ctaVisible = false;
  const update = () => {
    const footer = main ? footerShowing(main.getBoundingClientRect().bottom, window.innerHeight) : false;
    float.classList.toggle(FLOAT_HIDDEN_CLASS, ctaVisible || footer);
  };

  if (cta && typeof IntersectionObserver === 'function') {
    new IntersectionObserver(([entry]) => {
      ctaVisible = entry.isIntersecting;
      update();
    }).observe(cta);
  }

  if (main) {
    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          update();
        });
      },
      { passive: true },
    );
    update();
  }
}
