/**
 * Lighthouse CI puppeteerScript (referenced by lighthouserc.json). It intentionally does nothing:
 * its presence makes lhci launch Chrome through puppeteer and hand Lighthouse the debugging port,
 * so Lighthouse never launches Chrome itself. On Windows, chrome-launcher's own launch fails at
 * the end of every run deleting its temporary profile while Chrome still holds it (EPERM).
 */
module.exports = async () => {};
