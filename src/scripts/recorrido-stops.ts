/**
 * Active stop of El recorrido without the desktop pin (mobile sticky strip, reduced motion, or
 * before motion loads). An IntersectionObserver notices panels crossing the middle of the
 * viewport and the stop whose top is above that line becomes active. No GSAP.
 *
 * While the desktop pin drives the stop (`data-stop-driver="pin"` on the section) this stays idle;
 * when the pin context is released it dispatches `PIN_RELEASED_EVENT` and this re-syncs.
 */

export const RECORRIDO_STOP_SELECTORS = {
  section: '#recorrido',
  stops: '.recorrido__stops > [data-stop-index]',
  indicatorCurrent: '[data-indicator-current]',
  indicatorText: '[data-indicator-text]',
} as const;

export const PIN_DRIVER = 'pin';
export const PIN_RELEASED_EVENT = 'recorrido:pin-released';

const pad = (value: number) => String(value).padStart(2, '0');

/** Writes `data-stop`, the visual "0X" and the accessible "Parada X de N" (template from markup). */
export function writeStopIndicator(section: HTMLElement, index: number, total: number): void {
  section.dataset.stop = String(index);
  const current = section.querySelector(RECORRIDO_STOP_SELECTORS.indicatorCurrent);
  if (current) current.textContent = pad(index + 1);
  const text = section.querySelector<HTMLElement>(RECORRIDO_STOP_SELECTORS.indicatorText);
  const template = text?.dataset.indicatorTemplate;
  if (text && template) {
    text.textContent = template
      .replace('{current}', String(index + 1))
      .replace('{total}', String(total));
  }
}

export function initStopFollower(root: ParentNode = document): void {
  const section = root.querySelector<HTMLElement>(RECORRIDO_STOP_SELECTORS.section);
  if (!section || typeof IntersectionObserver !== 'function') return;
  const stops = Array.from(section.querySelectorAll<HTMLElement>(RECORRIDO_STOP_SELECTORS.stops));
  if (stops.length === 0) return;

  const sync = () => {
    if (section.dataset.stopDriver === PIN_DRIVER) return;
    const line = window.innerHeight / 2;
    let index = 0;
    stops.forEach((stop, stopIndex) => {
      if (stop.getBoundingClientRect().top <= line) index = stopIndex;
    });
    if (section.dataset.stop !== String(index)) writeStopIndicator(section, index, stops.length);
  };

  // A 1 % band in the middle of the viewport: callbacks fire only when a panel edge crosses it.
  const observer = new IntersectionObserver(sync, { rootMargin: '-50% 0px -49% 0px' });
  for (const stop of stops) observer.observe(stop);
  section.addEventListener(PIN_RELEASED_EVENT, sync);
  sync();
}
