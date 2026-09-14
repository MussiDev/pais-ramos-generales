import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // happy-dom as default environment so DOM tests (later blocks) need no extra setup.
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      include: ['src/config/**/*.ts', 'src/lib/**/*.ts', 'src/content/validate.ts'],
      exclude: ['src/**/*.test.ts'],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
      },
    },
  },
});
