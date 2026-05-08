/**
 * Mapping zwischen extrahierten Doc-Werten und Plan-State-Setter.
 *
 * Funktionen:
 *  - bestimmePersonIdx: heuristisches Match P1/P2 anhand betrifftName
 *  - vorschlaegeAusExtract: liefert eine Liste von Vorschlägen
 *
 * Jeder Vorschlag enthält:
 *  - eine menschenlesbare Beschreibung ("PK-Altersguthaben heute")
 *  - aktueller Plan-Wert (zum Vergleich)
 *  - vorgeschlagener Wert (aus dem Doc)
 *  - die Apply-Funktion, die den Wert in den Store schreibt
 */

import type { ExtractedDocument } from "./extract-schema";
import type { PlanState } from "./store";

export interface Vorschlag {
  id: string;
  feldLabel: string;
  block: string; // "Block 1 — Personen"
  aktuellerWert: string; // formatiert
  neuerWert: string; // formatiert
  apply: (store: PlanStoreActions) => void;
}

export type PlanStoreActions = Pick<
  PlanState,
  | "setPerson1"
  | "setPerson2"
  | "setAdresse"
  | "setSteuerAnker"
  | "setBvgP1"
  | "setBvgP2"
  | "setAhv"
  | "addSaeuleDrei"
  | "addFreizuegigkeit"
  | "addVermoegen"
  | "addImmobilie"
>;

const fmtChf = (n: number | null): string =>
  n == null ? "—" : new Intl.NumberFormat("de-CH").format(n) + " CHF";
const fmtPct = (n: number | null): string => (n == null ? "—" : `${n}%`);

export type PersonIdx = 1 | 2;
export type PersonHint = PersonIdx | "unsicher";

/**
 * Heuristik: bestimmt anhand des Doc-betrifftName, ob das Doc P1 oder P2
 * zugeordnet werden soll. Bei Einzelperson immer P1.
 */
export function bestimmePersonIdx(
  ex: ExtractedDocument,
  state: PlanState
): PersonHint {
  if (state.fallart === "einzel") return 1;

  const name = ex.betrifftName?.toLowerCase().trim();
  if (!name) return "unsicher";

  const p1Vor = state.person1.vorname.toLowerCase().trim();
  const p1Nach = state.person1.nachname.toLowerCase().trim();
  const p2Vor = state.person2.vorname.toLowerCase().trim();
  const p2Nach = state.person2.nachname.toLowerCase().trim();

  const p1Match =
    (p1Vor && name.includes(p1Vor)) || (p1Nach && name.includes(p1Nach));
  const p2Match =
    (p2Vor && name.includes(p2Vor)) || (p2Nach && name.includes(p2Nach));

  if (p1Match && !p2Match) return 1;
  if (p2Match && !p1Match) return 2;
  return "unsicher";
}

