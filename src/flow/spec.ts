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
import type { Kind, SaeuleDreiEntry, Immobilie } from "@/lib/store";
import type { QuestionSpec } from "./types";

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

/**
 * Helper: Netto-Lohnsumme aktualisieren — beide Personen.
 * Im Erfassungs-Flow trägt Berater Netto-Jahreslohn pro Person ein:
 *  - budget.einkommenHeute = Netto-Summe Haushalt (für Cashflow)
 *  - ahv.einkommenP1/P2 = Netto × 1.15 (Brutto-Approximation für Skala 44)
 *
 * Im Pro-Tool kann der Berater nachher beide Werte unabhängig verfeinern.
 */
function updateHaushaltseinkommen(s: {
  ahv: { einkommenP1: number | null; einkommenP2: number | null };
  budget: { einkommenHeute: number | null };
}): void {
  const p1Brutto = s.ahv.einkommenP1 ?? 0;
  const p2Brutto = s.ahv.einkommenP2 ?? 0;
  // ahv-Werte sind hier bereits brutto (s.u. H1_p1/p2-Setter rechnen
  // Netto-Eingabe × 1.15). budget.einkommenHeute soll Netto-Summe sein.
  const nettoSumme = Math.round((p1Brutto + p2Brutto) / 1.15);
  s.budget.einkommenHeute = nettoSumme > 0 ? nettoSumme : null;
}

// ─── Marker-IDs für Flow-erstellte Einträge ─────────────────────────
// Idempotent: bei "ja" wird ein Eintrag mit dieser ID erzeugt (oder beibehalten),
// bei "nein" wieder entfernt. So kann der User Y/N toggeln ohne dass sich
// Mehrfach-Einträge anhäufen.
const MARKER_3A_P1 = "flow-3a-p1";
const MARKER_3A_P2 = "flow-3a-p2";
const MARKER_EIGENHEIM = "flow-eigenheim";
const MARKER_FERIEN = "flow-ferien";
const MARKER_RENDITE = "flow-rendite";
const MARKER_HYPO_EIGENHEIM = "flow-hypo-eigenheim";
const MARKER_HYPO_FERIEN = "flow-hypo-ferien";
const MARKER_HYPO_RENDITE = "flow-hypo-rendite";

/** 3a-Eintrag finden / anlegen. */
function findOrCreate3a(
  arr: SaeuleDreiEntry[],
  markerId: string,
  pensionsjahr: number
): { entry: SaeuleDreiEntry; arr: SaeuleDreiEntry[] } {
  let entry = arr.find((e) => e.id === markerId);
  if (!entry) {
    entry = {
      id: markerId,
      type: "konto",
      saeule: "3a",
      beschreibung: "3a-Konto",
      aktuellerWert: null,
      auszahlungsjahr: pensionsjahr,
      renditeProzent: 1.5,
      rueckkaufswert: null,
      ablaufswert: null,
      ablaufjahr: pensionsjahr,
      jaehrlicheEinzahlung: null,
      einzahlungAb: new Date().getFullYear(),
      einzahlungBis: pensionsjahr - 1,
    };
    return { entry, arr: [...arr, entry] };
  }
  return { entry, arr };
}

/** Immobilie mit Marker-ID finden / anlegen. */
function findOrCreateImmo(
  arr: Immobilie[],
  markerId: string,
  typ: "selbstbewohnt" | "rendite",
  beschreibung: string
): { entry: Immobilie; arr: Immobilie[] } {
  let entry = arr.find((i) => i.id === markerId);
  if (!entry) {
    entry = {
      id: markerId,
      beschreibung,
      typ,
      verkehrswert: null,
      hypotheken: [],
      plan: "behalten",
      verkaufsjahr: new Date().getFullYear() + 30,
      jaehrlicheMieteinnahmen: null,
    };
    return { entry, arr: [...arr, entry] };
  }
  return { entry, arr };
}

