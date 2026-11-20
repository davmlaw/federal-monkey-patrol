import { defineConfig } from 'vite';
import { cpSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

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

// Shown on the menu as "Last updated", so a new deploy is easy to spot.
function commit() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return '';
  }
}

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_COMMIT__: JSON.stringify(commit()),
  },
  base: './',
  publicDir: false,
  build: { chunkSizeWarningLimit: 1000 },
  plugins: [copyGameData()],
  server: { watch: { ignored: ['**/legacy/**'] } },
});
