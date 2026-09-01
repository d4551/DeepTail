import { defineConfig } from 'vite'

// Tauri serves the built files from a custom scheme, so assets must be
// referenced relatively. The dev server port is fixed because
// `tauri.conf.json` names it as `devUrl`, and on a physical mobile device the
// CLI rewrites the host for us — which is why `host` is left to the CLI rather
// than pinned here.
export default defineConfig({
  base: './',
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    // Both mobile webviews and every supported desktop webview handle modern
    // output; the harness client bundles are fetched from the host at runtime
    // and are not part of this build.
    target: 'esnext',
    sourcemap: true,
  },
})
