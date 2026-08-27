import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { invokePublicFunction, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact InuaBiz — talk to the team in Nairobi" },
      {
        name: "description",
        content:
          "Questions about InuaBiz, onboarding, extra shops or M-Pesa setup? Write to the Nairobi team — we reply the same day.",
      },
      { property: "og:title", content: "Contact InuaBiz" },
      {
        property: "og:description",
        content: "Reach the InuaBiz team in Nairobi for support, demos or onboarding help.",
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("demo");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      toast.error("Contact form is not connected yet");
      return;
    }
    setBusy(true);
    const { data, error } = await invokePublicFunction<{ ok?: boolean }>("submit-contact", {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      topic,
      message: message.trim(),
    });
    setBusy(false);
    if (error || !data?.ok) {
      toast.error("Could not send", { description: error ?? "Email hello@inuabiz.co.ke instead." });
      return;
    }
    toast.success("Message sent", {
      description: email.includes("@")
        ? "We emailed you a confirmation. The team will follow up."
        : "The InuaBiz team will follow up shortly.",
    });
    setName("");
    setPhone("");
    setEmail("");
    setTopic("demo");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden">
          <img
            src="/images/legal/contact-westlands-afternoon.png"
            alt="Nairobi street in late afternoon, looking toward office blocks"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-[#085540]/58" aria-hidden />
          <div className="relative z-10 grid items-center gap-10 px-8 py-16 lg:grid-cols-[1fr_480px] lg:py-20 xl:px-20">
            <div className="max-w-xl">
              <p className="text-gold text-xs font-semibold tracking-[0.22em]">CONTACT</p>
              <h1 className="font-display mt-3 text-4xl font-bold leading-tight text-white sm:text-5xl">
                Get in touch with us
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-white/85">
                One shop or several, M-Pesa setup or billing — send a note. Most messages get a
                reply the same day.
              </p>
            </div>

            <form
              className="space-y-5 rounded-2xl bg-card p-7 shadow-lift"
              onSubmit={(e) => void submit(e)}
            >
              <h2 className="font-display text-xl font-bold">Send a message</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    placeholder="Mary Wanjiru"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    placeholder="0712 345 678"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic">What is this about?</Label>
                <Select value={topic} onValueChange={setTopic}>
                  <SelectTrigger id="topic">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="demo">Book a demo</SelectItem>
                    <SelectItem value="onboarding">Onboarding / setup fee</SelectItem>
                    <SelectItem value="mpesa">M-Pesa / payment setup</SelectItem>
                    <SelectItem value="compliance">Compliance / ETR (KES 4,500)</SelectItem>
                    <SelectItem value="enterprise">Enterprise license or custom build</SelectItem>
                    <SelectItem value="billing">Billing question</SelectItem>
                    <SelectItem value="other">Something else</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={4}
                  placeholder="Tell us about your business…"
                  required
                  minLength={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy ? "Sending…" : "Send message"}
              </Button>
            </form>
          </div>
        </section>

        <section className="bg-card px-8 py-14 xl:px-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="font-display text-3xl font-bold">Our offices</h2>
              <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-relaxed">
                If you are nearby, you are always welcome to visit us.
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em]">
                NAIROBI, KENYA
              </p>
              <p className="mt-2 text-xl font-semibold">Nairobi, Kenya</p>
              <p className="text-muted-foreground mt-3 text-sm">
                <a href="mailto:hello@inuabiz.co.ke" className="hover:text-foreground">
                  hello@inuabiz.co.ke
                </a>
                {" · "}
                Most messages get a reply the same day.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
