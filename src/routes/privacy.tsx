import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalDocument, LegalSection } from "@/components/site/LegalDocument";
import { breadcrumbJsonLd, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () =>
    pageHead({
      title: "Privacy Policy — InuaBiz",
      description:
        "How InuaBiz collects, uses, stores and protects personal data under Kenya’s Data Protection Act, including M-Pesa matching, Companion SMS and billing.",
      path: "/privacy",
      jsonLd: breadcrumbJsonLd([
        { name: "InuaBiz", path: "/" },
        { name: "Privacy", path: "/privacy" },
      ]),
    }),
  component: Privacy,
});

const toc = [
  { id: "introduction", label: "Introduction" },
  { id: "roles", label: "Our role and your role" },
  { id: "data-we-collect", label: "Personal data we collect" },
  { id: "companion", label: "Companion APK & SMS" },
  { id: "how-we-use", label: "How we use personal data" },
  { id: "legal-basis", label: "Legal basis for processing" },
  { id: "cookies", label: "Cookies & similar technologies" },
  { id: "third-parties", label: "Third-party providers" },
  { id: "international", label: "International transfers" },
  { id: "retention", label: "Data retention" },
  { id: "security", label: "Security" },
  { id: "your-rights", label: "Your rights" },
  { id: "children", label: "Children’s data" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact-us", label: "Contact us" },
  { id: "disclaimer", label: "Disclaimer" },
];

function Privacy() {
  return (
    <LegalDocument
      title="Privacy Policy"
      effective="13 June 2026"
      image="/images/legal/privacy-ngong-morning.png"
      imageAlt="Ngong Hills in morning light, looking over Nairobi from the ridge"
      toc={toc}
      description="How InuaBiz collects, uses, stores, shares and protects personal data on inuabiz.co.ke, the shop till, Companion APK and related services."
      seeAlso={{ label: "Terms of Service", to: "/terms" }}
    >
      <LegalSection id="introduction" title="1. Introduction">
        <p>
          InuaBiz (“InuaBiz”, “we”, “us”, or “our”) operates the micro-POS and shop operations
          platform available at{" "}
          <a className="font-medium text-foreground hover:underline" href="https://inuabiz.co.ke">
            https://inuabiz.co.ke
          </a>
          , including our marketing site, the vendor till, optional Companion APK, subscription
          billing, support tools and public receipt verification.
        </p>
        <p>
          This Privacy Policy explains how we collect, use, store, share and protect personal data
          when you visit our website, create a shop account, use the till, install Companion, contact
          us or otherwise interact with InuaBiz.
        </p>
        <p>
          Questions about this policy or data protection rights:{" "}
          <a className="font-medium text-foreground hover:underline" href="mailto:hello@inuabiz.co.ke">
            hello@inuabiz.co.ke
          </a>
          . We operate from Nairobi, Kenya.
        </p>
      </LegalSection>

      <LegalSection id="roles" title="2. Our role and your role as a merchant">
        <p>
          InuaBiz acts as the <span className="font-medium text-foreground">data controller</span>{" "}
          for personal data relating to account holders — shop owners, invited staff and operators
          who register for or log in to InuaBiz.
        </p>
        <p>
          When you use InuaBiz to record information about your customers, suppliers, debtors or
          other third parties (for example names, phones, credit balances, invoices or sale lines),
          you are the <span className="font-medium text-foreground">data controller</span> for that
          information. InuaBiz processes it on your instructions solely to provide the service
          described in our{" "}
          <Link to="/terms" className="font-medium text-foreground hover:underline">
            Terms of Service
          </Link>
          .
        </p>
        <p>
          You are responsible for ensuring you have a lawful basis to collect and process your
          customers’ and suppliers’ data, and for providing them with appropriate privacy notices.
        </p>
      </LegalSection>

      <LegalSection id="data-we-collect" title="3. Personal data we collect">
        <p>We may collect the following categories depending on how you use InuaBiz:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-foreground">Account and identity:</span> name, shop
            name, email, phone, shop category, GPS pin, password (stored as a secure hash) and
            profile details you provide during onboarding or settings.
          </li>
          <li>
            <span className="font-medium text-foreground">Authentication and security:</span> login
            sessions, device and browser metadata needed to keep sessions secure, and audit records
            of sensitive admin actions where applicable.
          </li>
          <li>
            <span className="font-medium text-foreground">Business and till settings:</span> payment
            destinations (personal M-Pesa, Pochi, till or paybill), invoice branding, notification
            preferences and shop configuration.
          </li>
          <li>
            <span className="font-medium text-foreground">Operational data you enter:</span>{" "}
            products, stock, sales, credit (kukopesha) ledgers, customer and supplier contacts,
            invoices, receipts and related notes.
          </li>
          <li>
            <span className="font-medium text-foreground">Payment and billing:</span> subscription
            amounts in Kenyan Shillings, M-Pesa phone numbers used for payment prompts, mobile-money
            transaction references, payment confirmation metadata and billing history. We do not
            store full payment card numbers.
          </li>
          <li>
            <span className="font-medium text-foreground">Companion / SMS matching:</span> device
            pairing tokens, last-seen timestamps and structured fields extracted from inbound M-Pesa
            received SMS on a paired handset (amount, confirmation code, sender/payee identifiers
            needed to match an open sale). See section 4.
          </li>
          <li>
            <span className="font-medium text-foreground">Support and communications:</span> contact
            form messages, support tickets, newsletter subscriptions, in-app notifications and
            optional email/SMS/WhatsApp/push delivery preferences.
          </li>
          <li>
            <span className="font-medium text-foreground">AI interactions:</span> prompts and
            responses for vendor insights, website chatbot or support tools when those features are
            enabled, plus related usage logs.
          </li>
          <li>
            <span className="font-medium text-foreground">Analytics and diagnostics:</span> page
            views, product usage events and error or performance telemetry when monitoring tools are
            enabled, to improve reliability and the product.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="companion" title="4. Companion APK and M-Pesa SMS">
        <p>
          The optional InuaBiz Companion APK runs on the business phone that receives shop M-Pesa
          SMS (personal, Pochi, till or paybill). It is not distributed through Google Play Store.
          After you pair a device token from Settings, Companion reads inbound M-Pesa received SMS
          so we can match amount and confirmation code to an open sale on the till.
        </p>
        <p>
          SMS content is processed only for payment matching and related reliability. You can revoke
          a device token in Settings at any time; after revocation the paired handset should stop
          sending new SMS-derived events to your shop.
        </p>
        <p>
          Matching may also occur via manual receipt codes you enter, or via till/paybill payment
          notifications from the mobile-money network where configured. We work to keep matching
          accurate; network delay, duplicate SMS or missed messages can still occur.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use" title="5. How we use personal data">
        <p>We use personal data to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide, operate and maintain the till, inventory, credit ledger, invoices and multi-shop features.</li>
          <li>Match customer M-Pesa payments to sales and surface confirmation on the till.</li>
          <li>Authenticate users, manage shops and staff access, and protect against unauthorised use.</li>
          <li>Process subscription trials, renewals, M-Pesa payment prompts, optional standing-order renewals and billing notices.</li>
          <li>Send operational messages such as daily till email, stock alerts, trial and payment notices, according to your preferences and plan.</li>
          <li>Respond to support requests and improve support quality (including AI-assisted tools where enabled).</li>
          <li>Analyse product usage and reliability, and improve InuaBiz.</li>
          <li>Comply with applicable law and enforce our Terms of Service.</li>
        </ul>
        <p>We do not sell your personal data.</p>
      </LegalSection>

      <LegalSection id="legal-basis" title="6. Legal basis for processing">
        <p>
          Under the Kenya Data Protection Act, 2019, we rely on the following bases depending on the
          activity:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-foreground">Contract:</span> processing necessary to
            provide the service you signed up for, including account management, till operations,
            payment matching and subscription billing.
          </li>
          <li>
            <span className="font-medium text-foreground">Consent:</span> where you opt into
            marketing communications, install Companion and grant SMS access, enable push
            notifications, or submit optional forms beyond what is required to run the core till.
          </li>
          <li>
            <span className="font-medium text-foreground">Legitimate interests:</span> security
            monitoring, fraud prevention, service improvement and internal reporting, balanced
            against your rights.
          </li>
          <li>
            <span className="font-medium text-foreground">Legal obligation:</span> retaining records
            required for tax, accounting, dispute resolution or regulatory purposes.
          </li>
        </ul>
        <p>
          You may withdraw consent for marketing or optional features at any time without affecting
          processing required to provide the core service. You also have the right to lodge a
          complaint with the Office of the Data Protection Commissioner (ODPC) in Kenya if you
          believe your data protection rights have been violated.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="7. Cookies and similar technologies">
        <p>We use cookies and browser storage to operate InuaBiz and improve your experience:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-foreground">Authentication / session storage:</span>{" "}
            keeps you signed in to the till securely.
          </li>
          <li>
            <span className="font-medium text-foreground">Preferences:</span> UI state such as
            sidebar open/closed, theme or demo category choices stored in cookies or localStorage.
          </li>
          <li>
            <span className="font-medium text-foreground">Offline till:</span> temporary outbox and
            cache data on your device so sales can sync when connectivity returns.
          </li>
          <li>
            <span className="font-medium text-foreground">Analytics / diagnostics:</span> when
            enabled, our monitoring tools may set their own cookies or collect usage and error data
            under their respective policies.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="third-parties" title="8. Third-party service providers">
        <p>
          We share personal data with trusted processors only as needed to operate InuaBiz. For
          quieter operational security we describe them by role rather than brand on this page:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-foreground">Cloud application host</span> —
            authentication, database, file storage and server-side functions.
          </li>
          <li>
            <span className="font-medium text-foreground">Subscription payment processor</span> —
            M-Pesa payment prompts and confirmations when you pay InuaBiz for a plan or extra shop.
          </li>
          <li>
            <span className="font-medium text-foreground">Mobile-money network</span> — M-Pesa
            payment matching, digital invoices into a buyer’s M-Pesa menu, optional standing-order
            renewals and related payment confirmations where configured.
          </li>
          <li>
            <span className="font-medium text-foreground">Email delivery provider</span> —
            transactional and operational email.
          </li>
          <li>
            <span className="font-medium text-foreground">AI processing providers</span> — optional
            insights, website chatbot and support features; relevant prompts or context may be
            transmitted for processing.
          </li>
          <li>
            <span className="font-medium text-foreground">Analytics and error-monitoring providers</span>{" "}
            — product usage and reliability telemetry when enabled.
          </li>
          <li>
            <span className="font-medium text-foreground">Map / location providers</span> — map views
            used in internal operations tooling where enabled.
          </li>
          <li>
            <span className="font-medium text-foreground">Website hosting / CDN</span> — delivery of
            the public site and app assets.
          </li>
        </ul>
        <p>
          We require processors to handle data only on our instructions and in line with applicable
          data protection requirements. A current list of named processors is available on request
          from{" "}
          <a className="font-medium text-foreground hover:underline" href="mailto:hello@inuabiz.co.ke">
            hello@inuabiz.co.ke
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="international" title="9. International data transfers">
        <p>
          Some providers may process data outside Kenya, including in the European Union, United
          States or other jurisdictions. Where data is transferred internationally, we take steps to
          ensure appropriate safeguards are in place, such as contractual protections with vendors.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="10. Data retention">
        <p>We retain personal data only as long as needed for the purposes in this policy:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-foreground">Account and shop data:</span> for the life
            of the subscription or trial and a reasonable period afterward to allow export, resolve
            disputes or meet legal obligations.
          </li>
          <li>
            <span className="font-medium text-foreground">Sales, stock, credit and invoices:</span>{" "}
            retained with the shop record while the account is active and as required for accounting
            or disputes.
          </li>
          <li>
            <span className="font-medium text-foreground">Payment and billing records:</span> as
            required for tax, accounting and payment dispute resolution.
          </li>
          <li>
            <span className="font-medium text-foreground">Companion device tokens:</span> until you
            revoke them or the account is closed.
          </li>
          <li>
            <span className="font-medium text-foreground">Support tickets and contact messages:</span>{" "}
            for as long as needed to resolve the request and improve operations.
          </li>
          <li>
            <span className="font-medium text-foreground">Security and diagnostic logs:</span> for a
            limited period unless a longer retention is needed for an investigation.
          </li>
        </ul>
        <p>
          When data is no longer needed, we delete or anonymise it in line with our internal
          practices. You may cancel Standard from Billing; we keep records as long as the law or a
          dispute requires.
        </p>
      </LegalSection>

      <LegalSection id="security" title="11. Security">
        <p>
          We implement technical and organisational measures designed to protect personal data,
          including encrypted transport (HTTPS), access controls that isolate shop data, hashed
          credentials, isolated backups, and device-token controls for Companion. Sensitive payment
          and integration credentials are handled on our servers — not exposed in the shop UI.
        </p>
        <p>
          No internet service is 100% secure. You are responsible for PIN and login hygiene on shop
          phones, for who you invite as staff, and for notifying us promptly of suspected
          unauthorised access.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="12. Your rights">
        <p>
          Subject to applicable law, you may request access to, correction of, or deletion of your
          personal data; object to or restrict certain processing; withdraw consent where processing
          is consent-based; and receive a copy of your data in a portable format where technically
          feasible.
        </p>
        <p>
          To make a request, email{" "}
          <a className="font-medium text-foreground hover:underline" href="mailto:hello@inuabiz.co.ke">
            hello@inuabiz.co.ke
          </a>{" "}
          with enough detail for us to verify your identity and locate your shop. We will respond
          within a reasonable timeframe as required by law.
        </p>
        <p>
          If you are a merchant processing your customers’ data through InuaBiz, requests from those
          customers should generally be directed to you as the data controller. We will assist you
          where required by law.
        </p>
      </LegalSection>

      <LegalSection id="children" title="13. Children’s data">
        <p>
          InuaBiz is a business platform and is not directed at individuals under 18. We do not
          knowingly collect personal data from children. If you believe we have collected a child’s
          data in error, contact us and we will take steps to delete it.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="14. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. The “Last updated” date at the top of
          this page will reflect the latest version. Material changes may also be communicated by
          email or in-app notice. Continued use of InuaBiz after changes take effect constitutes
          acceptance of the updated policy.
        </p>
      </LegalSection>

      <LegalSection id="contact-us" title="15. Contact us">
        <p>
          Privacy questions:{" "}
          <a className="font-medium text-foreground hover:underline" href="mailto:hello@inuabiz.co.ke">
            hello@inuabiz.co.ke
          </a>{" "}
          or use the{" "}
          <Link to="/contact" className="font-medium text-foreground hover:underline">
            Contact
          </Link>{" "}
          page. We aim to reply the same business day.
        </p>
      </LegalSection>

      <LegalSection id="disclaimer" title="16. Disclaimer">
        <p>
          This Privacy Policy is provided for transparency and operational purposes. It does not
          constitute legal advice. We recommend that you obtain independent legal review, including
          regarding ODPC registration and your own customer privacy notices, before relying on this
          document for formal compliance purposes.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
