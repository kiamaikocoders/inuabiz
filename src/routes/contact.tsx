import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
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

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact InuaBiz — talk to the team in Nairobi" },
      {
        name: "description",
        content:
          "Questions about InuaBiz, onboarding your duka or M-Pesa setup? Send us a message or reach the team on WhatsApp, phone or email.",
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
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h1 className="text-4xl font-bold sm:text-5xl">Let's talk</h1>
          <p className="text-muted-foreground mt-4 max-w-md leading-relaxed">
            Whether you run one duka or forty, we'll help you get set up. Most messages get a reply
            the same day.
          </p>

          <div className="mt-10 space-y-5">
            {[
              { icon: MessageCircle, label: "WhatsApp", value: "+254 700 000 000" },
              { icon: Phone, label: "Phone", value: "+254 700 000 000" },
              { icon: Mail, label: "Email", value: "hello@inuabiz.co.ke" },
              { icon: MapPin, label: "Office", value: "Nairobi, Kenya" },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-4">
                <span className="bg-primary-soft text-primary grid size-11 place-items-center rounded-xl">
                  <c.icon className="size-5" />
                </span>
                <div>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">{c.label}</p>
                  <p className="font-medium">{c.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form
          className="surface-card space-y-5 p-7"
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Message sent", {
              description: "This is a front-end demo — no message was actually delivered yet.",
            });
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" placeholder="Mary Wanjiru" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" placeholder="0712 345 678" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" type="email" placeholder="you@example.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">What is this about?</Label>
            <Select defaultValue="demo">
              <SelectTrigger id="topic">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="demo">Book a demo</SelectItem>
                <SelectItem value="onboarding">Onboarding help</SelectItem>
                <SelectItem value="mpesa">M-Pesa / payment setup</SelectItem>
                <SelectItem value="billing">Billing question</SelectItem>
                <SelectItem value="other">Something else</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={5} placeholder="Tell us about your business…" required />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Send message
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            We never share your number. Front-end demo — no backend connected yet.
          </p>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
