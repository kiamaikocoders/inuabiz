import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument, LegalSection } from "@/components/site/LegalDocument";
import { breadcrumbJsonLd, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () =>
    pageHead({
      title: "Terms of Service — InuaBiz",
      description:
        "Terms for using the InuaBiz till, including licences, accounts and M-Pesa payments for Kenyan shops.",
      path: "/terms",
      jsonLd: breadcrumbJsonLd([
        { name: "InuaBiz", path: "/" },
        { name: "Terms", path: "/terms" },
      ]),
    }),
  component: Terms,
});

const toc = [
  { id: "acceptance", label: "Acceptance of terms" },
  { id: "license", label: "Use license" },
  { id: "service", label: "Service description" },
  { id: "accounts", label: "User accounts" },
  { id: "prohibited", label: "Prohibited uses" },
  { id: "disclaimer", label: "Disclaimer & limitations" },
  { id: "contact-info", label: "Contact information" },
];

function Terms() {
  return (
    <LegalDocument
      title="Terms of Service"
      effective="27 August 2026"
      image="/images/legal/terms-kisumu-dusk.png"
      imageAlt="Kisumu lakefront at dusk, looking across the water"
      toc={toc}
    >
      <LegalSection id="acceptance" title="1. Acceptance of terms">
        <p>
          By creating an InuaBiz shop or using the till you agree to these Terms. If you do not
          agree, do not use the service.
        </p>
      </LegalSection>
      <LegalSection id="license" title="2. Use license">
        <p>
          We grant you a limited, non-exclusive licence to use InuaBiz for your own shops under the
          plan you pay for (Standard, Compliance or an enterprise licence). This is not a sale of
          the software. You may not reverse-engineer, resell or white-label the product unless we
          have signed an enterprise licence with you.
        </p>
      </LegalSection>
      <LegalSection id="service" title="3. Service description">
        <p>
          InuaBiz is a mobile-first till: cash, credit and M-Pesa STK, stock alerts, kukopesha
          ledger, invoices and a daily till email. Customer payments and billing run on M-Pesa. We
          work to keep matching accurate; we cannot guarantee every network delay or PIN timeout on
          the customer handset.
        </p>
      </LegalSection>
      <LegalSection id="accounts" title="4. User accounts">
        <p>
          You are responsible for the shop phone, PINs, invited staff and for activity under your
          login. Extra shops are billed per shop at the public rate unless we quote otherwise.
        </p>
      </LegalSection>
      <LegalSection id="prohibited" title="5. Prohibited uses">
        <p>
          You may not use InuaBiz for unlawful sales, to harass customers, to attempt access to
          another shop’s data, or to interfere with M-Pesa or our processors.
        </p>
      </LegalSection>
      <LegalSection id="disclaimer" title="6. Disclaimer & limitations">
        <p>
          The service is provided as is. To the extent Kenyan law allows, InuaBiz is not liable for
          lost sales, stock decisions or losses that come solely from a delayed or failed STK.
          Enterprise licences follow the contract and SLA you sign.
        </p>
      </LegalSection>
      <LegalSection id="contact-info" title="7. Contact information">
        <p>Questions about these Terms? Email hello@inuabiz.co.ke or use the Contact page.</p>
      </LegalSection>
    </LegalDocument>
  );
}
