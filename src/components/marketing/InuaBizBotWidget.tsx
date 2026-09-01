import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bot, Loader2, Mic, MicOff, Minus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LANDING_BOT_GREETING,
  LANDING_BOT_STARTERS,
  sendLandingBotMessage,
  type LandingBotMessage,
} from "@/lib/landing-bot";

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.slice(0, 400));
  u.lang = "en-KE";
  u.rate = 1;
  window.speechSynthesis.speak(u);
}

export function InuaBizBotWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<LandingBotMessage[]>([
    { role: "assistant", content: LANDING_BOT_GREETING },
  ]);
  const [quickReplies, setQuickReplies] = useState<string[]>(LANDING_BOT_STARTERS);
  const [signupSearch, setSignupSearch] = useState<{
    shop?: string;
    phone?: string;
    type?: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string, captureLead = false) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    const nextHistory: LandingBotMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextHistory);
    setBusy(true);
    try {
      const res = await sendLandingBotMessage({
        message: trimmed,
        history: messages,
        captureLead,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      if (res.quick_replies?.length) setQuickReplies(res.quick_replies);
      if (res.signup_url) {
        try {
          const u = new URL(res.signup_url, window.location.origin);
          setSignupSearch({
            shop: u.searchParams.get("shop") ?? undefined,
            phone: u.searchParams.get("phone") ?? undefined,
            type: u.searchParams.get("type") ?? undefined,
          });
        } catch {
          setSignupSearch({});
        }
      } else if (/sign\s*up|register|get started|start free trial|how do i sign/i.test(trimmed)) {
        setSignupSearch({});
      }
      if (listening) speak(res.reply);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reach assistant");
    } finally {
      setBusy(false);
    }
  };

  const toggleVoice = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      toast.message("Voice not supported in this browser", {
        description: "Type your question or try Chrome on Android.",
      });
      return;
    }
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-KE";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const transcript = ev.results[0]?.[0]?.transcript ?? "";
      if (transcript) void send(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    toast.message("Listening…", { description: "Speak in English or Swahili." });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-50 flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xl transition hover:scale-105 hover:bg-emerald-700 sm:right-6 sm:bottom-6"
        aria-label="Open InuaBiz AI assistant"
      >
        <Bot className="size-7" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed right-4 bottom-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all sm:right-6 sm:bottom-6",
        minimized ? "h-14 w-[min(360px,calc(100vw-2rem))]" : "h-[min(480px,calc(100vh-6rem))] w-[min(360px,calc(100vw-2rem))]",
      )}
    >
      <div className="flex items-center justify-between gap-2 bg-emerald-700 px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/15">
            <Bot className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">InuaBiz Assistant</p>
            {!minimized && (
              <p className="truncate text-[11px] text-emerald-100">
                M-Pesa, Till, Pochi & pricing
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/10 hover:text-white"
            onClick={() => setMinimized((m) => !m)}
            aria-label={minimized ? "Expand chat" : "Minimize chat"}
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4 text-sm">
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.content.slice(0, 24)}`}
                className={cn(
                  "max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-50",
                )}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="size-3.5 animate-spin" /> Thinking…
              </div>
            )}
            {quickReplies.length > 0 && !busy && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {quickReplies.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
                    onClick={() =>
                      void send(q, q.toLowerCase().includes("start free trial"))
                    }
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {signupSearch && (
            <div className="border-t border-border bg-emerald-50/80 px-3 py-2 dark:bg-emerald-950/20">
              <Button size="sm" className="h-8 w-full" asChild>
                <Link to="/signup" search={signupSearch}>Start free trial</Link>
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-border bg-card p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send(input);
              }}
              placeholder="Type your question…"
              className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={busy}
            />
            <button
              type="button"
              onClick={toggleVoice}
              className={cn(
                "rounded-lg p-2 transition",
                listening
                  ? "bg-red-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
              aria-label={listening ? "Stop listening" : "Voice input"}
            >
              {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>
            <button
              type="button"
              disabled={busy || !input.trim()}
              onClick={() => void send(input)}
              className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="size-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
