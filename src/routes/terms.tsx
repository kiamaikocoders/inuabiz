import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalDocument, LegalSection } from "@/components/site/LegalDocument";
import { breadcrumbJsonLd, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () =>
    pageHead({
      title: "Terms of Service — InuaBiz",
      description:
        "Terms for using InuaBiz: accounts, Standard and Compliance plans, M-Pesa matching, Companion APK, billing, liability and Kenya governing law.",
      path: "/terms",
      jsonLd: breadcrumbJsonLd([
        { name: "InuaBiz", path: "/" },
        { name: "Terms", path: "/terms" },
      ]),
    }),
  component: Terms,
});

const toc = [
  { id: "agreement", label: "Agreement to these terms" },
  { id: "service", label: "The service" },
  { id: "accounts", label: "Accounts and registration" },
  { id: "billing", label: "Subscriptions, trials & billing" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "merchant-data", label: "Your business data" },
  { id: "payments", label: "Companion & payment matching" },
  { id: "ai", label: "AI features" },
  { id: "ip", label: "Intellectual property" },
  { id: "public-links", label: "Public links & sharing" },
  { id: "availability", label: "Availability & support" },
  { id: "termination", label: "Termination" },
  { id: "liability", label: "Limitation of liability" },
  { id: "indemnification", label: "Indemnification" },
  { id: "governing-law", label: "Governing law" },
  { id: "changes-contact", label: "Changes and contact" },
];

