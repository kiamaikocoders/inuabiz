import { invokePublicFunction, isSupabaseConfigured } from "@/lib/supabase";

export type LandingBotMessage = { role: "user" | "assistant"; content: string };

export type LandingBotReply = {
  reply: string;
  quick_replies?: string[];
  lead_id?: string;
  signup_url?: string;
  roi?: {
    inuabizMonthlyKes: number;
    terminalRentEstimateKes: number;
    monthlySavingsKes: number;
    note: string;
  };
};

export const LANDING_BOT_GREETING =
  "Habari! You're on InuaBiz already — ask about Pochi, Till auto-clear, or pricing. Ready to open your till? Tap Start free trial anytime.";

export const LANDING_BOT_STARTERS = [
  "How does Pochi auto-clear work?",
  "Till vs Paybill",
  "Calculate my savings",
  "How do I sign up?",
  "I run a chemist",
];

export async function sendLandingBotMessage(input: {
  message: string;
  history: LandingBotMessage[];
  captureLead?: boolean;
}): Promise<LandingBotReply> {
  if (!isSupabaseConfigured()) {
    return {
      reply:
        "Demo mode: InuaBiz clears M-Pesa on your Till or Pochi Companion from KES 3,000/shop/month. Connect Supabase for live answers.",
      quick_replies: LANDING_BOT_STARTERS,
      signup_url: "/signup",
    };
  }

  const { data, error } = await invokePublicFunction<LandingBotReply & { ok?: boolean; error?: string }>(
    "landing-bot-chat",
    {
      message: input.message,
      history: input.history,
      capture_lead: input.captureLead ?? false,
    },
  );
  if (error) throw new Error(error);
  if (!data?.reply) throw new Error(data?.error ?? "No reply");
  return data;
}
