/**
 * Mobile/tablet nav menu (< 1024px, see `.nav-toggle` in sections.css): the links are hidden by
 * default at that width, this reveals them as a dropdown. Desktop is unaffected - the toggle
 * button itself is hidden there.
 */
export const OPEN_CLASS = 'site-nav--open';

export interface NavToggleOptions {
  root?: ParentNode;
  toggle?: HTMLElement | null;
  menu?: HTMLElement | null;
}

export function initNavToggle({
  root = document,
  toggle = root.querySelector<HTMLElement>('[data-nav-toggle]'),
  menu = root.querySelector<HTMLElement>('[data-nav-menu]'),
}: NavToggleOptions = {}): void {
  if (!toggle || !menu) return;

  const setOpen = (open: boolean) => {
    menu.classList.toggle(OPEN_CLASS, open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () => {
    setOpen(!menu.classList.contains(OPEN_CLASS));
  });

  menu.addEventListener('click', (event) => {
    if (event.target instanceof HTMLElement && event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Node)) return;
    if (menu.contains(event.target) || toggle.contains(event.target)) return;
    setOpen(false);
  });
}
