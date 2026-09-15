import { expect, test } from '@playwright/test';

/**
 * The web fonts are subset at build time (scripts/subset-fonts.mjs). This checks that the
 * subset faces still load and render the copy: headings in Cormorant Garamond, body in Hanken
 * Grotesk, and text with "ñ" drawn entirely by the web fonts (no fallback glyphs).
 */
const WEB_FONT_FAMILIES = ['Cormorant Garamond', 'Hanken Grotesk'];

test.describe('web fonts', () => {
  test('Cormorant Garamond and Hanken Grotesk load and render the copy, including ñ', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'no-js', 'document.fonts and CDP need script evaluation');

    await page.goto('/');
    const loaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return Array.from(document.fonts)
        .filter((face) => face.status === 'loaded')
        .map((face) => face.family.replace(/["']/g, ''));
    });
    for (const family of WEB_FONT_FAMILIES) {
      expect(loaded, `${family} is loaded`).toContain(family);
    }

    const headingFamily = await page
      .locator('h1')
      .first()
      .evaluate((heading) => getComputedStyle(heading).fontFamily);
    expect(headingFamily.replace(/["']/g, '')).toMatch(/^Cormorant Garamond\b/);

    // Mark every element whose own text contains "ñ", then ask Chromium which fonts drew it.
    const marked = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let count = 0;
      while (walker.nextNode()) {
        const parent = walker.currentNode.parentElement;
        if (!parent || !walker.currentNode.textContent?.includes('ñ')) continue;
        if (parent.closest('script, style, [hidden]')) continue;
        parent.setAttribute('data-enye-probe', '');
        count += 1;
      }
      return count;
    });
    expect(marked, 'the copy contains ñ').toBeGreaterThan(0);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', {
      nodeId: root.nodeId,
      selector: '[data-enye-probe]',
    });
    const used: Array<{ familyName: string; isCustomFont: boolean }> = [];
    for (const nodeId of nodeIds) {
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      used.push(...fonts);
    }
    await cdp.detach();

    expect(used.length, 'fonts were reported for the ñ text').toBeGreaterThan(0);
    // Chromium reports the font's internal name (e.g. "Cormorant Garamond Light Medium"): a web
    // font is a custom font whose name starts with one of the families; anything else is fallback.
    const describe = (font: (typeof used)[number]) => `${font.familyName}${font.isCustomFont ? '' : ' (system)'}`;
    const fallbacks = used
      .filter((font) => !(font.isCustomFont && WEB_FONT_FAMILIES.some((family) => font.familyName.startsWith(family))))
      .map(describe);
    expect(fallbacks, `text with ñ rendered with fallback fonts: ${used.map(describe).join(', ')}`).toEqual([]);
  });
});
