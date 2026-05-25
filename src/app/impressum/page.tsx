/**
 * Impressum / Anbieterkennzeichnung. CH-Pflicht nach UWG Art. 3 Abs. 1
 * lit. s — Identität, Sitz und Kontakt müssen leicht zugänglich sein.
 */
import Link from "next/link";

export const metadata = {
  title: "Impressum — Cuira Partners GmbH",
};

export default function ImpressumPage() {
  return (
    <main
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: "48px 24px 96px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#0a2540",
        lineHeight: 1.65,
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 24 }}>
        Impressum
      </h1>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>Anbieter</h2>
      <p>
        Cuira Partners GmbH
        <br />
        Schweiz
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>Kontakt</h2>
      <p>
        E-Mail:{" "}
        <a href="mailto:kathir@cuirapartners.ch" style={{ color: "#0a2540" }}>
          kathir@cuirapartners.ch
        </a>
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>
        Verantwortlich für den Inhalt
      </h2>
      <p>Kathir, Cuira Partners GmbH</p>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>
        Hinweis zur Tätigkeit
      </h2>
      <p>
        Cuira betreibt ein Planungswerkzeug zur Pensionsplanung. Es werden
        keine konkreten Anlage- oder Versicherungsempfehlungen abgegeben
        (keine FINIG-/FIDLEG-Pflicht). Für individuelle Beratung verweisen
        wir auf lizenzierte Fachpersonen.
      </p>

      <p style={{ marginTop: 48, fontSize: 13, color: "#5b6b7c" }}>
        Siehe auch: <Link href="/agb">AGB</Link>,{" "}
        <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </p>
    </main>
  );
}
