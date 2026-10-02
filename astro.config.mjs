// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://marios-pz.github.io",
  base: "/drums-roadmap",
  trailingSlash: "always",
  // abcjs (notation and audio) is about 515 kB minified, 150 kB gzipped, and only loads on
  // pages that show notation.
  vite: { build: { chunkSizeWarningLimit: 600 } },
});
