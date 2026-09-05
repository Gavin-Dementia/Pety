import { defineConfig } from 'vitest/config';

// Deliberately separate from vite.config.ts: that config's vite-plugin-electron
// plugin spawns Electron itself on build, which has no place in a plain unit
// test run. Only renderer-side pure logic (state machine, bounds math) is
// covered here — anything importing 'electron' belongs in src/main and isn't
// exercised by these tests. See docs/roadmap.md's "Open / not yet started"
// section for what's covered vs. not.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
