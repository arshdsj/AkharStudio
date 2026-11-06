import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    include: ['test/spikes/**/*.spike.ts', 'test/spikes/**/*.test.ts'],
    environment: 'node',
  },
});
