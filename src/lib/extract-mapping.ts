/**
 * Mapping zwischen extrahierten Doc-Werten und Plan-State-Setter.
 *
 * Liefert eine Liste von "Vorschlägen" — Einzelne Felder, die der User
 * gezielt übernehmen oder verwerfen kann. Jeder Vorschlag enthält:
 *  - eine menschenlesbare Beschreibung ("PK-Altersguthaben heute")
 *  - aktueller Plan-Wert (zum Vergleich)
 *  - vorgeschlagener Wert (aus dem Doc)
 *  - die Apply-Funktion, die den Wert in den Store schreibt
 */

import type { ExtractedDocument, ExtractedFelder } from "./extract-schema";
import type { PlanState } from "./store";

export interface Vorschlag {
  id: string;
  feldLabel: string;
  block: string; // "Block 1 — Personen"
  aktuellerWert: string; // formatiert
  neuerWert: string; // formatiert
  apply: (store: PlanStoreActions) => void;
}

/**
 * Setter-Subset, den die Mapping-Logik braucht. Erlaubt es, Vorschläge gegen
 * einen sauberen Action-Slice testen zu können (statt gegen den ganzen Store).
 */
export type PlanStoreActions = Pick<
  PlanState,
  | "setPerson1"
  | "setAdresse"
  | "setSteuerAnker"
  | "setBvgP1"
  | "setAhv"
  | "addSaeuleDrei"
  | "addVermoegen"
>;

const fmtChf = (n: number | null): string =>
  n == null ? "—" : new Intl.NumberFormat("de-CH").format(n) + " CHF";
const fmtPct = (n: number | null): string => (n == null ? "—" : `${n}%`);

