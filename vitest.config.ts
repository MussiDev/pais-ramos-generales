import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    // happy-dom as default environment so DOM tests (later blocks) need no extra setup.
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      include: [
        'src/config/**/*.ts',
        'src/lib/**/*.ts',
        'src/content/validate.ts',
        'src/scripts/motion/env.ts',
        'src/scripts/motion/clamp.ts',
        'src/scripts/motion/route.ts',
        'src/scripts/despensa-filter.ts',
        'src/scripts/motion/refresh-on-filter.ts',
        'src/styles/contrast.ts',
        'scripts/check-bundle-size.mjs',
        'scripts/subset-fonts.mjs',
      ],
      exclude: ['src/**/*.test.ts'],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
      },
    },
  },
});
