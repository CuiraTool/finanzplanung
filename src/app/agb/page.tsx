/**
 * AGB-Placeholder. Volltext folgt nach anwaltlicher Prüfung
 * (Cuira-Compliance-Sprint vor Live B2C).
 */
import Link from "next/link";

export const metadata = {
  title: "AGB — Cuira Partners GmbH",
};

export default function AgbPage() {
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
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
        Allgemeine Geschäftsbedingungen
      </h1>
      <p style={{ color: "#5b6b7c", marginBottom: 32 }}>
        Stand: in Bearbeitung — der finale Wortlaut wird vor produktivem
        Verkauf der Detailanalyse veröffentlicht.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>1. Anbieter</h2>
      <p>
        Cuira Partners GmbH, Schweiz. Kontakt:{" "}
        <a href="mailto:kathir@cuirapartners.ch" style={{ color: "#0a2540" }}>
          kathir@cuirapartners.ch
        </a>
        .
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>
        2. Leistungsgegenstand
      </h2>
      <p>
        Cuira stellt ein Planungswerkzeug zur Verfügung, das auf Basis der
        eingegebenen Angaben eine indikative Pensionsplanung berechnet. Das
        Werkzeug ersetzt keine individuelle Anlage- oder
        Versicherungsberatung und liefert keine konkreten Produktempfehlungen.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>
        3. Kostenpflichtige Detailanalyse (CHF 299.–)
      </h2>
      <p>
        Optional kann eine vertiefte Detailanalyse mit 60-minütigem Beratungs-
        gespräch gebucht werden. Honorar-basiert, keine Provisionen,
        Zahlung via Stripe.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>
        4. Widerrufsrecht
      </h2>
      <p>
        Bei der kostenpflichtigen Detailanalyse besteht ein Widerrufsrecht
        nach Schweizer Konsumentenschutz-Praxis (Belehrung im
        Bestätigungs-E-Mail).
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>
        5. Haftung
      </h2>
      <p>
        Die Engine-Berechnungen sind indikativ. Cuira übernimmt keine
        Gewähr für die Genauigkeit der Ergebnisse als Grundlage konkreter
        Anlage- oder Vorsorgeentscheide. Für solche Entscheide ist eine
        Beratung durch lizenzierte Fachpersonen empfohlen.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>
        6. Anwendbares Recht
      </h2>
      <p>
        Es gilt Schweizer Recht. Gerichtsstand ist der Sitz der Cuira
        Partners GmbH.
      </p>

      <p style={{ marginTop: 48, fontSize: 13, color: "#5b6b7c" }}>
        Siehe auch: <Link href="/datenschutz">Datenschutzerklärung</Link>,{" "}
        <Link href="/impressum">Impressum</Link>.
      </p>
    </main>
  );
}