export function vorschlaegeAusExtract(
  ex: ExtractedDocument,
  state: PlanState
): Vorschlag[] {
  const f = ex.felder;
  const out: Vorschlag[] = [];

  // ─── Block 1 — Personen ──────────────────────────────────────────
  if (f.vorname && f.vorname !== state.person1.vorname) {
    out.push({
      id: "person1.vorname",
      feldLabel: "Vorname",
      block: "Block 1 — Personen",
      aktuellerWert: state.person1.vorname || "—",
      neuerWert: f.vorname,
      apply: (s) => s.setPerson1({ vorname: f.vorname! }),
    });
  }
  if (f.nachname && f.nachname !== state.person1.nachname) {
    out.push({
      id: "person1.nachname",
      feldLabel: "Nachname",
      block: "Block 1 — Personen",
      aktuellerWert: state.person1.nachname || "—",
      neuerWert: f.nachname,
      apply: (s) => s.setPerson1({ nachname: f.nachname! }),
    });
  }
  if (f.geburtsdatum && f.geburtsdatum !== state.person1.geburtsdatum) {
    out.push({
      id: "person1.geburtsdatum",
      feldLabel: "Geburtsdatum",
      block: "Block 1 — Personen",
      aktuellerWert: state.person1.geburtsdatum || "—",
      neuerWert: f.geburtsdatum,
      apply: (s) => s.setPerson1({ geburtsdatum: f.geburtsdatum! }),
    });
  }

  if (f.strasse && f.strasse !== state.adresse.strasse) {
    out.push({
      id: "adresse.strasse",
      feldLabel: "Strasse",
      block: "Block 1 — Personen",
      aktuellerWert: state.adresse.strasse || "—",
      neuerWert: f.strasse,
      apply: (s) => s.setAdresse({ strasse: f.strasse! }),
    });
  }
  if (f.plz && f.plz !== state.adresse.plz) {
    out.push({
      id: "adresse.plz",
      feldLabel: "PLZ",
      block: "Block 1 — Personen",
      aktuellerWert: state.adresse.plz || "—",
      neuerWert: f.plz,
      apply: (s) => s.setAdresse({ plz: f.plz! }),
    });
  }
  if (f.ort && f.ort !== state.adresse.ort) {
    out.push({
      id: "adresse.ort",
      feldLabel: "Ort",
      block: "Block 1 — Personen",
      aktuellerWert: state.adresse.ort || "—",
      neuerWert: f.ort,
      apply: (s) => s.setAdresse({ ort: f.ort! }),
    });
  }
  if (f.kanton && f.kanton !== state.adresse.kanton) {
    out.push({
      id: "adresse.kanton",
      feldLabel: "Kanton",
      block: "Block 1 — Personen",
      aktuellerWert: state.adresse.kanton || "—",
      neuerWert: f.kanton,
      apply: (s) => s.setAdresse({ kanton: f.kanton! }),
    });
  }

  // ─── Block 3 — Steuer-Anker ─────────────────────────────────────
  if (f.bruttojahreseinkommen != null) {
    out.push({
      id: "steuerAnker.einkommen",
      feldLabel: "Bruttojahreseinkommen heute",
      block: "Block 3 — Budget",
      aktuellerWert: fmtChf(state.budget.einkommenHeute),
      neuerWert: fmtChf(f.bruttojahreseinkommen),
      apply: (s) =>
        s.setSteuerAnker(
          state.budget.steuernHeute,
          f.bruttojahreseinkommen
        ),
    });
  }
  if (f.jahressteuer != null) {
    out.push({
      id: "steuerAnker.steuern",
      feldLabel: "Jahressteuer letzte Veranlagung",
      block: "Block 3 — Budget",
      aktuellerWert: fmtChf(state.budget.steuernHeute),
      neuerWert: fmtChf(f.jahressteuer),
      apply: (s) =>
        s.setSteuerAnker(f.jahressteuer, state.budget.einkommenHeute),
    });
  }

  // ─── Block 4 — AHV ──────────────────────────────────────────────
  if (f.massgebendesEinkommen != null) {
    out.push({
      id: "ahv.einkommenP1",
      feldLabel: "Massgebendes Jahreseinkommen P1",
      block: "Block 4 — AHV",
      aktuellerWert: fmtChf(state.ahv.einkommenP1),
      neuerWert: fmtChf(f.massgebendesEinkommen),
      apply: (s) => s.setAhv({ einkommenP1: f.massgebendesEinkommen }),
    });
  }

  // ─── Block 5 — PK ───────────────────────────────────────────────
  if (f.pkAltersguthabenHeute != null) {
    out.push({
      id: "bvg.altersguthabenHeute",
      feldLabel: "PK-Altersguthaben heute",
      block: "Block 5 — Pensionskasse",
      aktuellerWert: fmtChf(state.bvg.p1.altersguthabenHeute),
      neuerWert: fmtChf(f.pkAltersguthabenHeute),
      apply: (s) =>
        s.setBvgP1({ altersguthabenHeute: f.pkAltersguthabenHeute }),
    });
  }
  if (f.pkAltersguthabenMit65 != null) {
    out.push({
      id: "bvg.altersguthabenBeiBezug",
      feldLabel: "PK-Altersguthaben mit 65",
      block: "Block 5 — Pensionskasse",
      aktuellerWert: fmtChf(state.bvg.p1.altersguthabenBeiBezug),
      neuerWert: fmtChf(f.pkAltersguthabenMit65),
      apply: (s) =>
        s.setBvgP1({ altersguthabenBeiBezug: f.pkAltersguthabenMit65 }),
    });
  }
  if (f.pkUmwandlungssatzProzent != null) {
    out.push({
      id: "bvg.umwandlungssatz",
      feldLabel: "PK-Umwandlungssatz",
      block: "Block 5 — Pensionskasse",
      aktuellerWert: fmtPct(state.bvg.p1.umwandlungssatzProzent),
      neuerWert: fmtPct(f.pkUmwandlungssatzProzent),
      apply: (s) =>
        s.setBvgP1({ umwandlungssatzProzent: f.pkUmwandlungssatzProzent! }),
    });
  }

  // ─── Block 7 — Vermögen ─────────────────────────────────────────
  if (f.bankkontoSaldo != null) {
    out.push({
      id: "vermoegen.bankkonto",
      feldLabel: "Neues Bankkonto hinzufügen",
      block: "Block 7 — Vermögen",
      aktuellerWert: "—",
      neuerWert: fmtChf(f.bankkontoSaldo),
      apply: (s) => {
        // Vermögensitem hinzufügen — der spätere Update-Schritt befüllt es
        s.addVermoegen("konto");
        // Hinweis: Beschreibung + Saldo werden manuell vom User ergänzt;
        // V1-Heuristik: wir lassen den Add stehen, User benennt es.
      },
    });
  }
  if (f.depotSaldo != null) {
    out.push({
      id: "vermoegen.depot",
      feldLabel: "Neues Depot hinzufügen",
      block: "Block 7 — Vermögen",
      aktuellerWert: "—",
      neuerWert: fmtChf(f.depotSaldo),
      apply: (s) => {
        s.addVermoegen("depot");
      },
    });
  }

  return out;
}

/**
 * Hilfsfunktion: zählt wie viele Felder pro Block einen Vorschlag haben.
 */
export function vorschlaegeNachBlock(
  vorschlaege: Vorschlag[]
): { block: string; anzahl: number }[] {
  const map = new Map<string, number>();
  for (const v of vorschlaege) {
    map.set(v.block, (map.get(v.block) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([block, anzahl]) => ({
    block,
    anzahl,
  }));
}

/** Hilfsfunktion: alle Vorschläge auf einmal anwenden. */
export function alleVorschlaegeAnwenden(
  vorschlaege: Vorschlag[],
  store: PlanStoreActions
): void {
  for (const v of vorschlaege) v.apply(store);
}

// Helper: extrahiert die Felder, falls man direkt durch will
export type ExtractFeld = keyof ExtractedFelder;
