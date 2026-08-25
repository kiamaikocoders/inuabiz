import { HelpCircle } from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trackHelpFaqExpanded, trackHelpOpened } from "@/lib/analytics";

type Faq = { q: string; a: string };

type StepHelp = { title: string; intro: string; faqs: Faq[] };

const HELP: StepHelp[] = [
  {
    title: "Help with phone verification",
    intro: "The code is a 4-digit SMS sent to the number you typed. In demo mode any 4 digits work.",
    faqs: [
      {
        q: "The SMS code never arrived",
        a: "Wait 60 seconds, confirm the number starts 07/01 and has 10 digits, then tap Send code again. If you're on a weak network, step outside or switch from data to a stronger signal and retry.",
      },
      {
        q: "My number is rejected as invalid",
        a: "Use a Kenyan Safaricom or Airtel mobile number in the format 0712 345 678 or 254712345678. Landlines, short codes and international numbers aren't supported.",
      },
      {
        q: "Can I use a different number later?",
        a: "Yes. Your login number can be changed in Settings once your shop is live, and it does not have to match your M-Pesa payment destination.",
      },
      {
        q: "I already have an account on this number",
        a: "Use the Already have an account link at the top to sign in instead — onboarding creates a new shop.",
      },
    ],
  },
  {
    title: "Help with business details & location",
    intro: "Your name and category shape your dashboard; the GPS pin powers the store map.",
    faqs: [
      {
        q: "Detect my location did nothing",
        a: "Your browser blocked location access. Open the padlock icon in the address bar, set Location to Allow, reload, and tap Detect my location again. We drop a Nairobi CBD pin as a fallback so you're never stuck.",
      },
      {
        q: "The pin is in the wrong place",
        a: "Tap Detect my location again while standing at the shop entrance with GPS on. You can fine-tune the exact pin later in Settings without redoing onboarding.",
      },
      {
        q: "Is my location public?",
        a: "No. It's used for regional insights and support, and only visible to you and the InuaBiz team.",
      },
      {
        q: "My category isn't listed",
        a: "Pick the closest match — categories only pre-load starter products and benchmarks, and you can change it any time.",
      },
    ],
  },
  {
    title: "Help with payment destination",
    intro: "This is where customer money lands. Pick what you already use today.",
    faqs: [
      {
        q: "Personal number, Till or Paybill?",
        a: "Use your personal M-Pesa number to start selling immediately with no paperwork. Choose Till for a busy counter, or Paybill when customers pay against an account number.",
      },
      {
        q: "Where do I find my Till or Paybill number?",
        a: "It's on your M-Pesa business SMS confirmations, or dial *234# and check your business menu. Till and Paybill numbers are 5 to 7 digits.",
      },
      {
        q: "Can I change this later?",
        a: "Yes — you can switch destinations or add more channels from Settings once your shop is live.",
      },
    ],
  },
  {
    title: "Help with finishing setup",
    intro: "Review your details, then we create your shop and start the free trial.",
    faqs: [
      {
        q: "Something on the summary is wrong",
        a: "Tap Back to return to the step and edit it. Your progress is saved as you type, so nothing is lost.",
      },
      {
        q: "Setup seems stuck",
        a: "Keep the page open — setup takes a few seconds. If it stalls, reload; we resume exactly where you left off.",
      },
      {
        q: "What happens after the trial?",
        a: "You keep full access during the trial. Afterwards it's a flat monthly subscription charged by M-Pesa, and you can cancel from Billing at any time.",
      },
    ],
  },
];

export function OnboardingHelpDialog({ step }: { step: number }) {
  const [open, setOpen] = useState(false);
  const help = HELP[Math.min(Math.max(step, 0), HELP.length - 1)]!;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) trackHelpOpened(step, help.title);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <HelpCircle className="mr-1.5 size-3.5" /> Need help?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{help.title}</DialogTitle>
          <DialogDescription>{help.intro}</DialogDescription>
        </DialogHeader>
        <Accordion
          type="single"
          collapsible
          onValueChange={(value) => {
            if (value) trackHelpFaqExpanded(step, value);
          }}
        >
          {help.faqs.map((faq) => (
            <AccordionItem key={faq.q} value={faq.q}>
              <AccordionTrigger className="text-left text-sm">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="text-muted-foreground text-xs">
          Still stuck? WhatsApp support on 0700 000 000 — your progress stays saved.
        </p>
      </DialogContent>
    </Dialog>
  );
}
