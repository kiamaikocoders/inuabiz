import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Production hosts on Vercel — never default to Cloudflare Workers.
  nitro: { preset: "vercel" },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    server: {
      host: "localhost",
      port: 8080,
      strictPort: true,
    },
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "pwa/apple-touch-icon.png", "sounds/till-chime.mp3"],
        manifest: {
          name: "InuaBiz — Micro-POS for Kenyan vendors",
          short_name: "InuaBiz",
          description:
            "Sell, track credit and reconcile M-Pesa from your phone. Point of sale built for Kenyan dukas.",
          theme_color: "#0B6E4F",
          background_color: "#F7F4EF",
          display: "standalone",
          orientation: "portrait-primary",
          scope: "/",
          start_url: "/",
          categories: ["business", "finance", "productivity"],
          icons: [
            {
              src: "/pwa/icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/pwa/icon-512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/pwa/maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,mp3,woff2,webmanifest}"],
        },
        // SW in Vite dev breaks Start SSR hydration + HMR; enable only for production builds.
        devOptions: {
          enabled: false,
        },
      }),
      // Keep last so source maps / tunnel route attach after other plugins.
      sentryTanstackStart({
        org: "inuabiz",
        project: "javascript-tanstackstart-react",
        authToken: process.env["SENTRY_AUTH_TOKEN"],
        tunnelRoute: true,
      }),
    ],
    optimizeDeps: {
      include: ["mapbox-gl", "react-map-gl/mapbox"],
    },
  },
});
