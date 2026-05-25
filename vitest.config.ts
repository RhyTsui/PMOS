import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx,js}'],
    exclude: ['node_modules/**', 'dist/**', '.runtime/**', 'subprojects/**'],
  },
});
