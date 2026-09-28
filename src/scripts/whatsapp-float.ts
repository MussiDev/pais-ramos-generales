/**
 * The floating WhatsApp button steps aside while an inline WhatsApp CTA is on screen (the "Cómo
 * pedir" actions and the footer): there it would only repeat that CTA, and in the footer it covered
 * the last link. `.whatsapp-float--hidden` also removes it from the tab order (CSS `visibility`).
 * Without JavaScript or IntersectionObserver the button simply stays.
 */
export const FLOAT_HIDDEN_CLASS = 'whatsapp-float--hidden';

export const WHATSAPP_FLOAT_SELECTORS = {
  float: '.whatsapp-float',
  inlineCtas: '.como-pedir__cta, .site-footer',
} as const;

export function initWhatsAppFloat(root: ParentNode = document): void {
  const float = root.querySelector<HTMLElement>(WHATSAPP_FLOAT_SELECTORS.float);
  const ctas = Array.from(root.querySelectorAll(WHATSAPP_FLOAT_SELECTORS.inlineCtas));
  if (!float || ctas.length === 0 || typeof IntersectionObserver !== 'function') return;

  const visible = new Set<Element>();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    float.classList.toggle(FLOAT_HIDDEN_CLASS, visible.size > 0);
  });
  for (const cta of ctas) observer.observe(cta);
}
