import { getSupabase } from "@/lib/supabase";
import { assertLogoFile } from "@/lib/business-logo";

function extFor(type: string): "jpg" | "png" | "webp" {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function uploadProfileAvatar(file: File): Promise<string> {
  assertLogoFile(file);
  const sb = getSupabase();
  if (!sb) throw new Error("Sign in is offline in this demo.");
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Sign in to upload a photo");

  const ext = extFor(file.type);
  const path = `${user.id}/avatar.${ext}`;
  await sb.storage.from("profile-avatars").remove([
    `${user.id}/avatar.jpg`,
    `${user.id}/avatar.png`,
    `${user.id}/avatar.webp`,
  ]);
  const { error } = await sb.storage.from("profile-avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);

  const { data } = sb.storage.from("profile-avatars").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  const { error: updateError } = await sb.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (updateError) throw new Error(updateError.message);
  return url;
}
