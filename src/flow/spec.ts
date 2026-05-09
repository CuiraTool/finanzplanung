/**
 * Frage-Spec für den geführten Frage-Flow.
 *
 * Mapping zur Word-Doc "Pensionsplanung_Typeform_Optimierung":
 * - Block A wird in V2-Route separat als Berater-Onboarding behandelt
 *   (hier nicht enthalten, weil nicht ins PlanState mappt).
 * - Block S (Abschluss/DSG) wird in V2-Route separat behandelt.
 * - Alle anderen Blöcke B–R sind hier abgebildet.
 *
 * Die Spec deckt den essenziellen Frage-Katalog ab. Detail-Blöcke
 * (z.B. mehrere Liegenschaften, mehrere FZ-Konten) werden im klassischen
 * Wizard verfeinert — der Flow erfasst pro Block die Aggregat-/Schlüsselzahlen.
 */

import { KANTONE } from "@/lib/store";
import type { QuestionSpec } from "./types";

const PRIORITAET_OPTIONEN = [
  { value: "sicheres_einkommen", label: "Sicheres Einkommen" },
  { value: "steuern_optimieren", label: "Steuern optimieren" },
  { value: "vermoegen_erhalten", label: "Vermögen erhalten" },
  { value: "vererben", label: "Vererben" },
  { value: "frueher_pension", label: "Früher in Pension" },
  { value: "lebenstraum", label: "Lebenstraum finanzieren" },
  { value: "liegenschaft_regeln", label: "Liegenschaft regeln" },
  { value: "firma_regeln", label: "Firma regeln" },
  { value: "andere", label: "Andere" },
];

const ANLAGEFORM_OPTIONEN = [
  { value: "etf", label: "ETFs" },
  { value: "fonds", label: "Fonds" },
  { value: "aktien", label: "Einzelaktien" },
  { value: "obligationen", label: "Obligationen" },
  { value: "immobilienfonds", label: "Immobilienfonds" },
  { value: "krypto", label: "Krypto" },
  { value: "strukturiert", label: "Strukturierte Produkte" },
  { value: "keine", label: "Keine" },
];

