// The TanStack configuration already includes:
//   - TanStack devtools (dev-only, first)
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths
//   - nitro (build-only using cloudflare as default target)
//   - VITE_* env injection, @ path alias
//   - React/TanStack dedupe, error logger plugins, sandbox detection
// Do NOT add these manually or the app will break with duplicate plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
