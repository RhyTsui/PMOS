import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx,js}'],
    exclude: ['node_modules/**', 'dist/**', '.next/**'],
  },
});