function Terms() {
  return (
    <LegalDocument
      title="Terms of Service"
      effective="13 June 2026"
      image="/images/legal/terms-kisumu-dusk.png"
      imageAlt="Kisumu lakefront at dusk, looking across the water"
      toc={toc}
      description="Terms governing your use of the InuaBiz till and related services operated at inuabiz.co.ke."
      seeAlso={{ label: "Privacy Policy", to: "/privacy" }}
    >
      <LegalSection id="agreement" title="1. Agreement to these terms">
        <p>
          These Terms of Service (“Terms”) govern your access to and use of InuaBiz (“InuaBiz”,
          “we”, “us”, or “our”). By creating a shop, starting a trial, installing Companion or using
          any part of the service, you agree to these Terms and our{" "}
          <Link to="/privacy" className="font-medium text-foreground hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          You must be at least 18 years old and authorised to bind the business you register. If you
          do not agree, do not use InuaBiz.
        </p>
      </LegalSection>

      <LegalSection id="service" title="2. The service">
        <p>
          InuaBiz is a mobile-first micro-POS and shop operations platform for Kenyan vendors.
          Features may include cash, credit (kukopesha) and M-Pesa sales matched to your shop’s
          personal number, Pochi, till or paybill; stock alerts; invoices (including M-Pesa Bill
          Manager where enabled); multi-shop billing; daily till email; optional Companion SMS
          matching; Compliance (ETR-format) receipts; and AI-assisted insights or support tools.
        </p>
        <p>
          We may update, add or remove features from time to time. The service is provided on an “as
          available” basis, subject to maintenance and circumstances outside our reasonable control.
          Enterprise licences follow the signed contract and SLA where applicable.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="3. Accounts and registration">
        <p>
          You must provide accurate registration information and keep shop details up to date. You
          are responsible for the shop phone, PINs, invited staff and all activity under your login.
        </p>
        <p>
          Notify us immediately at{" "}
          <a className="font-medium text-foreground hover:underline" href="mailto:hello@inuabiz.co.ke">
            hello@inuabiz.co.ke
          </a>{" "}
          if you suspect unauthorised access. Extra shops are billed per shop at the public rate
          unless we quote otherwise.
        </p>
      </LegalSection>

      <LegalSection id="billing" title="4. Subscriptions, trials and billing">
        <p>
          InuaBiz offers plans priced in Kenyan Shillings (KES), including Standard (per shop /
          month after trial), Compliance (ETR) and optional assisted setup. Current amounts, limits
          and trial length are described on our{" "}
          <Link to="/pricing" className="font-medium text-foreground hover:underline">
            pricing
          </Link>{" "}
          page and may change with notice.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Free trials, where offered, provide limited-time access. At the end of a trial, continued
            use requires a paid subscription unless we state otherwise.
          </li>
          <li>
            Paid subscriptions renew for the selected billing cycle unless cancelled before renewal.
            Self-serve shop billing is collected via M-Pesa payment prompts through our designated
            payment processor. Where you opt into an M-Pesa standing-order renewal, you authorise
            recurring debit per that programme’s rules.
          </li>
          <li>
            Unless required by law or agreed in writing, fees are non-refundable for partial billing
            periods. Failed payments may result in suspension after reasonable notice.
          </li>
          <li>
            Compliance (ETR) and enterprise features may be quoted rather than self-serve; they are
            not a substitute for live KRA eTIMS/OSCU unless a separate agreement says so.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="acceptable-use" title="5. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Use InuaBiz for unlawful sales or to harass customers or staff.</li>
          <li>Attempt access to another shop’s data or circumvent plan limits or security controls.</li>
          <li>Reverse-engineer, resell or white-label the product except under a signed enterprise licence.</li>
          <li>Interfere with M-Pesa, our payment processors or related payment rails.</li>
          <li>Misuse AI features to generate harmful, deceptive or unlawful content.</li>
          <li>Share login credentials in a way that compromises security or violates plan user limits.</li>
        </ul>
      </LegalSection>

      <LegalSection id="merchant-data" title="6. Your business data">
        <p>
          You retain ownership of the business data you enter into InuaBiz, including products,
          customers, suppliers, inventory, credit ledgers and transaction records. You grant InuaBiz
          a limited licence to host, process, back up and display that data solely to provide the
          service.
        </p>
        <p>
          You represent that you have the right to provide any personal data you upload and that your
          use of InuaBiz complies with applicable data protection laws. Our processing of that data
          is described in our{" "}
          <Link to="/privacy" className="font-medium text-foreground hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="payments" title="7. Companion and payment matching">
        <p>
          Customer payments land on your configured M-Pesa destination. InuaBiz matches payments via
          Companion SMS (optional APK on the handset that receives shop SMS), manual receipt codes
          and/or till/paybill payment notifications where configured. Subscription billing uses
          M-Pesa payment prompts to InuaBiz.
        </p>
        <p>
          We work to keep matching accurate. We do not guarantee every network delay, duplicate SMS,
          missed message or processor outage. You remain responsible for reconciling exceptions and
          for the correctness of destinations you configure.
        </p>
        <p>
          If you install Companion, you grant permission for that app to read inbound M-Pesa received
          SMS for matching, and you may revoke the device token at any time in Settings.
        </p>
      </LegalSection>

      <LegalSection id="ai" title="8. AI features">
        <p>
          Optional AI features (for example restock or cash-flow insights, landing chatbot or
          operator support tools) provide informational assistance. Outputs may be incomplete or
          inaccurate and do not constitute professional, financial, tax or legal advice. You must
          independently verify AI-generated figures and recommendations before making business
          decisions.
        </p>
      </LegalSection>

      <LegalSection id="ip" title="9. Intellectual property">
        <p>
          InuaBiz owns the platform, software, branding, documentation and related intellectual
          property except for your business data. We grant you a limited, non-exclusive,
          non-transferable licence to use InuaBiz during an active subscription, trial or enterprise
          licence. This is not a sale of the software.
        </p>
        <p>
          You may not copy, modify, distribute or create derivative works of the platform except as
          expressly permitted.
        </p>
      </LegalSection>

      <LegalSection id="public-links" title="10. Public links and sharing">
        <p>
          Certain features allow sharing or public verification of receipts, invoices or similar
          content via links. You control what you share and are responsible for ensuring shared
          content is appropriate and that you have permission to disclose any personal data included
          in it.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="11. Availability and support">
        <p>
          We strive to keep InuaBiz available and reliable but do not guarantee uninterrupted access
          unless otherwise agreed in a written enterprise agreement. Support is available through{" "}
          <a className="font-medium text-foreground hover:underline" href="mailto:hello@inuabiz.co.ke">
            hello@inuabiz.co.ke
          </a>
          , in-app tickets where enabled, and the{" "}
          <Link to="/contact" className="font-medium text-foreground hover:underline">
            Contact
          </Link>{" "}
          page. We aim to reply the same business day from Nairobi.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="12. Termination">
        <p>
          You may cancel Standard from Billing or by contacting support. We may suspend or terminate
          access for breach of these Terms, non-payment, or conduct that risks harm to the service or
          other users.
        </p>
        <p>
          Upon termination, your right to use InuaBiz ends. We may retain and delete data in
          accordance with our Privacy Policy and legal obligations. Export any records you need
          before closure where export features are available.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="13. Limitation of liability">
        <p>
          The service is provided as is. To the fullest extent permitted by Kenyan law, InuaBiz and
          its officers, employees and affiliates will not be liable for indirect, incidental,
          special, consequential or punitive damages, or for lost sales, stock decisions, revenue,
          data or business opportunities arising from your use of the service — including losses that
          come solely from a delayed, duplicate or failed payment match.
        </p>
        <p>
          Our total aggregate liability for any claim relating to the service is limited to the fees
          you paid to InuaBiz in the twelve (12) months preceding the event giving rise to the claim.
          Enterprise licences follow the liability terms in the signed contract.
        </p>
        <p>
          You are responsible for maintaining appropriate backups of critical business records.
        </p>
      </LegalSection>

      <LegalSection id="indemnification" title="14. Indemnification">
        <p>
          You agree to indemnify and hold harmless InuaBiz from claims, damages and expenses arising
          from your misuse of the service, your business data, violation of these Terms, or
          infringement of third-party rights.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" title="15. Governing law and disputes">
        <p>
          These Terms are governed by the laws of Kenya. Any dispute arising from or relating to
          these Terms or the service shall be subject to the exclusive jurisdiction of the courts of
          Nairobi, Kenya, unless the parties agree otherwise in writing.
        </p>
      </LegalSection>

      <LegalSection id="changes-contact" title="16. Changes and contact">
        <p>
          We may modify these Terms from time to time. Updated Terms will be posted on this page with
          a revised “Last updated” date. Material changes may be communicated by email or in-app
          notice. Continued use after changes take effect constitutes acceptance.
        </p>
        <p>
          These Terms, together with our Privacy Policy, constitute the entire agreement between you
          and InuaBiz regarding the service (except where a signed enterprise agreement says
          otherwise).
        </p>
        <p>
          Questions:{" "}
          <a className="font-medium text-foreground hover:underline" href="mailto:hello@inuabiz.co.ke">
            hello@inuabiz.co.ke
          </a>{" "}
          · Nairobi, Kenya ·{" "}
          <Link to="/contact" className="font-medium text-foreground hover:underline">
            Contact
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
