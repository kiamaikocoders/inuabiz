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
    title: "Help with your M-Pesa number",
    intro: "This Kenyan mobile number receives subscription STK prompts and customer payment alerts for this shop.",
    faqs: [
      {
        q: "Why do you need my number?",
        a: "It is the M-Pesa handset for this shop — subscription PIN prompts and customer STK land here. You already signed in with email.",
      },
      {
        q: "My number is rejected as invalid",
        a: "Use a Kenyan Safaricom or Airtel mobile number in the format 0712 345 678 or 254712345678. Landlines, short codes and international numbers aren't supported.",
      },
      {
        q: "Can I use a different number later?",
        a: "Yes. Change it in Settings once your shop is live. It does not have to match your M-Pesa payment destination.",
      },
      {
        q: "I never finished this page last time",
        a: "Sign in with email and password. The app sends you back here until shop setup is complete — you cannot open POS until then.",
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
        a: "Pick Other, or the closest match. Category only changes this shop's till and fields — you can switch it any time in Settings.",
      },
    ],
  },
  {
    title: "Help with payment destination",
    intro: "Add every channel customers already pay into. Mark one as primary for checkout prompts.",
    faqs: [
      {
        q: "Can I add Till and personal M-Pesa together?",
        a: "Yes. Tick every channel you use today and enter each account number. Sales to any of them can reconcile — primary only controls the default checkout prompt.",
      },
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
    title: "Help choosing a plan",
    intro: "Standard is the default till. Compliance adds ETR / KRA-ready records at a higher monthly rate.",
    faqs: [
      {
        q: "Which plan should I pick?",
        a: "Most shops start on Standard. Choose Compliance only if you already keep a KRA PIN and need ETR-style records on paid and credit sales.",
      },
      {
        q: "Can I switch later?",
        a: "Yes from Billing once you are live. Picking Compliance here means your trial and later STK use the Compliance rate from day one.",
      },
      {
        q: "Do I pay during the trial?",
        a: "No. The trial is full access. After it ends, M-Pesa STK uses the plan you selected here.",
      },
      {
        q: "Something on the summary is wrong",
        a: "Tap Back to return to the step and edit it. Your progress is saved as you type, so nothing is lost.",
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
          Still stuck? Email hello@inuabiz.co.ke — your progress stays saved.
        </p>
      </DialogContent>
    </Dialog>
  );
}
