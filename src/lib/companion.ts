import { getSupabase, invokeFunction } from "@/lib/supabase";

export type CompanionDevice = {
  id: string;
  label: string;
  token_prefix: string;
  expected_msisdn: string | null;
  last_seen_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

export async function fetchCompanionDevices(): Promise<CompanionDevice[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("companion_devices")
    .select("id, label, token_prefix, expected_msisdn, last_seen_at, created_at, revoked_at")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as CompanionDevice[];
}

export async function issueCompanionDevice(label?: string): Promise<{
  token: string;
  ingestUrl: string;
  device: CompanionDevice;
}> {
  const { data, error } = await invokeFunction<{
    ok?: boolean;
    token?: string;
    ingest_url?: string;
    device?: CompanionDevice;
  }>("issue-companion-device", { action: "create", label: label ?? "Business phone" });
  if (error || !data?.token || !data.device) {
    throw new Error(error ?? "Could not pair a companion phone");
  }
  return {
    token: data.token,
    ingestUrl: data.ingest_url ?? "",
    device: data.device,
  };
}

export async function revokeCompanionDevice(deviceId: string): Promise<void> {
  const { error } = await invokeFunction("issue-companion-device", {
    action: "revoke",
    device_id: deviceId,
  });
  if (error) throw new Error(error);
}
