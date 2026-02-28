import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@dispatch/shared/types': resolve(__dirname, '../shared/dist/types'),
      '@dispatch/shared/constants': resolve(__dirname, '../shared/dist/constants'),
    },
  },
  test: {
    root: '.',
  },
});
