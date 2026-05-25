/**
 * Datenschutzerklärung-Placeholder. Erfüllt revDSG Art. 19
 * (Informationspflicht) und DSGVO Art. 13/14 in Grundzügen.
 * Volltext folgt nach anwaltlicher Prüfung.
 */
import Link from "next/link";

export const metadata = {
  title: "Datenschutzerklärung — Cuira Partners GmbH",
};

export default function DatenschutzPage() {
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
        Datenschutzerklärung
      </h1>
      <p style={{ color: "#5b6b7c", marginBottom: 32 }}>
        Stand: in Bearbeitung — final geprüfte Fassung folgt vor Live-Launch
        des kostenpflichtigen Produkts.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>
        1. Verantwortliche Stelle
      </h2>
      <p>
        Cuira Partners GmbH, Schweiz. Kontakt:{" "}
        <a href="mailto:kathir@cuirapartners.ch" style={{ color: "#0a2540" }}>
          kathir@cuirapartners.ch
        </a>
        .
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>
        2. Bearbeitete Daten
      </h2>
      <ul>
        <li>
          Vorab-Pensionsplanung (anonym): Geburtsjahr, Geschlecht, Einkommen,
          Vermögen, Vorsorge-Eckwerte. Bleibt lokal im Browser-Speicher.
        </li>
        <li>
          Bei Buchung Detailanalyse: Name, E-Mail-Adresse, Telefon (Kontakt
          und Terminvereinbarung).
        </li>
        <li>
          Server-Logs: IP-Adresse, Browser-Typ, Zugriffs-Zeitpunkt
          (Sicherheit, max. 30 Tage).
        </li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>
        3. Zwecke der Bearbeitung
      </h2>
      <ul>
        <li>Bereitstellung des Planungswerkzeugs</li>
        <li>Versand der Kurz-Auswertung per E-Mail (auf Wunsch)</li>
        <li>Terminvereinbarung und Durchführung der Detailanalyse</li>
        <li>Rechnungsstellung und Zahlungsabwicklung</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>
        4. Rechtsgrundlage
      </h2>
      <p>
        Einwilligung (revDSG Art. 6 / DSGVO Art. 6 Abs. 1 lit. a), Vertrag
        bei Buchung der Detailanalyse (revDSG Art. 31 / DSGVO Art. 6 Abs. 1
        lit. b).
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>
        5. Empfänger / Auftragsbearbeiter
      </h2>
      <ul>
        <li>Netlify (Hosting; EU-Region soweit möglich)</li>
        <li>Calendly (Terminvereinbarung)</li>
        <li>Stripe (Zahlungsabwicklung)</li>
        <li>E-Mail-Dienst (Versand Kurz-Auswertung)</li>
      </ul>
      <p>
        Mit jedem Auftragsbearbeiter besteht ein Datenschutz-Vertrag (AVV
        / DPA). Datenübermittlungen ins Ausland erfolgen nur mit angemessenen
        Garantien (Standardvertragsklauseln).
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>
        6. Aufbewahrungsdauer
      </h2>
      <p>
        Anonyme Vorab-Daten: nur im Browser-Speicher des Nutzers. Detail-
        analyse-Stammdaten: 10 Jahre nach Auftragsende (handels- und
        steuerrechtliche Aufbewahrungspflicht). Server-Logs: 30 Tage.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>
        7. Ihre Rechte
      </h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung,
        Einschränkung, Datenübertragbarkeit und Widerspruch. Anfragen bitte
        an{" "}
        <a href="mailto:kathir@cuirapartners.ch" style={{ color: "#0a2540" }}>
          kathir@cuirapartners.ch
        </a>
        . Beschwerden können bei der eidgenössischen Datenschutz- und
        Öffentlichkeitsbeauftragten (EDÖB) eingereicht werden.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28, marginBottom: 8 }}>
        8. Cookies / Tracking
      </h2>
      <p>
        Die App nutzt nur technisch notwendige LocalStorage-Einträge zur
        Zwischenspeicherung der Eingaben. Keine Tracking-Cookies, keine
        Werbe-Pixel.
      </p>

      <p style={{ marginTop: 48, fontSize: 13, color: "#5b6b7c" }}>
        Siehe auch: <Link href="/agb">AGB</Link>,{" "}
        <Link href="/impressum">Impressum</Link>.
      </p>
    </main>
  );
}