export const QUESTIONS: QuestionSpec[] = [
  // ─── Block A6 — Fallart (steuert alle Paar-Konditionen) ───
  {
    id: "A6",
    block: "A",
    blockTitle: "Auftakt",
    frage: "Geht es um eine Einzelperson oder ein Paar?",
    hilfe: "Diese Frage steuert alle weiteren Fragen für eine zweite Person.",
    type: "single",
    pflicht: true,
    optionen: [
      { value: "einzel", label: "Einzelperson" },
      { value: "paar", label: "Ehepaar / eingetragene Partnerschaft / Konkubinat" },
    ],
    get: (s) => s.fallart,
    set: (s, v) => {
      s.fallart = v as typeof s.fallart;
    },
  },

  // ─── Block B — Zivilstand & Familie ───
  {
    id: "B1",
    block: "B",
    blockTitle: "Familie",
    frage: "Geburtsdatum Person 1",
    type: "date",
    pflicht: true,
    get: (s) => s.person1.geburtsdatum,
    set: (s, v) => {
      s.person1.geburtsdatum = (v as string) ?? "";
    },
  },
  {
    id: "B0_p1_name",
    block: "B",
    blockTitle: "Familie",
    frage: "Vor- und Nachname Person 1",
    type: "text",
    pflicht: true,
    placeholder: "Max Muster",
    get: (s) => `${s.person1.vorname} ${s.person1.nachname}`.trim(),
    set: (s, v) => {
      const parts = ((v as string) ?? "").trim().split(/\s+/);
      s.person1.vorname = parts[0] ?? "";
      s.person1.nachname = parts.slice(1).join(" ");
    },
  },
  {
    id: "B0_p2_name",
    block: "B",
    blockTitle: "Familie",
    frage: "Vor- und Nachname Person 2",
    type: "text",
    pflicht: true,
    bedingung: (s) => s.fallart === "paar",
    placeholder: "Erika Muster",
    get: (s) => `${s.person2.vorname} ${s.person2.nachname}`.trim(),
    set: (s, v) => {
      const parts = ((v as string) ?? "").trim().split(/\s+/);
      s.person2.vorname = parts[0] ?? "";
      s.person2.nachname = parts.slice(1).join(" ");
    },
  },
  {
    id: "B2",
    block: "B",
    blockTitle: "Familie",
    frage: "Geburtsdatum Person 2",
    type: "date",
    pflicht: true,
    bedingung: (s) => s.fallart === "paar",
    get: (s) => s.person2.geburtsdatum,
    set: (s, v) => {
      s.person2.geburtsdatum = (v as string) ?? "";
    },
  },
  {
    id: "B3",
    block: "B",
    blockTitle: "Familie",
    frage: "Aktueller Zivilstand",
    type: "single",
    pflicht: true,
    optionen: [
      { value: "ledig", label: "Ledig" },
      { value: "verheiratet", label: "Verheiratet" },
      { value: "konkubinat", label: "Eingetragene Partnerschaft / Konkubinat" },
      { value: "verwitwet", label: "Verwitwet" },
      { value: "geschieden", label: "Geschieden" },
    ],
    get: (s) => s.zivilstand,
    set: (s, v) => {
      s.zivilstand = v as typeof s.zivilstand;
    },
  },
  {
    id: "B4",
    block: "B",
    blockTitle: "Familie",
    frage: "Seit welchem Jahr?",
    type: "year",
    bedingung: (s) =>
      s.zivilstand === "verheiratet" || s.zivilstand === "konkubinat",
    min: 1950,
    max: new Date().getFullYear(),
    get: (s) => s.erweitert.zivilstandSeitJahr,
    set: (s, v) => {
      s.erweitert.zivilstandSeitJahr = v as number | null;
    },
  },
  {
    id: "B5",
    block: "B",
    blockTitle: "Familie",
    frage: "Haben Sie Kinder?",
    type: "yesno",
    get: (s) => s.kinder.length > 0,
    set: () => {
      // No-op: tatsächliche Erfassung passiert im Wizard, hier nur Indikation
    },
  },
  {
    id: "B7",
    block: "B",
    blockTitle: "Familie",
    frage: "Bestehen laufende Unterhaltspflichten?",
    hilfe: "z.B. an frühere Partnerin, Kinder aus früherer Beziehung",
    type: "yesno",
    get: (s) => s.erweitert.unterhaltspflichten,
    set: (s, v) => {
      s.erweitert.unterhaltspflichten = v as boolean;
    },
  },
  {
    id: "B8",
    block: "B",
    blockTitle: "Familie",
    frage: "Bitte kurz beschreiben",
    hilfe: "An wen, in welcher Höhe, bis wann?",
    type: "longtext",
    bedingung: (s) => s.erweitert.unterhaltspflichten,
    get: (s) => s.erweitert.unterhaltspflichtenDetails,
    set: (s, v) => {
      s.erweitert.unterhaltspflichtenDetails = (v as string) ?? "";
    },
  },

  // ─── Block C — Pensionierung Person 1 ───
  {
    id: "C2_p1",
    block: "C",
    blockTitle: "Pensionierung Person 1",
    frage: "Mit welchem Alter möchte Person 1 in Pension?",
    type: "number",
    pflicht: true,
    min: 58,
    max: 70,
    suffix: "Jahre",
    get: (s) => s.ziele.bezugsalterP1,
    set: (s, v) => {
      s.ziele.bezugsalterP1 = (v as number) ?? 65;
    },
  },

  // ─── Block C' — Pensionierung Person 2 ───
  {
    id: "C2_p2",
    block: "C'",
    blockTitle: "Pensionierung Person 2",
    frage: "Mit welchem Alter möchte Person 2 in Pension?",
    type: "number",
    pflicht: true,
    bedingung: (s) => s.fallart === "paar",
    min: 58,
    max: 70,
    suffix: "Jahre",
    get: (s) => s.ziele.bezugsalterP2,
    set: (s, v) => {
      s.ziele.bezugsalterP2 = (v as number) ?? 65;
    },
  },

  // ─── Block D — Zielverbrauch & Wünsche ───
  {
    id: "D1",
    block: "D",
    blockTitle: "Zielverbrauch in der Pension",
    frage: "Monatlicher Wunschverbrauch netto in der Pension (Haushalt)",
    hilfe: "Was möchten Sie nach Steuern monatlich zur Verfügung haben?",
    type: "number",
    pflicht: true,
    suffix: "CHF / Monat",
    get: (s) => s.budget.wunschverbrauchPension,
    set: (s, v) => {
      s.budget.wunschverbrauchPension = v as number | null;
    },
  },
  {
    id: "D7",
    block: "D",
    blockTitle: "Zielverbrauch in der Pension",
    frage: "Wie stellen Sie sich Ihr Leben in der Pension vor?",
    hilfe: "Optional — hilft uns das Bild zu schärfen.",
    type: "longtext",
    get: (s) => s.erweitert.pensionsvision,
    set: (s, v) => {
      s.erweitert.pensionsvision = (v as string) ?? "";
    },
  },

  // ─── Block H — Einkommen, Liquidität, Vermögen ───
  {
    id: "H1",
    block: "H",
    blockTitle: "Einkommen & Vermögen",
    frage: "Aktuelles Brutto-Haushaltseinkommen pro Jahr",
    hilfe: "Summe Lohn beider Personen + sonstige Einkommen",
    type: "number",
    pflicht: true,
    suffix: "CHF / Jahr",
    get: (s) => s.budget.einkommenHeute,
    set: (s, v) => {
      s.budget.einkommenHeute = v as number | null;
    },
  },
  {
    id: "O4",
    block: "O",
    blockTitle: "Steuern & Wohnort",
    frage: "Aktuelle jährliche Steuerbelastung (laut letzter Veranlagung)",
    hilfe: "Optional, aber hilft fürs Anker-Modell",
    type: "number",
    suffix: "CHF / Jahr",
    get: (s) => s.budget.steuernHeute,
    set: (s, v) => {
      s.budget.steuernHeute = v as number | null;
    },
  },
  {
    id: "H6",
    block: "H",
    blockTitle: "Einkommen & Vermögen",
    frage: "Andere Vermögenswerte ausserhalb von Konten/Depots/PK?",
    hilfe: "Krypto, Gold, Sammlungen, Beteiligungen … kurz beschreiben",
    type: "longtext",
    get: (s) => s.erweitert.andereVermoegenswerte,
    set: (s, v) => {
      s.erweitert.andereVermoegenswerte = (v as string) ?? "";
    },
  },
  {
    id: "H7",
    block: "H",
    blockTitle: "Einkommen & Vermögen",
    frage: "Verbindlichkeiten ausserhalb der Hypothek?",
    hilfe: "z.B. Konsumkredit, Leasing, offene Steuern, Privatdarlehen",
    type: "yesno",
    get: (s) => s.erweitert.verbindlichkeitenAnderes,
    set: (s, v) => {
      s.erweitert.verbindlichkeitenAnderes = v as boolean;
    },
  },
  {
    id: "H8",
    block: "H",
    blockTitle: "Einkommen & Vermögen",
    frage: "Bitte kurz auflisten",
    type: "longtext",
    bedingung: (s) => s.erweitert.verbindlichkeitenAnderes,
    get: (s) => s.erweitert.verbindlichkeitenDetails,
    set: (s, v) => {
      s.erweitert.verbindlichkeitenDetails = (v as string) ?? "";
    },
  },

  // ─── Block O — Wohnort & Steuern ───
  {
    id: "O1",
    block: "O",
    blockTitle: "Steuern & Wohnort",
    frage: "Aktueller Wohnkanton",
    type: "kanton",
    pflicht: true,
    optionen: KANTONE.map((k) => ({ value: k.code, label: k.name })),
    get: (s) => s.adresse.kanton,
    set: (s, v) => {
      s.adresse.kanton = (v as string) ?? "";
    },
  },
  {
    id: "O2",
    block: "O",
    blockTitle: "Steuern & Wohnort",
    frage: "Umzug/Kantonswechsel vor oder in der Pension geplant?",
    type: "single",
    optionen: [
      { value: "ja", label: "Ja, geplant" },
      { value: "moeglich", label: "Möglich" },
      { value: "nein", label: "Nein" },
    ],
    get: (s) => s.wohnortPlan.umzugStatus,
    set: (s, v) => {
      s.wohnortPlan.umzugStatus = v as typeof s.wohnortPlan.umzugStatus;
    },
  },
  {
    id: "O3",
    block: "O",
    blockTitle: "Steuern & Wohnort",
    frage: "Ziel (Kanton, Gemeinde oder Land)",
    type: "text",
    bedingung: (s) =>
      s.wohnortPlan.umzugStatus === "ja" ||
      s.wohnortPlan.umzugStatus === "moeglich",
    get: (s) => s.wohnortPlan.umzugZiel,
    set: (s, v) => {
      s.wohnortPlan.umzugZiel = (v as string) ?? "";
    },
  },

  // ─── Block E — AHV ───
  {
    id: "E1_p1",
    block: "E",
    blockTitle: "1. Säule (AHV)",
    frage: "Aktueller IK-Auszug für Person 1 vorhanden?",
    type: "yesno",
    get: (s) => s.ahv.hatIkAuszugP1,
    set: (s, v) => {
      s.ahv.hatIkAuszugP1 = v as boolean;
    },
  },

  // ─── Block F — Pensionskasse ───
  {
    id: "F1",
    block: "F",
    blockTitle: "2. Säule (Pensionskasse)",
    frage: "Hat Person 1 einen aktiven PK-Anschluss?",
    type: "yesno",
    get: (s) => s.bvg.p1.aktiverAnschluss,
    set: (s, v) => {
      s.bvg.p1.aktiverAnschluss = v as boolean;
    },
  },
  {
    id: "F3",
    block: "F",
    blockTitle: "2. Säule (Pensionskasse)",
    frage: "Aktuelles PK-Altersguthaben Person 1 (laut Ausweis)",
    type: "number",
    bedingung: (s) => s.bvg.p1.aktiverAnschluss,
    suffix: "CHF",
    get: (s) => s.bvg.p1.altersguthabenHeute,
    set: (s, v) => {
      s.bvg.p1.altersguthabenHeute = v as number | null;
    },
  },
  {
    id: "F2",
    block: "F",
    blockTitle: "2. Säule (Pensionskasse)",
    frage: "Hat Person 2 einen aktiven PK-Anschluss?",
    type: "yesno",
    bedingung: (s) => s.fallart === "paar",
    get: (s) => s.bvg.p2.aktiverAnschluss,
    set: (s, v) => {
      s.bvg.p2.aktiverAnschluss = v as boolean;
    },
  },
  {
    id: "F4",
    block: "F",
    blockTitle: "2. Säule (Pensionskasse)",
    frage: "Aktuelles PK-Altersguthaben Person 2",
    type: "number",
    bedingung: (s) => s.fallart === "paar" && s.bvg.p2.aktiverAnschluss,
    suffix: "CHF",
    get: (s) => s.bvg.p2.altersguthabenHeute,
    set: (s, v) => {
      s.bvg.p2.altersguthabenHeute = v as number | null;
    },
  },
  {
    id: "F14",
    block: "F",
    blockTitle: "2. Säule (Pensionskasse)",
    frage: "Bezugspräferenz Person 1: Rente, Kapital oder Mischlösung?",
    type: "single",
    bedingung: (s) => s.bvg.p1.aktiverAnschluss,
    optionen: [
      { value: "rente", label: "Rente" },
      { value: "kapital", label: "Kapital" },
      { value: "mischung", label: "Mischlösung" },
    ],
    get: (s) => s.bvg.p1.bezugspraeferenz,
    set: (s, v) => {
      s.bvg.p1.bezugspraeferenz = v as typeof s.bvg.p1.bezugspraeferenz;
    },
  },

  // ─── Block I — Eigenheim (selbstbewohnt) ───
  {
    id: "I0",
    block: "I",
    blockTitle: "Eigenheim",
    frage: "Sind Sie Eigenheim­besitzer?",
    type: "yesno",
    get: (s) => s.immobilien.items.some((i) => i.typ === "selbstbewohnt"),
    set: () => {
      // No-op: Detail-Erfassung im klassischen Wizard
    },
  },

  // ─── Block L — Firma ───
  {
    id: "L0",
    block: "L",
    blockTitle: "Firma / Selbständigkeit",
    frage: "Eigene Firma oder Beteiligung > 10%?",
    type: "yesno",
    get: (s) => s.firma.vorhanden,
    set: (s, v) => {
      s.firma.vorhanden = v as boolean;
    },
  },
  {
    id: "L1",
    block: "L",
    blockTitle: "Firma / Selbständigkeit",
    frage: "Geschätzter Wert der Anteile",
    type: "number",
    bedingung: (s) => s.firma.vorhanden,
    suffix: "CHF",
    get: (s) => s.firma.moeglicherVerkaufserloes,
    set: (s, v) => {
      s.firma.moeglicherVerkaufserloes = v as number | null;
    },
  },
  {
    id: "L4",
    block: "L",
    blockTitle: "Firma / Selbständigkeit",
    frage: "Beziehen Sie Lohn und/oder Dividenden aus der Firma?",
    type: "single",
    bedingung: (s) => s.firma.vorhanden,
    optionen: [
      { value: "nur_lohn", label: "Nur Lohn" },
      { value: "lohn_dividenden", label: "Lohn und Dividenden" },
      { value: "nur_dividenden", label: "Nur Dividenden" },
      { value: "nein", label: "Aktuell nichts" },
    ],
    get: (s) => s.erweitert.firmaBezug,
    set: (s, v) => {
      s.erweitert.firmaBezug = v as typeof s.erweitert.firmaBezug;
    },
  },

  // ─── Block M — Anlagen ───
  {
    id: "M1",
    block: "M",
    blockTitle: "Anlagen",
    frage: "Anlageerfahrung",
    type: "single",
    optionen: [
      { value: "keine", label: "Keine" },
      { value: "wenig", label: "Wenig" },
      { value: "moderat", label: "Moderat" },
      { value: "ausgepraegt", label: "Ausgeprägt" },
    ],
    get: (s) => s.anlagen.erfahrung,
    set: (s, v) => {
      s.anlagen.erfahrung = v as typeof s.anlagen.erfahrung;
    },
  },
  {
    id: "M2",
    block: "M",
    blockTitle: "Anlagen",
    frage: "Risikobereitschaft",
    type: "single",
    optionen: [
      { value: "konservativ", label: "Konservativ" },
      { value: "ausgewogen", label: "Ausgewogen" },
      { value: "wachstum", label: "Wachstum" },
      { value: "aggressiv", label: "Aggressiv" },
    ],
    get: (s) => s.anlagen.risikobereitschaft,
    set: (s, v) => {
      s.anlagen.risikobereitschaft = v as typeof s.anlagen.risikobereitschaft;
    },
  },
  {
    id: "M3",
    block: "M",
    blockTitle: "Anlagen",
    frage: "Anlagehorizont",
    type: "single",
    optionen: [
      { value: "lt3j", label: "Unter 3 Jahre" },
      { value: "3_7j", label: "3–7 Jahre" },
      { value: "7_15j", label: "7–15 Jahre" },
      { value: "gt15j", label: "Über 15 Jahre" },
    ],
    get: (s) => s.anlagen.horizont,
    set: (s, v) => {
      s.anlagen.horizont = v as typeof s.anlagen.horizont;
    },
  },
  {
    id: "M4",
    block: "M",
    blockTitle: "Anlagen",
    frage: "Aktuell genutzte Anlageformen",
    hilfe: "Mehrfachauswahl möglich",
    type: "multi",
    optionen: ANLAGEFORM_OPTIONEN,
    get: (s) => s.anlagen.formen,
    set: (s, v) => {
      s.anlagen.formen = (v as typeof s.anlagen.formen) ?? [];
    },
  },
  {
    id: "M5",
    block: "M",
    blockTitle: "Anlagen",
    frage: "Vermögenswerte oder Depots im Ausland?",
    type: "yesno",
    get: (s) => s.anlagen.vermoegenAusland,
    set: (s, v) => {
      s.anlagen.vermoegenAusland = v as boolean;
    },
  },

  // ─── Block N — Erbschaft & Güterrecht ───
  {
    id: "N1",
    block: "N",
    blockTitle: "Erbschaft & Güterrecht",
    frage:
      "Erwarten Sie in den nächsten 10–15 Jahren eine Erbschaft oder grössere Schenkung?",
    type: "single",
    optionen: [
      { value: "ja_absehbar", label: "Ja, absehbar" },
      { value: "moeglich", label: "Möglich" },
      { value: "nein", label: "Nein" },
      { value: "keine_angabe", label: "Möchte nicht angeben" },
    ],
    get: (s) => s.erbschaft.erwartet,
    set: (s, v) => {
      s.erbschaft.erwartet = v as typeof s.erbschaft.erwartet;
    },
  },
  {
    id: "N2",
    block: "N",
    blockTitle: "Erbschaft & Güterrecht",
    frage: "Grobe Grössenordnung",
    type: "single",
    bedingung: (s) =>
      s.erbschaft.erwartet === "ja_absehbar" ||
      s.erbschaft.erwartet === "moeglich",
    optionen: [
      { value: "lt200k", label: "Unter CHF 200'000" },
      { value: "200k_1m", label: "CHF 200'000 – 1 Mio" },
      { value: "1m_5m", label: "CHF 1 – 5 Mio" },
      { value: "gt5m", label: "Über CHF 5 Mio" },
    ],
    get: (s) => s.erbschaft.groessenordnung,
    set: (s, v) => {
      s.erbschaft.groessenordnung = v as typeof s.erbschaft.groessenordnung;
    },
  },
  {
    id: "N3",
    block: "N",
    blockTitle: "Erbschaft & Güterrecht",
    frage: "Bereits Schenkungen oder Erbvorbezüge an Kinder getätigt?",
    type: "yesno",
    get: (s) => s.erbschaft.schenkungenGetaetigt,
    set: (s, v) => {
      s.erbschaft.schenkungenGetaetigt = v as boolean;
    },
  },
  {
    id: "N4",
    block: "N",
    blockTitle: "Erbschaft & Güterrecht",
    frage: "Höhe und Jahr",
    type: "longtext",
    bedingung: (s) => s.erbschaft.schenkungenGetaetigt,
    get: (s) => s.erbschaft.schenkungenDetails,
    set: (s, v) => {
      s.erbschaft.schenkungenDetails = (v as string) ?? "";
    },
  },
  {
    id: "N5",
    block: "N",
    blockTitle: "Erbschaft & Güterrecht",
    frage: "Güterstand",
    type: "single",
    bedingung: (s) =>
      s.zivilstand === "verheiratet" || s.zivilstand === "konkubinat",
    optionen: [
      { value: "errungenschaft", label: "Errungenschaftsbeteiligung" },
      { value: "guetertrennung", label: "Gütertrennung" },
      { value: "guetergemeinschaft", label: "Gütergemeinschaft" },
      { value: "weiss_nicht", label: "Weiss nicht" },
    ],
    get: (s) => s.erbschaft.gueterstand,
    set: (s, v) => {
      s.erbschaft.gueterstand = v as typeof s.erbschaft.gueterstand;
    },
  },

  // ─── Block P — Versicherungen ───
  {
    id: "P1",
    block: "P",
    blockTitle: "Versicherungen",
    frage: "Krankenkassen-Zusatzversicherung (VVG) vorhanden?",
    type: "yesno",
    get: (s) => s.versicherungen.vvgVorhanden,
    set: (s, v) => {
      s.versicherungen.vvgVorhanden = v as boolean;
    },
  },
  {
    id: "P2",
    block: "P",
    blockTitle: "Versicherungen",
    frage: "Risiko- oder Kapital-Lebensversicherung (ausserhalb 3a/3b)?",
    type: "yesno",
    get: (s) => s.versicherungen.lebensversicherungVorhanden,
    set: (s, v) => {
      s.versicherungen.lebensversicherungVorhanden = v as boolean;
    },
  },
  {
    id: "P3",
    block: "P",
    blockTitle: "Versicherungen",
    frage: "Versicherungssumme und Laufzeitende",
    type: "longtext",
    bedingung: (s) => s.versicherungen.lebensversicherungVorhanden,
    get: (s) => s.versicherungen.lebensversicherungDetails,
    set: (s, v) => {
      s.versicherungen.lebensversicherungDetails = (v as string) ?? "";
    },
  },
  {
    id: "P4",
    block: "P",
    blockTitle: "Versicherungen",
    frage: "Gesundheitliche Themen, die finanziell relevant werden könnten?",
    hilfe: "Optional",
    type: "longtext",
    get: (s) => s.versicherungen.gesundheitsthemen,
    set: (s, v) => {
      s.versicherungen.gesundheitsthemen = (v as string) ?? "";
    },
  },

  // ─── Block Q — Vorsorge-/Nachlassdokumente ───
  {
    id: "Q1",
    block: "Q",
    blockTitle: "Nachlass-Dokumente",
    frage: "Vorsorgeauftrag vorhanden?",
    type: "yesno",
    get: (s) => s.nachlass.vorsorgeauftrag,
    set: (s, v) => {
      s.nachlass.vorsorgeauftrag = v as boolean;
    },
  },
  {
    id: "Q2",
    block: "Q",
    blockTitle: "Nachlass-Dokumente",
    frage: "Patientenverfügung vorhanden?",
    type: "yesno",
    get: (s) => s.nachlass.patientenverfuegung,
    set: (s, v) => {
      s.nachlass.patientenverfuegung = v as boolean;
    },
  },
  {
    id: "Q3",
    block: "Q",
    blockTitle: "Nachlass-Dokumente",
    frage: "Testament vorhanden?",
    type: "yesno",
    get: (s) => s.nachlass.testament,
    set: (s, v) => {
      s.nachlass.testament = v as boolean;
    },
  },
  {
    id: "Q4",
    block: "Q",
    blockTitle: "Nachlass-Dokumente",
    frage: "Ehe-/Konkubinatsvertrag vorhanden?",
    type: "yesno",
    bedingung: (s) =>
      s.zivilstand === "verheiratet" || s.zivilstand === "konkubinat",
    get: (s) => s.nachlass.ehevertrag,
    set: (s, v) => {
      s.nachlass.ehevertrag = v as boolean;
    },
  },

  // ─── Block R — Prioritäten ───
  {
    id: "R1",
    block: "R",
    blockTitle: "Prioritäten",
    frage: "Was ist Ihnen bei der Pensionsplanung am wichtigsten?",
    hilfe: "Maximal 3 Auswahlen",
    type: "multi",
    pflicht: true,
    maxAuswahl: 3,
    optionen: PRIORITAET_OPTIONEN,
    get: (s) => s.prioritaeten.ausgewaehlt,
    set: (s, v) => {
      s.prioritaeten.ausgewaehlt =
        (v as typeof s.prioritaeten.ausgewaehlt) ?? [];
    },
  },
  {
    id: "R2",
    block: "R",
    blockTitle: "Prioritäten",
    frage: "Andere Priorität",
    type: "text",
    bedingung: (s) => s.prioritaeten.ausgewaehlt.includes("andere"),
    get: (s) => s.prioritaeten.andereBeschreibung,
    set: (s, v) => {
      s.prioritaeten.andereBeschreibung = (v as string) ?? "";
    },
  },
  {
    id: "R3",
    block: "R",
    blockTitle: "Prioritäten",
    frage: "Zusätzliche Anliegen oder Besonderheiten?",
    hilfe: "Optional — was ist sonst noch wichtig?",
    type: "longtext",
    get: (s) => s.prioritaeten.zusaetzlicheAnliegen,
    set: (s, v) => {
      s.prioritaeten.zusaetzlicheAnliegen = (v as string) ?? "";
    },
  },
];