/** Hypothek-Tranche an einer Immobilie finden / anlegen / updaten. */
function setHypothekHoehe(
  immo: Immobilie,
  hypoMarker: string,
  hoehe: number | null
): Immobilie {
  const existing = immo.hypotheken.find((h) => h.id === hypoMarker);
  if (existing) {
    return {
      ...immo,
      hypotheken: immo.hypotheken.map((h) =>
        h.id === hypoMarker ? { ...h, hoehe } : h
      ),
    };
  }
  if (hoehe == null) return immo;
  return {
    ...immo,
    hypotheken: [
      ...immo.hypotheken,
      {
        id: hypoMarker,
        beschreibung: "Hypothek",
        hoehe,
        zinssatzProzent: 1.5,
        ablaufjahr: new Date().getFullYear() + 5,
      },
    ],
  };
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
    frage: "Hat Person 1 eine 3a-Säule (Bank oder Versicherung)?",
    frageEinzel: "Haben Sie eine 3a-Säule (Bank oder Versicherung)?",
    hilfe: "Bei mehreren Konten/Policen können weitere im Wizard ergänzt werden.",
    type: "yesno",
    get: (s) =>
      s.saeuleDrei.p1.some((e) => e.id === MARKER_3A_P1) ||
      s.saeuleDrei.p1.length > 0,
    set: (s, v) => {
      if (v === true) {
        if (!s.saeuleDrei.p1.some((e) => e.id === MARKER_3A_P1)) {
          const pj =
            (parseInt(s.person1.geburtsdatum.slice(0, 4), 10) || 1965) +
            (s.ziele.bezugsalterP1 || 65);
          const { arr } = findOrCreate3a(s.saeuleDrei.p1, MARKER_3A_P1, pj);
          s.saeuleDrei.p1 = arr;
        }
      } else {
        s.saeuleDrei.p1 = s.saeuleDrei.p1.filter((e) => e.id !== MARKER_3A_P1);
      }
    },
  },
  {
    id: "G2_p1",
    block: "G",
    blockTitle: "3. Säule",
    frage: "Bei Person 1: Konto oder Versicherung?",
    frageEinzel: "Konto (Bank/Fintech) oder Versicherungs-Police?",
    type: "single",
    bedingung: (s) => s.saeuleDrei.p1.some((e) => e.id === MARKER_3A_P1),
    optionen: [
      { value: "konto", label: "Bank/Fintech-Konto" },
      { value: "versicherung", label: "Versicherungs-Police" },
    ],
    get: (s) => {
      const e = s.saeuleDrei.p1.find((x) => x.id === MARKER_3A_P1);
      return e?.type ?? "konto";
    },
    set: (s, v) => {
      const idx = s.saeuleDrei.p1.findIndex((x) => x.id === MARKER_3A_P1);
      if (idx >= 0 && s.saeuleDrei.p1[idx]) {
        const e = { ...s.saeuleDrei.p1[idx], type: v as "konto" | "versicherung" };
        e.beschreibung = v === "versicherung" ? "3a-Versicherung" : "3a-Konto";
        s.saeuleDrei.p1 = s.saeuleDrei.p1.map((x, i) => (i === idx ? e : x));
      }
    },
  },
  {
    id: "G3_p1",
    block: "G",
    blockTitle: "3. Säule",
    frage: "Aktueller Wert (Person 1)",
    frageEinzel: "Aktueller Wert Ihrer 3a",
    hilfe: "Bei Konto: aktueller Saldo. Bei Versicherung: Rückkaufswert.",
    type: "number",
    suffix: "CHF",
    bedingung: (s) => s.saeuleDrei.p1.some((e) => e.id === MARKER_3A_P1),
    get: (s) => {
      const e = s.saeuleDrei.p1.find((x) => x.id === MARKER_3A_P1);
      if (!e) return null;
      return e.type === "konto" ? e.aktuellerWert : e.rueckkaufswert;
    },
    set: (s, v) => {
      const idx = s.saeuleDrei.p1.findIndex((x) => x.id === MARKER_3A_P1);
      if (idx >= 0 && s.saeuleDrei.p1[idx]) {
        const e = { ...s.saeuleDrei.p1[idx] };
        if (e.type === "konto") e.aktuellerWert = v as number | null;
        else e.rueckkaufswert = v as number | null;
        s.saeuleDrei.p1 = s.saeuleDrei.p1.map((x, i) => (i === idx ? e : x));
      }
    },
  },
  {
    id: "G4_p1",
    block: "G",
    blockTitle: "3. Säule",
    frage: "Ablaufwert (Erlebensfallleistung) bei Person 1 — optional",
    frageEinzel: "Ablaufwert (Erlebensfallleistung) Ihrer Police — optional",
    hilfe:
      "Bei Versicherungs-Policen oft höher als der Rückkaufswert. Steht im Versicherungsvertrag.",
    type: "number",
    suffix: "CHF",
    bedingung: (s) => {
      const e = s.saeuleDrei.p1.find((x) => x.id === MARKER_3A_P1);
      return e?.type === "versicherung";
    },
    get: (s) =>
      s.saeuleDrei.p1.find((x) => x.id === MARKER_3A_P1)?.ablaufswert ?? null,
    set: (s, v) => {
      const idx = s.saeuleDrei.p1.findIndex((x) => x.id === MARKER_3A_P1);
      if (idx >= 0 && s.saeuleDrei.p1[idx]) {
        const e = { ...s.saeuleDrei.p1[idx], ablaufswert: v as number | null };
        s.saeuleDrei.p1 = s.saeuleDrei.p1.map((x, i) => (i === idx ? e : x));
      }
    },
  },
  // ─── 3a für Person 2 (paar) ───
  {
    id: "G1_p2",
    block: "G",
    blockTitle: "3. Säule",
    frage: "Hat Person 2 eine 3a-Säule?",
    bedingung: (s) => s.fallart === "paar",
    type: "yesno",
    get: (s) => s.saeuleDrei.p2.some((e) => e.id === MARKER_3A_P2),
    set: (s, v) => {
      if (v === true) {
        if (!s.saeuleDrei.p2.some((e) => e.id === MARKER_3A_P2)) {
          const pj =
            (parseInt(s.person2.geburtsdatum.slice(0, 4), 10) || 1965) +
            (s.ziele.bezugsalterP2 || 65);
          const { arr } = findOrCreate3a(s.saeuleDrei.p2, MARKER_3A_P2, pj);
          s.saeuleDrei.p2 = arr;
        }
      } else {
        s.saeuleDrei.p2 = s.saeuleDrei.p2.filter((e) => e.id !== MARKER_3A_P2);
      }
    },
  },
  {
    id: "G2_p2",
    block: "G",
    blockTitle: "3. Säule",
    frage: "Bei Person 2: Konto oder Versicherung?",
    type: "single",
    bedingung: (s) =>
      s.fallart === "paar" && s.saeuleDrei.p2.some((e) => e.id === MARKER_3A_P2),
    optionen: [
      { value: "konto", label: "Bank/Fintech-Konto" },
      { value: "versicherung", label: "Versicherungs-Police" },
    ],
    get: (s) => s.saeuleDrei.p2.find((x) => x.id === MARKER_3A_P2)?.type ?? "konto",
    set: (s, v) => {
      const idx = s.saeuleDrei.p2.findIndex((x) => x.id === MARKER_3A_P2);
      if (idx >= 0 && s.saeuleDrei.p2[idx]) {
        const e = { ...s.saeuleDrei.p2[idx], type: v as "konto" | "versicherung" };
        e.beschreibung = v === "versicherung" ? "3a-Versicherung" : "3a-Konto";
        s.saeuleDrei.p2 = s.saeuleDrei.p2.map((x, i) => (i === idx ? e : x));
      }
    },
  },
  {
    id: "G3_p2",
    block: "G",
    blockTitle: "3. Säule",
    frage: "Aktueller Wert (Person 2)",
    type: "number",
    suffix: "CHF",
    bedingung: (s) =>
      s.fallart === "paar" && s.saeuleDrei.p2.some((e) => e.id === MARKER_3A_P2),
    get: (s) => {
      const e = s.saeuleDrei.p2.find((x) => x.id === MARKER_3A_P2);
      if (!e) return null;
      return e.type === "konto" ? e.aktuellerWert : e.rueckkaufswert;
    },
    set: (s, v) => {
      const idx = s.saeuleDrei.p2.findIndex((x) => x.id === MARKER_3A_P2);
      if (idx >= 0 && s.saeuleDrei.p2[idx]) {
        const e = { ...s.saeuleDrei.p2[idx] };
        if (e.type === "konto") e.aktuellerWert = v as number | null;
        else e.rueckkaufswert = v as number | null;
        s.saeuleDrei.p2 = s.saeuleDrei.p2.map((x, i) => (i === idx ? e : x));
      }
    },
  },
  {
    id: "G4_p2",
    block: "G",
    blockTitle: "3. Säule",
    frage: "Ablaufwert bei Person 2 — optional",
    type: "number",
    suffix: "CHF",
    bedingung: (s) => {
      if (s.fallart !== "paar") return false;
      const e = s.saeuleDrei.p2.find((x) => x.id === MARKER_3A_P2);
      return e?.type === "versicherung";
    },
    get: (s) =>
      s.saeuleDrei.p2.find((x) => x.id === MARKER_3A_P2)?.ablaufswert ?? null,
    set: (s, v) => {
      const idx = s.saeuleDrei.p2.findIndex((x) => x.id === MARKER_3A_P2);
      if (idx >= 0 && s.saeuleDrei.p2[idx]) {
        const e = { ...s.saeuleDrei.p2[idx], ablaufswert: v as number | null };
        s.saeuleDrei.p2 = s.saeuleDrei.p2.map((x, i) => (i === idx ? e : x));
      }
    },
  },

  // ═══ Block H — Einkommen & Vermögen ═══
  {
    id: "H1_p1",
    block: "H",
    blockTitle: "Einkommen & Vermögen",
    frage: "Netto-Jahreslohn Person 1",
    frageEinzel: "Ihr Netto-Jahreslohn",
    hilfe:
      "Jahres-Nettolohn nach Sozialabzügen (AHV/IV/EO/ALV/BVG) — Brutto-Wert für AHV-Berechnung wird automatisch hochgerechnet (×1.15).",
    type: "number",
    suffix: "CHF / Jahr",
    // Anzeige: Netto. Speicher in ahv.einkommenP1 als Brutto (Netto × 1.15)
    // für korrekte Skala-44-Berechnung. budget.einkommenHeute = Netto-Summe.
    get: (s) => (s.ahv.einkommenP1 != null ? Math.round(s.ahv.einkommenP1 / 1.15) : null),
    set: (s, v) => {
      const netto = v as number | null;
      s.ahv.einkommenP1 = netto != null ? Math.round(netto * 1.15) : null;
      updateHaushaltseinkommen(s);
    },
  },
  {
    id: "H1_p2",
    block: "H",
    blockTitle: "Einkommen & Vermögen",
    frage: "Netto-Jahreslohn Person 2",
    hilfe:
      "Jahres-Nettolohn nach Sozialabzügen — Brutto-Wert für AHV wird automatisch hochgerechnet.",
    type: "number",
    bedingung: (s) => s.fallart === "paar",
    suffix: "CHF / Jahr",
    get: (s) => (s.ahv.einkommenP2 != null ? Math.round(s.ahv.einkommenP2 / 1.15) : null),
    set: (s, v) => {
      const netto = v as number | null;
      s.ahv.einkommenP2 = netto != null ? Math.round(netto * 1.15) : null;
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
    hilfe: "Bei mehreren Liegenschaften können weitere im Wizard ergänzt werden.",
    type: "yesno",
    get: (s) => s.immobilien.items.some((i) => i.id === MARKER_EIGENHEIM),
    set: (s, v) => {
      if (v === true) {
        if (!s.immobilien.items.some((i) => i.id === MARKER_EIGENHEIM)) {
          const { arr } = findOrCreateImmo(
            s.immobilien.items,
            MARKER_EIGENHEIM,
            "selbstbewohnt",
            "Eigenheim"
          );
          s.immobilien.items = arr;
        }
      } else {
        s.immobilien.items = s.immobilien.items.filter(
          (i) => i.id !== MARKER_EIGENHEIM
        );
      }
    },
  },
  {
    id: "I1",
    block: "I",
    blockTitle: "Eigenheim",
    frage: "Verkehrswert Ihres Eigenheims",
    hilfe: "aktueller Marktwert (Schätzung des Maklers oder amtlicher Wert)",
    type: "number",
    suffix: "CHF",
    bedingung: (s) => s.immobilien.items.some((i) => i.id === MARKER_EIGENHEIM),
    get: (s) =>
      s.immobilien.items.find((i) => i.id === MARKER_EIGENHEIM)?.verkehrswert ??
      null,
    set: (s, v) => {
      s.immobilien.items = s.immobilien.items.map((i) =>
        i.id === MARKER_EIGENHEIM ? { ...i, verkehrswert: v as number | null } : i
      );
    },
  },
  {
    id: "I2",
    block: "I",
    blockTitle: "Eigenheim",
    frage: "Hypothek Total auf dem Eigenheim",
    hilfe: "Summe aller Tranchen. 0 falls keine Hypothek (selten).",
    type: "number",
    suffix: "CHF",
    bedingung: (s) => s.immobilien.items.some((i) => i.id === MARKER_EIGENHEIM),
    get: (s) => {
      const im = s.immobilien.items.find((i) => i.id === MARKER_EIGENHEIM);
      if (!im) return null;
      const total = im.hypotheken.reduce((sum, h) => sum + (h.hoehe ?? 0), 0);
      return total > 0 ? total : null;
    },
    set: (s, v) => {
      s.immobilien.items = s.immobilien.items.map((i) =>
        i.id === MARKER_EIGENHEIM
          ? setHypothekHoehe(i, MARKER_HYPO_EIGENHEIM, v as number | null)
          : i
      );
    },
  },

  // ═══ Block J — Ferienliegenschaft ═══
  {
    id: "J0",
    block: "J",
    blockTitle: "Ferienliegenschaft",
    frage: "Ferienliegenschaft vorhanden?",
    type: "yesno",
    get: (s) => s.immobilien.items.some((i) => i.id === MARKER_FERIEN),
    set: (s, v) => {
      if (v === true) {
        if (!s.immobilien.items.some((i) => i.id === MARKER_FERIEN)) {
          const { arr } = findOrCreateImmo(
            s.immobilien.items,
            MARKER_FERIEN,
            "selbstbewohnt",
            "Ferienliegenschaft"
          );
          s.immobilien.items = arr;
        }
      } else {
        s.immobilien.items = s.immobilien.items.filter(
          (i) => i.id !== MARKER_FERIEN
        );
      }
    },
  },
  {
    id: "J1",
    block: "J",
    blockTitle: "Ferienliegenschaft",
    frage: "Verkehrswert Ferienliegenschaft",
    type: "number",
    suffix: "CHF",
    bedingung: (s) => s.immobilien.items.some((i) => i.id === MARKER_FERIEN),
    get: (s) =>
      s.immobilien.items.find((i) => i.id === MARKER_FERIEN)?.verkehrswert ??
      null,
    set: (s, v) => {
      s.immobilien.items = s.immobilien.items.map((i) =>
        i.id === MARKER_FERIEN ? { ...i, verkehrswert: v as number | null } : i
      );
    },
  },
  {
    id: "J2",
    block: "J",
    blockTitle: "Ferienliegenschaft",
    frage: "Hypothek Total auf der Ferienliegenschaft",
    type: "number",
    suffix: "CHF",
    bedingung: (s) => s.immobilien.items.some((i) => i.id === MARKER_FERIEN),
    get: (s) => {
      const im = s.immobilien.items.find((i) => i.id === MARKER_FERIEN);
      if (!im) return null;
      const total = im.hypotheken.reduce((sum, h) => sum + (h.hoehe ?? 0), 0);
      return total > 0 ? total : null;
    },
    set: (s, v) => {
      s.immobilien.items = s.immobilien.items.map((i) =>
        i.id === MARKER_FERIEN
          ? setHypothekHoehe(i, MARKER_HYPO_FERIEN, v as number | null)
          : i
      );
    },
  },

  // ═══ Block K — Renditeliegenschaft ═══
  {
    id: "K0",
    block: "K",
    blockTitle: "Renditeliegenschaft",
    frage: "Renditeliegenschaft(en) vorhanden?",
    hilfe: "Bei mehreren Objekten können weitere im Wizard ergänzt werden.",
    type: "yesno",
    get: (s) => s.immobilien.items.some((i) => i.id === MARKER_RENDITE),
    set: (s, v) => {
      if (v === true) {
        if (!s.immobilien.items.some((i) => i.id === MARKER_RENDITE)) {
          const { arr } = findOrCreateImmo(
            s.immobilien.items,
            MARKER_RENDITE,
            "rendite",
            "Renditeliegenschaft"
          );
          s.immobilien.items = arr;
        }
      } else {
        s.immobilien.items = s.immobilien.items.filter(
          (i) => i.id !== MARKER_RENDITE
        );
      }
    },
  },
  {
    id: "K1",
    block: "K",
    blockTitle: "Renditeliegenschaft",
    frage: "Verkehrswert Renditeliegenschaft",
    type: "number",
    suffix: "CHF",
    bedingung: (s) => s.immobilien.items.some((i) => i.id === MARKER_RENDITE),
    get: (s) =>
      s.immobilien.items.find((i) => i.id === MARKER_RENDITE)?.verkehrswert ??
      null,
    set: (s, v) => {
      s.immobilien.items = s.immobilien.items.map((i) =>
        i.id === MARKER_RENDITE ? { ...i, verkehrswert: v as number | null } : i
      );
    },
  },
  {
    id: "K2",
    block: "K",
    blockTitle: "Renditeliegenschaft",
    frage: "Hypothek Total auf der Renditeliegenschaft",
    type: "number",
    suffix: "CHF",
    bedingung: (s) => s.immobilien.items.some((i) => i.id === MARKER_RENDITE),
    get: (s) => {
      const im = s.immobilien.items.find((i) => i.id === MARKER_RENDITE);
      if (!im) return null;
      const total = im.hypotheken.reduce((sum, h) => sum + (h.hoehe ?? 0), 0);
      return total > 0 ? total : null;
    },
    set: (s, v) => {
      s.immobilien.items = s.immobilien.items.map((i) =>
        i.id === MARKER_RENDITE
          ? setHypothekHoehe(i, MARKER_HYPO_RENDITE, v as number | null)
          : i
      );
    },
  },
  {
    id: "K3",
    block: "K",
    blockTitle: "Renditeliegenschaft",
    frage: "Brutto-Mieteinnahmen pro Jahr",
    hilfe: "Total aller Mieteinnahmen vor Nebenkosten und Hypothekarzinsen",
    type: "number",
    suffix: "CHF / Jahr",
    bedingung: (s) => s.immobilien.items.some((i) => i.id === MARKER_RENDITE),
    get: (s) =>
      s.immobilien.items.find((i) => i.id === MARKER_RENDITE)
        ?.jaehrlicheMieteinnahmen ?? null,
    set: (s, v) => {
      s.immobilien.items = s.immobilien.items.map((i) =>
        i.id === MARKER_RENDITE
          ? { ...i, jaehrlicheMieteinnahmen: v as number | null }
          : i
      );
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
    frage: "Schenkungen oder Erbvorbezüge an Kinder?",
    hilfe: "Bereits getätigt, geplant in den nächsten Jahren oder nicht vorgesehen?",
    type: "single",
    optionen: [
      { value: "getaetigt", label: "Ja, bereits getätigt" },
      { value: "geplant", label: "Ja, geplant" },
      { value: "nein", label: "Nein" },
    ],
    get: (s) => s.erbschaft.schenkungenStatus,
    set: (s, v) => {
      s.erbschaft.schenkungenStatus =
        v as typeof s.erbschaft.schenkungenStatus;
    },
  },
  {
    id: "N4",
    block: "N",
    blockTitle: "Erbschaft & Güterrecht",
    frage: "Details",
    hilfe:
      "Wenn bereits getätigt: Höhe und Jahr. Wenn geplant: ungefähre Höhe und Zeitraum.",
    type: "longtext",
    bedingung: (s) =>
      s.erbschaft.schenkungenStatus === "getaetigt" ||
      s.erbschaft.schenkungenStatus === "geplant",
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
      s.nachlass.vorsorgeauftrag = v ? "ja" : "nein";
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
      s.nachlass.patientenverfuegung = v ? "ja" : "nein";
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
      s.nachlass.testament = v ? "ja" : "nein";
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
      s.nachlass.ehevertrag = v ? "ja" : "nein";
    },
  },

  // Block R "Prioritäten" entfernt — User-Wunsch. Pro-Tool hat eigenen
  // Block 10 Nachlass + Massnahmen-Logik, Prioritäten-Vorab-Erfassung
  // bringt für Berater-Workflow keinen Mehrwert.
];
