import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    license: { fileName: 'licenses/dependencies.json' },
  },
});
