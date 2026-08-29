import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument, LegalSection } from "@/components/site/LegalDocument";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — InuaBiz" },
      {
        name: "description",
        content:
          "How InuaBiz collects, uses and shares shop and till data, including M-Pesa payment matching.",
      },
    ],
  }),
  component: Privacy,
});

const toc = [
  { id: "collect", label: "Information we collect" },
  { id: "use", label: "How we use your information" },
  { id: "sharing", label: "Information sharing" },
  { id: "security", label: "Data security" },
  { id: "rights", label: "Your rights" },
  { id: "contact-us", label: "Contact us" },
];

function Privacy() {
  return (
    <LegalDocument
      title="Privacy Policy"
      effective="27 August 2026"
      image="/images/legal/privacy-ngong-morning.png"
      imageAlt="Ngong Hills in morning light, looking over Nairobi from the ridge"
      toc={toc}
    >
      <LegalSection id="collect" title="1. Information we collect">
        <p className="font-medium text-foreground">Information you provide</p>
        <p>
          When you create an InuaBiz account we collect your name, shop name, email, phone, shop
          category, GPS pin and where M-Pesa money should land. Using the till also creates sales,
          stock, credit and invoice records tied to that shop.
        </p>
        <p>
          If you install the optional InuaBiz Companion APK on the business phone, that app reads
          inbound M-Pesa received SMS (personal, Pochi, till, or paybill) so we can match amount
          and confirmation code to an open sale. The APK is not distributed through Play Store. You
          can revoke the device token in Settings at any time.
        </p>
      </LegalSection>
      <LegalSection id="use" title="2. How we use your information">
        <p>
          We use this information to run the till: match M-Pesa payments to sales, send the daily
          till email, stock and trial notices, and to support you from Nairobi. We do not sell your
          data.
        </p>
      </LegalSection>
      <LegalSection id="sharing" title="3. Information sharing">
        <p>
          Customer payments and billing run on M-Pesa. We share what processors need to complete an
          STK, Till or Paybill match (for example PayHero). We may share with you, your invited
          staff, or when the law requires it. We do not sell personal information.
        </p>
      </LegalSection>
      <LegalSection id="security" title="4. Data security">
        <p>
          We use access controls, encrypted transport and isolated backups. No internet service is
          100% secure. You are responsible for PIN and login hygiene on the shop phone.
        </p>
      </LegalSection>
      <LegalSection id="rights" title="5. Your rights">
        <p>
          You may access, update or ask us to export or delete shop data by writing to{" "}
          <a className="font-medium text-foreground hover:underline" href="mailto:hello@inuabiz.co.ke">
            hello@inuabiz.co.ke
          </a>
          . You can cancel Standard from Billing; we keep records as long as the law or a dispute
          requires.
        </p>
      </LegalSection>
      <LegalSection id="contact-us" title="6. Contact us">
        <p>
          Questions about this policy? Email hello@inuabiz.co.ke or use the Contact page. We aim to
          reply the same day.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
