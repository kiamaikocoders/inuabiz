import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/companion")({
  head: () => ({
    meta: [
      { title: "InuaBiz Companion APK — M-Pesa SMS on the shop phone" },
      {
        name: "description",
        content:
          "Sideload the InuaBiz Companion APK on the phone that receives M-Pesa SMS. Desktop POS confirms personal and Pochi sales when that SMS arrives.",
      },
      { property: "og:title", content: "InuaBiz Companion APK" },
      {
        property: "og:description",
        content:
          "Install on the business SIM. Pair from Settings. POS goes green when the received SMS matches the open sale.",
      },
    ],
  }),
  component: CompanionPage,
});

const steps = [
  {
    n: "1",
    title: "Pair from Settings",
    body: "On app.inuabiz.co.ke, open Settings as the owner and tap Pair phone. Copy the token — it is shown once.",
  },
  {
    n: "2",
    title: "Install the APK",
    body: "Download the companion APK onto the handset that holds the shop M-Pesa SIM. Allow install from this source, then open InuaBiz Companion.",
  },
  {
    n: "3",
    title: "Paste the token",
    body: "Grant SMS permission. Paste the token. Keep the app running — a quiet notification means it is listening.",
  },
  {
    n: "4",
    title: "Sell on any screen",
    body: "Checkout on desktop or another phone. When the customer pays your number, the SMS on this SIM marks the sale paid. You can still type the code by hand.",
  },
];

function CompanionPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">Sideload APK</p>
        <h1 className="font-display mt-2 text-4xl font-bold tracking-tight">
          Companion phone for personal M-Pesa
        </h1>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
          The till can live on a laptop. The SIM that receives Safaricom “received” SMS stays in
          this small app. It is not on Play Store — Google does not allow SMS apps there — so you
          install the APK from InuaBiz.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <a href="/downloads/inuabiz-companion.apk">Download APK</a>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/login">Open shop settings</Link>
          </Button>
        </div>
        <ol className="mt-12 space-y-8">
          {steps.map((step) => (
            <li key={step.n} className="flex gap-4">
              <span className="bg-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold">
                {step.n}
              </span>
              <div>
                <h2 className="font-display text-lg font-bold">{step.title}</h2>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground mt-12 text-sm leading-relaxed">
          The APK only forwards amount, sender and the confirmation code from inbound M-Pesa
          messages. It ignores sent, airtime and Fuliza texts. Revoke the device in Settings to
          cut access. Questions:{" "}
          <a className="text-primary font-medium underline-offset-4 hover:underline" href="mailto:hello@inuabiz.co.ke">
            hello@inuabiz.co.ke
          </a>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
