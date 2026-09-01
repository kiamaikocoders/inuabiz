import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command, mode }) => {
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "VITE_"))) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define: envDefine,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "mapbox-gl",
        "react-map-gl/mapbox",
      ],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: "localhost",
      port: 8080,
      strictPort: true,
    },
    plugins: [
      tailwindcss(),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
        server: { entry: "server" },
      }),
      ...(command === "build" ? [nitro({ preset: "vercel" })] : []),
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "favicon.ico", "firebase-messaging-sw.js", "pwa/apple-touch-icon.png", "sounds/till-chime.mp3"],
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
        devOptions: {
          enabled: false,
        },
      }),
      sentryTanstackStart({
        org: "inuabiz",
        project: "javascript-tanstackstart-react",
        authToken: process.env["SENTRY_AUTH_TOKEN"],
        tunnelRoute: true,
      }),
    ],
  };
});
