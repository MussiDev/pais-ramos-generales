/**
 * Foreground preview server for Playwright (`webServer`) and Lighthouse CI (`startServerCommand`).
 *
 * Since Astro 7, `astro preview` detaches into a background daemon and exits whenever it detects
 * an AI-agent environment (CLAUDECODE, Cursor, VS Code with GIT_PAGER=cat, ...). Test runners
 * then see the command exit early and the detached server is left orphaned. Astro's programmatic
 * `preview()` API always serves in the foreground, so the runner owns the server's lifecycle.
 *
 * Usage: node scripts/preview-server.mjs --port <port>
 * The port is strict: if it is taken, the process fails instead of silently moving to another one.
 */
import { preview } from 'astro';

const portFlag = process.argv.indexOf('--port');
const port = portFlag === -1 ? Number.NaN : Number(process.argv[portFlag + 1]);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error('preview-server: usage: node scripts/preview-server.mjs --port <port>');
  process.exit(1);
}

const server = await preview({
  logLevel: 'warn',
  server: { port },
  vite: { preview: { strictPort: true } },
});

// Ready line matched by lighthouserc.json `startServerReadyPattern`.
console.log(`preview-server: serving dist at http://localhost:${server.port}/`);

async function shutdown() {
  await server.stop();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
