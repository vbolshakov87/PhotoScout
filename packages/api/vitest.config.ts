import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only include unit tests (exclude integration tests that require network)
    include: ['src/tests/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/prompt.test.ts', // Integration tests - require API access
      '**/llm-comparison.test.ts', // Integration tests - require API keys
      '**/security/**', // Security tests - require API access, run via pnpm test:security
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/dev-server.ts', 'src/**/*.d.ts'],
    },
  },
});
