import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import path from 'node:path';

const root = path.resolve(__dirname, 'src/renderer');

export default defineConfig({
  root,
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  plugins: [
    electron({
      main: {
        entry: path.resolve(__dirname, 'src/main/index.ts'),
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'dist/main'),
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      preload: {
        input: path.resolve(__dirname, 'src/preload/index.ts'),
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'dist/preload'),
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    }),
  ],
});
