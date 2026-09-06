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
    // output. The client's *plugin* bundles are fetched from the host at
    // runtime; the client itself is a dependency of this build and is split
    // into its own chunk, loaded when a session is opened rather than when the
    // shell paints (see `boot.ts`, and `tests/boot-weight.spec.ts`).
    target: 'esnext',
    sourcemap: true,
  },
})