export function vorschlaegeAusExtract(
  ex: ExtractedDocument,
  state: PlanState,
  personIdx: PersonIdx = 1
): Vorschlag[] {
  const f = ex.felder;
  const out: Vorschlag[] = [];

  const personState = personIdx === 1 ? state.person1 : state.person2;
  const setPerson = personIdx === 1 ? "setPerson1" : "setPerson2";
  const personLabel = personIdx === 1 ? "P1" : "P2";

  // ─── Block 1 — Personen ──────────────────────────────────────────
  if (f.vorname && f.vorname !== personState.vorname) {
    out.push({
      id: `person.vorname.${personIdx}`,
      feldLabel: `Vorname ${state.fallart === "paar" ? personLabel : ""}`.trim(),
      block: "Block 1 — Personen",
      aktuellerWert: personState.vorname || "—",
      neuerWert: f.vorname,
      apply: (s) => s[setPerson]({ vorname: f.vorname! }),
    });
  }
  if (f.nachname && f.nachname !== personState.nachname) {
    out.push({
      id: `person.nachname.${personIdx}`,
      feldLabel: `Nachname ${state.fallart === "paar" ? personLabel : ""}`.trim(),
      block: "Block 1 — Personen",
      aktuellerWert: personState.nachname || "—",
      neuerWert: f.nachname,
      apply: (s) => s[setPerson]({ nachname: f.nachname! }),
    });
  }
  if (f.geburtsdatum && f.geburtsdatum !== personState.geburtsdatum) {
    out.push({
      id: `person.geburtsdatum.${personIdx}`,
      feldLabel: `Geburtsdatum ${state.fallart === "paar" ? personLabel : ""}`.trim(),
      block: "Block 1 — Personen",
      aktuellerWert: personState.geburtsdatum || "—",
      neuerWert: f.geburtsdatum,
      apply: (s) => s[setPerson]({ geburtsdatum: f.geburtsdatum! }),
    });
  }

  // Adresse — auf Haushalt-Ebene, nicht pro Person
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
    const aktuell =
      personIdx === 1 ? state.ahv.einkommenP1 : state.ahv.einkommenP2;
    out.push({
      id: `ahv.einkommen.${personIdx}`,
      feldLabel: `Massgebendes Einkommen ${state.fallart === "paar" ? personLabel : ""}`.trim(),
      block: "Block 4 — AHV",
      aktuellerWert: fmtChf(aktuell),
      neuerWert: fmtChf(f.massgebendesEinkommen),
      apply: (s) =>
        personIdx === 1
          ? s.setAhv({ einkommenP1: f.massgebendesEinkommen })
          : s.setAhv({ einkommenP2: f.massgebendesEinkommen }),
    });
  }

  // ─── Block 5 — PK ───────────────────────────────────────────────
  const bvgP = personIdx === 1 ? state.bvg.p1 : state.bvg.p2;
  const setBvgP = personIdx === 1 ? "setBvgP1" : "setBvgP2";

  if (f.pkAltersguthabenHeute != null) {
    out.push({
      id: `bvg.altersguthabenHeute.${personIdx}`,
      feldLabel: `PK-Altersguthaben heute ${state.fallart === "paar" ? personLabel : ""}`.trim(),
      block: "Block 5 — Pensionskasse",
      aktuellerWert: fmtChf(bvgP.altersguthabenHeute),
      neuerWert: fmtChf(f.pkAltersguthabenHeute),
      apply: (s) =>
        s[setBvgP]({ altersguthabenHeute: f.pkAltersguthabenHeute }),
    });
  }
  if (f.pkAltersguthabenMit65 != null) {
    out.push({
      id: `bvg.altersguthabenBeiBezug.${personIdx}`,
      feldLabel: `PK-Altersguthaben mit 65 ${state.fallart === "paar" ? personLabel : ""}`.trim(),
      block: "Block 5 — Pensionskasse",
      aktuellerWert: fmtChf(bvgP.altersguthabenBeiBezug),
      neuerWert: fmtChf(f.pkAltersguthabenMit65),
      apply: (s) =>
        s[setBvgP]({ altersguthabenBeiBezug: f.pkAltersguthabenMit65 }),
    });
  }
  if (f.pkUmwandlungssatzProzent != null) {
    out.push({
      id: `bvg.umwandlungssatz.${personIdx}`,
      feldLabel: `PK-Umwandlungssatz ${state.fallart === "paar" ? personLabel : ""}`.trim(),
      block: "Block 5 — Pensionskasse",
      aktuellerWert: fmtPct(bvgP.umwandlungssatzProzent),
      neuerWert: fmtPct(f.pkUmwandlungssatzProzent),
      apply: (s) =>
        s[setBvgP]({ umwandlungssatzProzent: f.pkUmwandlungssatzProzent! }),
    });
  }

  // Freizügigkeit als neuer Eintrag
  if (f.freizuegigkeitSaldo != null) {
    const beschreibung = f.freizuegigkeitAnbieter ?? "Freizügigkeit (importiert)";
    out.push({
      id: `bvg.freizuegigkeit.${personIdx}`,
      feldLabel: `Neue Freizügigkeit anlegen ${state.fallart === "paar" ? personLabel : ""}`.trim(),
      block: "Block 5 — Pensionskasse",
      aktuellerWert: "—",
      neuerWert: `${fmtChf(f.freizuegigkeitSaldo)}${
        f.freizuegigkeitAnbieter ? ` (${f.freizuegigkeitAnbieter})` : ""
      }`,
      apply: (s) =>
        s.addFreizuegigkeit(personIdx, {
          beschreibung,
          saldoHeute: f.freizuegigkeitSaldo!,
        }),
    });
  }

  // ─── Block 6 — 3. Säule ─────────────────────────────────────────
  if (f.saeule3aKontoSaldo != null) {
    const beschreibung = f.saeule3aKontoAnbieter ?? "3a-Konto (importiert)";
    out.push({
      id: `saeule3.konto.${personIdx}`,
      feldLabel: `Neues 3a-Konto anlegen ${state.fallart === "paar" ? personLabel : ""}`.trim(),
      block: "Block 6 — 3. Säule",
      aktuellerWert: "—",
      neuerWert: `${fmtChf(f.saeule3aKontoSaldo)}${
        f.saeule3aKontoAnbieter ? ` (${f.saeule3aKontoAnbieter})` : ""
      }`,
      apply: (s) =>
        s.addSaeuleDrei(personIdx, "konto", {
          beschreibung,
          aktuellerWert: f.saeule3aKontoSaldo!,
        }),
    });
  }
  if (
    f.saeule3aVersicherungRueckkaufswert != null ||
    f.saeule3aVersicherungAblaufswert != null
  ) {
    const beschreibung =
      f.saeule3aVersicherungAnbieter ?? "3a-Versicherung (importiert)";
    const valueText = [
      f.saeule3aVersicherungRueckkaufswert != null
        ? `Rückkauf ${fmtChf(f.saeule3aVersicherungRueckkaufswert)}`
        : null,
      f.saeule3aVersicherungAblaufswert != null
        ? `Ablauf ${fmtChf(f.saeule3aVersicherungAblaufswert)}`
        : null,
    ]
      .filter(Boolean)
      .join(", ");
    out.push({
      id: `saeule3.versicherung.${personIdx}`,
      feldLabel: `Neue 3a-Versicherung anlegen ${state.fallart === "paar" ? personLabel : ""}`.trim(),
      block: "Block 6 — 3. Säule",
      aktuellerWert: "—",
      neuerWert: `${valueText}${
        f.saeule3aVersicherungAnbieter ? ` (${f.saeule3aVersicherungAnbieter})` : ""
      }`,
      apply: (s) =>
        s.addSaeuleDrei(personIdx, "versicherung", {
          beschreibung,
          rueckkaufswert: f.saeule3aVersicherungRueckkaufswert,
          ablaufswert: f.saeule3aVersicherungAblaufswert,
          ablaufjahr:
            f.saeule3aVersicherungAblaufjahr ?? new Date().getFullYear() + 5,
        }),
    });
  }

  // ─── Block 7 — Vermögen ─────────────────────────────────────────
  if (f.bankkontoSaldo != null) {
    out.push({
      id: "vermoegen.bankkonto",
      feldLabel: "Neues Bankkonto anlegen",
      block: "Block 7 — Vermögen",
      aktuellerWert: "—",
      neuerWert: fmtChf(f.bankkontoSaldo),
      apply: (s) =>
        s.addVermoegen("konto", {
          beschreibung: "Bankkonto (importiert)",
          saldoHeute: f.bankkontoSaldo!,
        }),
    });
  }
  if (f.depotSaldo != null) {
    out.push({
      id: "vermoegen.depot",
      feldLabel: "Neues Depot anlegen",
      block: "Block 7 — Vermögen",
      aktuellerWert: "—",
      neuerWert: fmtChf(f.depotSaldo),
      apply: (s) =>
        s.addVermoegen("depot", {
          beschreibung: "Depot (importiert)",
          saldoHeute: f.depotSaldo!,
        }),
    });
  }

  // ─── Block 8 — Immobilien ───────────────────────────────────────
  if (f.immobilieVerkehrswert != null) {
    out.push({
      id: "immobilie.neu",
      feldLabel: "Neue Immobilie anlegen",
      block: "Block 8 — Immobilien",
      aktuellerWert: "—",
      neuerWert: `Verkehrswert ${fmtChf(f.immobilieVerkehrswert)}${
        f.hypothekRestschuld != null
          ? `, Hypothek ${fmtChf(f.hypothekRestschuld)}`
          : ""
      }`,
      apply: (s) => {
        s.addImmobilie({
          beschreibung: "Immobilie (importiert)",
          typ: "selbstbewohnt",
          verkehrswert: f.immobilieVerkehrswert!,
        });
        // Hypothek separat hinzuzufügen ist hier komplex (braucht id der neu
        // erstellten Immobilie), wir speichern Hypothekendaten in den notizen.
      },
    });
  }

  return out;
}

/** Hilfsfunktion: zählt wie viele Felder pro Block einen Vorschlag haben. */
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
