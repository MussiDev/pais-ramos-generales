// @ts-check
import { defineConfig } from 'astro/config';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createSiteConfig, validateSiteConfig } from './src/config/site.ts';

/**
 * Reads `.env` and `.env.<mode>` (later files win); variables already present in the
 * shell take precedence, so `PUBLIC_WHATSAPP_NUMBER= pnpm build` counts as missing.
 * @param {string} mode
 * @returns {Record<string, string | undefined>}
 */
function loadEnv(mode) {
  const fromFiles = ['.env', `.env.${mode}`]
    .filter((file) => existsSync(file))
    .reduce((acc, file) => ({ ...acc, ...parseEnv(readFileSync(file, 'utf8')) }), {});
  return { ...fromFiles, ...process.env };
}

/**
 * Validates the site configuration before Astro does any work, so `astro dev` and
 * `astro build` stop on a missing or invalid setting (AC-07).
 * @returns {import('astro').AstroIntegration}
 */
function siteConfigValidation() {
  return {
    name: 'site-config-validation',
    hooks: {
      'astro:config:setup': ({ command }) => {
        const mode = command === 'dev' ? 'development' : 'production';
        const env = loadEnv(mode);
        validateSiteConfig(createSiteConfig(env));
      },
    },
  };
}

export default defineConfig({
  output: 'static',
  site: 'https://pais-ramos-generales.example.com',
  integrations: [siteConfigValidation()],
});
