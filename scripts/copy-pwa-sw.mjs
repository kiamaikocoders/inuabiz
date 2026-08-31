import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

const staticDir = ".vercel/output/static";
const swSrc = "dist/sw.js";
const swDest = join(staticDir, "sw.js");

if (!existsSync(swSrc)) {
  console.warn("[pwa] dist/sw.js not found — skip copying service worker");
  process.exit(0);
}

if (!existsSync(staticDir)) {
  console.warn("[pwa] .vercel/output/static not found — skip copying service worker");
  process.exit(0);
}

copyFileSync(swSrc, swDest);
console.log("[pwa] copied dist/sw.js → .vercel/output/static/sw.js");

for (const name of readdirSync("dist")) {
  if (!name.startsWith("workbox-") || !name.endsWith(".js")) continue;
  copyFileSync(join("dist", name), join(staticDir, name));
  console.log(`[pwa] copied dist/${name} → .vercel/output/static/${name}`);
}
