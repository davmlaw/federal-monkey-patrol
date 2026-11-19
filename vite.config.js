import { defineConfig } from 'vite';
import { cpSync, readdirSync } from 'node:fs';

// The game reads its original data files at runtime (data/, *.game), with
// paths relative to the site root, so they are copied into the build as-is
// rather than going through Vite's asset pipeline.
function copyGameData() {
  return {
    name: 'copy-game-data',
    apply: 'build',
    closeBundle() {
      cpSync('data', 'dist/data', { recursive: true });
      for (const f of readdirSync('.')) {
        if (f.endsWith('.game')) cpSync(f, `dist/${f}`);
      }
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  build: { chunkSizeWarningLimit: 1000 },
  plugins: [copyGameData()],
  server: { watch: { ignored: ['**/legacy/**'] } },
});
