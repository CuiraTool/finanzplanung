/**
 * Frage-Spec für den geführten Frage-Flow (Cuira-Typeform).
 *
 * Reihenfolge nach Word-Doc Pensionsplanung_Typeform_Optimierung:
 *   A → B → C → C' → D → E → F → G → H → I → J → K → L → M → N → O → P → Q → R
 *
 * Block-Mapping zum klassischen Wizard (1-10):
 *   Wizard 1 = A + B (Personen, Adresse, Kinder)
 *   Wizard 2 = C + D (Pensionierung, Wünsche)
 *   Wizard 3 = H/H1 (Einkommen, Sparquote, Verbrauch)
 *   Wizard 4 = E (AHV)
 *   Wizard 5 = F (PK)
 *   Wizard 6 = G (3a/3b)
 *   Wizard 7 = H/Vermögen (Liquidität, Wertschriften, Schulden)
 *   Wizard 8 = I+J+K (Immobilien)
 *   Wizard 9 = L (Firma)
 *   Wizard 10 = N+Q (Erbschaft + Nachlassdokumente)
 *
 * - Block A wird in V2 separat als Berater-Onboarding behandelt
 * - Block S (Abschluss/DSG) wird in V2-Route separat behandelt
 * - Detail-Eingaben (Hypothek-Tranchen, mehrere FZ-Konten, etc.) bleiben
 *   im klassischen Wizard. Hier nur Y/N + Schlüsselzahlen.
 */

import { KANTONE } from "@/lib/store";
import type { Kind } from "@/lib/store";
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

/** Helper: Lohnsumme aktualisieren — beide Personen → budget.einkommenHeute. */
function updateHaushaltseinkommen(s: {
  ahv: { einkommenP1: number | null; einkommenP2: number | null };
  budget: { einkommenHeute: number | null };
}): void {
  const p1 = s.ahv.einkommenP1 ?? 0;
  const p2 = s.ahv.einkommenP2 ?? 0;
  const sum = p1 + p2;
  s.budget.einkommenHeute = sum > 0 ? sum : null;
}

/** Helper: kinder-Array auf gewünschte Länge bringen (B5). */
function setKinderAnzahl(
  s: { kinder: Kind[]; fallart: "einzel" | "paar" },
  anzahl: number
): void {
  const ziel = Math.max(0, Math.min(10, Math.floor(anzahl)));
  if (ziel === 0) {
    s.kinder = [];
    return;
  }
  const aktuell = s.kinder.length;
  if (ziel > aktuell) {
    const neue: Kind[] = [];
    for (let i = aktuell; i < ziel; i++) {
      neue.push({
        id: `flow-${Date.now()}-${i}`,
        vorname: "",
        geburtsdatum: "",
        zuordnung: s.fallart === "paar" ? "gemeinsam" : "p1",
      });
    }
    s.kinder = [...s.kinder, ...neue];
  } else if (ziel < aktuell) {
    s.kinder = s.kinder.slice(0, ziel);
  }
}

