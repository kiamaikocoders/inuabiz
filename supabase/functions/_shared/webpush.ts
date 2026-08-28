/**
 * Convert web-push URL-safe VAPID keys to JWK for jsr:@negrel/webpush.
 */
function b64urlDecode(input: string): Uint8Array {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const raw = atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export type ExportedVapidKeys = {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
};

export function vapidUrlKeysToJwk(publicKey: string, privateKey: string): ExportedVapidKeys {
  const pub = b64urlDecode(publicKey.trim());
  if (pub.length !== 65 || pub[0] !== 4) {
    throw new Error("VAPID public key must be an uncompressed P-256 point");
  }
  const x = b64urlEncode(pub.subarray(1, 33));
  const y = b64urlEncode(pub.subarray(33, 65));
  const d = b64urlEncode(b64urlDecode(privateKey.trim()));
  const publicJwk: JsonWebKey = { kty: "EC", crv: "P-256", x, y };
  const privateJwk: JsonWebKey = { kty: "EC", crv: "P-256", x, y, d };
  return { publicKey: publicJwk, privateKey: privateJwk };
}
