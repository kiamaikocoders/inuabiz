import { getSupabase } from "@/lib/supabase";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function assertLogoFile(file: File): void {
  if (!TYPES.has(file.type)) throw new Error("Use a JPEG, PNG or WebP photo");
  if (file.size > MAX_BYTES) throw new Error("Keep the photo under 2 MB");
}

function extFor(type: string): "jpg" | "png" | "webp" {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function uploadBusinessLogo(file: File): Promise<string> {
  assertLogoFile(file);
  const sb = getSupabase();
  if (!sb) throw new Error("Sign in is offline in this demo.");
  const { data: profile } = await sb.from("profiles").select("tenant_id, role").maybeSingle();
  if (!profile?.tenant_id) throw new Error("Finish shop setup first");
  if (profile.role !== "VENDOR_ADMIN") throw new Error("Only the shop owner can change the photo");

  const tenantId = profile.tenant_id as string;
  const ext = extFor(file.type);
  const path = `${tenantId}/logo.${ext}`;
  await sb.storage.from("business-logos").remove([
    `${tenantId}/logo.jpg`,
    `${tenantId}/logo.png`,
    `${tenantId}/logo.webp`,
  ]);
  const { error } = await sb.storage.from("business-logos").upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);

  const { data } = sb.storage.from("business-logos").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  const { error: updateError } = await sb.from("tenants").update({ logo_url: url }).eq("id", tenantId);
  if (updateError) throw new Error(updateError.message);
  return url;
}
