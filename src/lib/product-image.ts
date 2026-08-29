import { getSupabase } from "@/lib/supabase";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function assertProductImageFile(file: File): void {
  if (!TYPES.has(file.type)) throw new Error("Use a JPEG, PNG or WebP photo");
  if (file.size > MAX_BYTES) throw new Error("Keep the photo under 5 MB");
}

function extFor(type: string): "jpg" | "png" | "webp" {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function uploadProductImage(productId: string, file: File): Promise<string> {
  assertProductImageFile(file);
  const sb = getSupabase();
  if (!sb) throw new Error("Sign in is offline in this demo.");
  const { data: profile } = await sb.from("profiles").select("tenant_id").maybeSingle();
  if (!profile?.tenant_id) throw new Error("Finish shop setup first");

  const tenantId = profile.tenant_id as string;
  const ext = extFor(file.type);
  const path = `${tenantId}/${productId}.${ext}`;
  await sb.storage.from("product-images").remove([
    `${tenantId}/${productId}.jpg`,
    `${tenantId}/${productId}.png`,
    `${tenantId}/${productId}.webp`,
  ]);
  const { error } = await sb.storage.from("product-images").upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);

  const { data } = sb.storage.from("product-images").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  const { error: updateError } = await sb.from("products").update({ image_url: url }).eq("id", productId);
  if (updateError) throw new Error(updateError.message);
  return url;
}