export const QUESTIONS: QuestionSpec[] = [
  // ═══ Auftakt — A6 (Fallart steuert alles weitere) ═══
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

  // ═══ Block B — Zivilstand & Familie ═══
  {
    id: "B0_p1_name",
    block: "B",
    blockTitle: "Familie",
    frage: "Vor- und Nachname Person 1",
    frageEinzel: "Ihr Vor- und Nachname",
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
    id: "B1",
    block: "B",
    blockTitle: "Familie",
    frage: "Geburtsdatum Person 1",
    frageEinzel: "Ihr Geburtsdatum",
    type: "date",
    pflicht: true,
    get: (s) => s.person1.geburtsdatum,
    set: (s, v) => {
      s.person1.geburtsdatum = (v as string) ?? "";
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
    frage: "Wie viele Kinder?",
    hilfe:
      "0 = keine Kinder. Detail-Erfassung (Name, Geburtsjahr) im klassischen Wizard nach dem Flow.",
    type: "number",
    min: 0,
    max: 10,
    get: (s) => s.kinder.length,
    set: (s, v) => {
      setKinderAnzahl(s, (v as number) ?? 0);
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

  // ═══ Block C — Pensionierungsszenario Person 1 ═══
  {
    id: "C2_p1",
    block: "C",
    blockTitle: "Pensionierung Person 1",
    frage: "Mit welchem Alter möchte Person 1 in Pension?",
    frageEinzel: "Mit welchem Alter möchten Sie in Pension?",
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

  // ═══ Block C' — Pensionierungsszenario Person 2 ═══
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

  // ═══ Block D — Zielverbrauch & Wünsche ═══
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

  // ═══ Block E — 1. Säule (AHV) ═══
  {
    id: "E1_p1",
    block: "E",
    blockTitle: "1. Säule (AHV)",
    frage: "Aktueller IK-Auszug für Person 1 vorhanden?",
    frageEinzel: "Haben Sie einen aktuellen IK-Auszug (AHV)?",
    type: "yesno",
    get: (s) => s.ahv.hatIkAuszugP1,
    set: (s, v) => {
      s.ahv.hatIkAuszugP1 = v as boolean;
    },
  },

  // ═══ Block F — 2. Säule (Pensionskasse) ═══
  {
    id: "F1",
    block: "F",
    blockTitle: "2. Säule (Pensionskasse)",
    frage: "Hat Person 1 einen aktiven PK-Anschluss?",
    frageEinzel: "Haben Sie einen aktiven PK-Anschluss?",
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
    frageEinzel: "Ihr aktuelles PK-Altersguthaben (laut Ausweis)",
    type: "number",
    bedingung: (s) => s.bvg.p1.aktiverAnschluss,
    suffix: "CHF",
    get: (s) => s.bvg.p1.altersguthabenHeute,
    set: (s, v) => {
      s.bvg.p1.altersguthabenHeute = v as number | null;
    },
  },
  {
    id: "F5_p1",
    block: "F",
    blockTitle: "2. Säule (Pensionskasse)",
    frage: "Hat Person 1 ein Freizügigkeitskonto oder eine -police?",
    frageEinzel: "Haben Sie ein Freizügigkeitskonto oder eine -police?",
    hilfe: "z.B. aus einer früheren Anstellung — auch ohne aktive PK möglich",
    type: "yesno",
    get: (s) => s.bvg.p1.freizuegigkeit.length > 0,
    set: (s, v) => {
      if (v === true) {
        if (s.bvg.p1.freizuegigkeit.length === 0) {
          const geburtsjahr =
            parseInt(s.person1.geburtsdatum.slice(0, 4), 10) || 1965;
          s.bvg.p1.freizuegigkeit = [
            {
              id: `flow-fz-p1-${Date.now()}`,
              beschreibung: "Freizügigkeit",
              saldoHeute: null,
              auszahlungsjahr: geburtsjahr + s.ziele.bezugsalterP1,
              renditeProzent: 0,
            },
          ];
        }
      } else {
        s.bvg.p1.freizuegigkeit = [];
      }
    },
  },
  {
    id: "F6_p1",
    block: "F",
    blockTitle: "2. Säule (Pensionskasse)",
    frage: "Höhe Freizügigkeit Person 1 (gesamt)",
    frageEinzel: "Höhe Ihrer Freizügigkeit (gesamt)",
    hilfe: "Wenn mehrere Konten/Policen: Summe aller Saldi",
    type: "number",
    bedingung: (s) => s.bvg.p1.freizuegigkeit.length > 0,
    suffix: "CHF",
    get: (s) => s.bvg.p1.freizuegigkeit[0]?.saldoHeute ?? null,
    set: (s, v) => {
      if (s.bvg.p1.freizuegigkeit[0]) {
        s.bvg.p1.freizuegigkeit[0].saldoHeute = v as number | null;
      }
    },
  },
  {
    id: "F7_p1",
    block: "F",
    blockTitle: "2. Säule (Pensionskasse)",
    frage: "Konto oder angelegt (Wertschriften)?",
    hilfe: "Konto = ~0 % Rendite. Angelegt = ~2.5 % p.a. (Standard-Annahme).",
    type: "single",
    bedingung: (s) => s.bvg.p1.freizuegigkeit.length > 0,
    optionen: [
      { value: "konto", label: "Konto (0 % Rendite)" },
      { value: "angelegt", label: "Angelegt (~2.5 % Rendite)" },
      { value: "weiss_nicht", label: "Weiss nicht" },
    ],
    get: (s) => {
      const fz = s.bvg.p1.freizuegigkeit[0];
      if (!fz) return "weiss_nicht";
      if (fz.renditeProzent >= 1.5) return "angelegt";
      return "konto";
    },
    set: (s, v) => {
      const fz = s.bvg.p1.freizuegigkeit[0];
      if (!fz) return;
      const val = v as string;
      if (val === "angelegt") fz.renditeProzent = 2.5;
      else if (val === "konto") fz.renditeProzent = 0;
      // "weiss_nicht": Default beibehalten
    },
  },
  {
    id: "F14",
    block: "F",
    blockTitle: "2. Säule (Pensionskasse)",
    frage: "Bezugspräferenz Person 1: Rente, Kapital oder Mischlösung?",
    frageEinzel: "Ihre Bezugspräferenz: Rente, Kapital oder Mischlösung?",
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
    id: "F5_p2",
    block: "F",
    blockTitle: "2. Säule (Pensionskasse)",
    frage: "Hat Person 2 ein Freizügigkeitskonto oder eine -police?",
    hilfe: "z.B. aus einer früheren Anstellung — auch ohne aktive PK möglich",
    type: "yesno",
    bedingung: (s) => s.fallart === "paar",
    get: (s) => s.bvg.p2.freizuegigkeit.length > 0,
    set: (s, v) => {
      if (v === true) {
        if (s.bvg.p2.freizuegigkeit.length === 0) {
          const geburtsjahr =
            parseInt(s.person2.geburtsdatum.slice(0, 4), 10) || 1965;
          s.bvg.p2.freizuegigkeit = [
            {
              id: `flow-fz-p2-${Date.now()}`,
              beschreibung: "Freizügigkeit",
              saldoHeute: null,
              auszahlungsjahr: geburtsjahr + s.ziele.bezugsalterP2,
              renditeProzent: 0,
            },
          ];
        }
      } else {
        s.bvg.p2.freizuegigkeit = [];
      }
    },
  },
  {
    id: "F6_p2",
    block: "F",
    blockTitle: "2. Säule (Pensionskasse)",
    frage: "Höhe Freizügigkeit Person 2 (gesamt)",
    hilfe: "Wenn mehrere Konten/Policen: Summe aller Saldi",
    type: "number",
    bedingung: (s) => s.fallart === "paar" && s.bvg.p2.freizuegigkeit.length > 0,
    suffix: "CHF",
    get: (s) => s.bvg.p2.freizuegigkeit[0]?.saldoHeute ?? null,
    set: (s, v) => {
      if (s.bvg.p2.freizuegigkeit[0]) {
        s.bvg.p2.freizuegigkeit[0].saldoHeute = v as number | null;
      }
    },
  },
  {
    id: "F7_p2",
    block: "F",
    blockTitle: "2. Säule (Pensionskasse)",
    frage: "Konto oder angelegt (Wertschriften) — Person 2?",
    hilfe: "Konto = ~0 % Rendite. Angelegt = ~2.5 % p.a. (Standard-Annahme).",
    type: "single",
    bedingung: (s) => s.fallart === "paar" && s.bvg.p2.freizuegigkeit.length > 0,
    optionen: [
      { value: "konto", label: "Konto (0 % Rendite)" },
      { value: "angelegt", label: "Angelegt (~2.5 % Rendite)" },
      { value: "weiss_nicht", label: "Weiss nicht" },
    ],
    get: (s) => {
      const fz = s.bvg.p2.freizuegigkeit[0];
      if (!fz) return "weiss_nicht";
      if (fz.renditeProzent >= 1.5) return "angelegt";
      return "konto";
    },
    set: (s, v) => {
      const fz = s.bvg.p2.freizuegigkeit[0];
      if (!fz) return;
      const val = v as string;
      if (val === "angelegt") fz.renditeProzent = 2.5;
      else if (val === "konto") fz.renditeProzent = 0;
    },
  },
  {
    id: "F16",
    block: "F",
    blockTitle: "2. Säule (Pensionskasse)",
    frage: "Bezugspräferenz Person 2: Rente, Kapital oder Mischlösung?",
    type: "single",
    bedingung: (s) => s.fallart === "paar" && s.bvg.p2.aktiverAnschluss,
    optionen: [
      { value: "rente", label: "Rente" },
      { value: "kapital", label: "Kapital" },
      { value: "mischung", label: "Mischlösung" },
    ],
    get: (s) => s.bvg.p2.bezugspraeferenz,
    set: (s, v) => {
      s.bvg.p2.bezugspraeferenz = v as typeof s.bvg.p2.bezugspraeferenz;
    },
  },

  // ═══ Block G — 3. Säule ═══
  {
    id: "G1_p1",
    block: "G",
    blockTitle: "3. Säule",
    frage: "Hat Person 1 eine 3a-Säule (Bank, Versicherung)?",
    frageEinzel: "Haben Sie eine 3a-Säule (Bank oder Versicherung)?",
    hilfe:
      "Detail-Erfassung (Anbieter, Saldo, Auszahlung) im klassischen Wizard nach dem Flow.",
    type: "yesno",
    get: (s) => s.saeuleDrei.p1.length > 0,
    set: () => {
      // No-op: tatsächliche Erfassung im Wizard, hier nur Indikation
    },
  },

  // ═══ Block H — Einkommen & Vermögen ═══
  {
    id: "H1_p1",
    block: "H",
    blockTitle: "Einkommen & Vermögen",
    frage: "Brutto-Jahreslohn Person 1",
    frageEinzel: "Ihr Brutto-Jahreslohn",
    hilfe: "Aktueller Lohn vor Sozialabzügen, ohne Bonus/Variable",
    type: "number",
    pflicht: true,
    suffix: "CHF / Jahr",
    get: (s) => s.ahv.einkommenP1,
    set: (s, v) => {
      s.ahv.einkommenP1 = v as number | null;
      updateHaushaltseinkommen(s);
    },
  },
  {
    id: "H1_p2",
    block: "H",
    blockTitle: "Einkommen & Vermögen",
    frage: "Brutto-Jahreslohn Person 2",
    hilfe: "Aktueller Lohn vor Sozialabzügen, ohne Bonus/Variable",
    type: "number",
    pflicht: true,
    bedingung: (s) => s.fallart === "paar",
    suffix: "CHF / Jahr",
    get: (s) => s.ahv.einkommenP2,
    set: (s, v) => {
      s.ahv.einkommenP2 = v as number | null;
      updateHaushaltseinkommen(s);
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

  // ═══ Block I — Eigenheim ═══
  {
    id: "I0",
    block: "I",
    blockTitle: "Eigenheim",
    frage: "Sind Sie Eigenheim­besitzer?",
    hilfe: "Detail-Erfassung (Wert, Hypothek) im klassischen Wizard nach dem Flow.",
    type: "yesno",
    get: (s) => s.immobilien.items.some((i) => i.typ === "selbstbewohnt"),
    set: () => {
      // No-op
    },
  },

  // ═══ Block J — Ferienliegenschaft ═══
  {
    id: "J0",
    block: "J",
    blockTitle: "Ferienliegenschaft",
    frage: "Ferienliegenschaft vorhanden?",
    type: "yesno",
    get: (s) =>
      s.immobilien.items.filter((i) => i.typ === "selbstbewohnt").length > 1,
    set: () => {
      // No-op (Wizard-Detail)
    },
  },

  // ═══ Block K — Renditeliegenschaft ═══
  {
    id: "K0",
    block: "K",
    blockTitle: "Renditeliegenschaft",
    frage: "Renditeliegenschaft(en) vorhanden?",
    type: "yesno",
    get: (s) => s.immobilien.items.some((i) => i.typ === "rendite"),
    set: () => {
      // No-op (Wizard-Detail)
    },
  },

  // ═══ Block L — Firma / Selbständigkeit ═══
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

  // ═══ Block M — Anlagen ═══
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

  // ═══ Block N — Erbschaft, Schenkung & Güterrecht ═══
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

  // ═══ Block O — Steuern & Wohnort ═══
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

  // ═══ Block P — Versicherungen ═══
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

  // ═══ Block Q — Vorsorge-/Nachlassdokumente ═══
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

  // ═══ Block R — Prioritäten & offene Anliegen ═══
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
