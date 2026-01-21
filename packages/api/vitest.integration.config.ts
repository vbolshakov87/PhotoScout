import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests that require network/API access
    include: [
      'src/tests/prompt.test.ts',
      'src/tests/llm-comparison.test.ts',
      'src/tests/security/**/*.test.ts',
    ],
    testTimeout: 60000,
  },
});
