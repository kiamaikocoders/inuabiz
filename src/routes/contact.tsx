import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin } from "lucide-react";
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
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h1 className="text-4xl font-bold sm:text-5xl">Let's talk</h1>
          <p className="text-muted-foreground mt-4 max-w-md leading-relaxed">
            One shop or several, M-Pesa setup or billing — send a note. Most messages get a reply
            the same day. Leave an email if you want a written confirmation.
          </p>

          <div className="mt-10 space-y-5">
            {[
              { icon: Mail, label: "Email", value: "hello@inuabiz.co.ke", href: "mailto:hello@inuabiz.co.ke" },
              { icon: MapPin, label: "Office", value: "Nairobi, Kenya" },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-4">
                <span className="bg-primary-soft text-primary grid size-11 place-items-center rounded-xl">
                  <c.icon className="size-5" />
                </span>
                <div>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">{c.label}</p>
                  {c.href ? (
                    <a href={c.href} className="font-medium hover:underline">
                      {c.value}
                    </a>
                  ) : (
                    <p className="font-medium">{c.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <form className="surface-card space-y-5 p-7" onSubmit={(e) => void submit(e)}>
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
              rows={5}
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
          <p className="text-muted-foreground text-center text-xs">
            We never share your number. Leave an email if you want a written confirmation.
          </p>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
