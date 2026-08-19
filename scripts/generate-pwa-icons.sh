#!/usr/bin/env bash
# Regenerate PWA icons from public/favicon.svg (requires ImageMagick).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/pwa"
mkdir -p "$OUT"
convert -background none "$ROOT/public/favicon.svg" -resize 192x192 "$OUT/icon-192.png"
convert -background none "$ROOT/public/favicon.svg" -resize 512x512 "$OUT/icon-512.png"
convert -background "#0B6E4F" "$ROOT/public/favicon.svg" -gravity center -extent 512x512 -resize 512x512 "$OUT/maskable-512.png"
convert -background none "$ROOT/public/favicon.svg" -resize 180x180 "$OUT/apple-touch-icon.png"
echo "Wrote icons to $OUT"
