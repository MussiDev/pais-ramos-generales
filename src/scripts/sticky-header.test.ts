import { afterEach, describe, expect, it } from 'vitest';
import { isDarkUnder } from './sticky-header';

function render() {
  document.body.innerHTML = `
    <header class="site-header"><a class="link" href="#">Link</a></header>
    <section id="recorrido" data-header-tone="dark"><p class="panel">Salta</p></section>
    <section id="despensa"><p class="card">Card</p></section>
  `;
  const $ = (selector: string) => document.querySelector(selector)!;
  return { header: $('.site-header'), link: $('.link'), panel: $('.panel'), card: $('.card') };
}

describe('isDarkUnder', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is true when the first element under the header is inside a dark section', () => {
    const { header, link, panel } = render();
    expect(isDarkUnder([link, header, panel, document.body], header)).toBe(true);
  });

  it('follows what is on top: a light section stacked over a dark one wins', () => {
    const { header, card, panel } = render();
    expect(isDarkUnder([header, card, panel], header)).toBe(false);
  });

  it('is false for an empty hit list or one with only the header', () => {
    const { header, link } = render();
    expect(isDarkUnder([], header)).toBe(false);
    expect(isDarkUnder([link, header], header)).toBe(false);
  });
});
