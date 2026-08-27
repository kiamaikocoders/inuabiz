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

export async function uploadBusinessLogo(
  file: File,
  opts?: { alsoSetAvatar?: boolean },
): Promise<string> {
  assertLogoFile(file);
  const sb = getSupabase();
  if (!sb) throw new Error("Sign in is offline in this demo.");
  const { data: profile } = await sb.from("profiles").select("tenant_id, role, id, avatar_url").maybeSingle();
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

  // Onboarding only uploads a shop photo — also seed the owner avatar so the header renders it.
  const seedAvatar = opts?.alsoSetAvatar !== false && !profile.avatar_url;
  if (seedAvatar || opts?.alsoSetAvatar === true) {
    const userId = profile.id as string;
    const avatarPath = `${userId}/avatar.${ext}`;
    await sb.storage.from("profile-avatars").remove([
      `${userId}/avatar.jpg`,
      `${userId}/avatar.png`,
      `${userId}/avatar.webp`,
    ]);
    const { error: avErr } = await sb.storage.from("profile-avatars").upload(avatarPath, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });
    if (!avErr) {
      const { data: av } = sb.storage.from("profile-avatars").getPublicUrl(avatarPath);
      const avatarUrl = `${av.publicUrl}?v=${Date.now()}`;
      await sb.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId);
    }
  }

  return url;
}
