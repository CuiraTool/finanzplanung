/**
 * Vermögensbilanz — kombinierte Quick-Engine für die drei Stichtage
 * heute / Pensionierung / 20 Jahre nach Pensionierung.
 *
 * BEWUSSTE VEREINFACHUNGEN (Etappe 1):
 *   - Block 7 verzinst sich mit der eingegebenen Rendite jedes Items.
 *   - Immobilien-Netto bleibt zum aktuellen Verkehrswert konstant
 *     (keine Wertsteigerung, keine Hypothek-Amortisation modelliert).
 *   - PK-Saldo: bei Pensionierung gemäss Bezugspräferenz aufgeteilt;
 *     Kapitalanteil fliesst ins Vermögen, Rentenanteil fliesst als Cashflow.
 *   - Renten und Mieteinnahmen werden im Lebensabschnitt 65→85 linear
 *     hochgerechnet (kein Kapitalverbrauch innerhalb der Rentenphase modelliert).
 *   - Inflation und Steuern werden ignoriert.
 *
 * Eine ehrliche Jahres-Iteration mit Steuern, Inflation, Eigenmietwert,
 * GGSt und detaillierter PK-Auszahlungslogik kommt mit der vollen Cashflow-
 * Engine in Etappe 2.
 */

import type {
  PlanState,
  Immobilie,
  VermoegenItem,
  BvgPersonInput,
  FreizuegigkeitEntry,
  SaeuleDreiEntry,
} from "@/lib/store";

/**
 * Subset von PlanState mit den Daten-Slices, die die Bilanz braucht —
 * ohne Setter. Erlaubt es dem Caller (Dashboard), nur die relevanten
 * Slices zu selektieren statt den ganzen Store.
 */
export type VermoegensbilanzInput = Pick<
  PlanState,
  | "fallart"
  | "person1"
  | "person2"
  | "ahv"
  | "bvg"
  | "saeuleDrei"
  | "vermoegen"
  | "immobilien"
  | "firma"
  | "ziele"
  | "budget"
>;
import {
  ahvJahresrenteEinzel,
  ahvCouplePension,
  ORDENTLICHES_AHV_ALTER,
  MAX_VORBEZUG_JAHRE,
  MAX_AUFSCHUB_JAHRE,
} from "./ahv";
import { bvgBezug, bvgGesamtkapitalBeiBezug } from "./bvg";
import { saeuleDreiAuszahlung } from "./saeule3";
import { pensionsjahr } from "@/lib/pension";

const PENSIONS_DAUER_JAHRE = 20; // 65 → 85

export interface VermoegensbilanzOutput {
  heute: number;
  beiPensionierung: number;
  pensionierungsjahr: number | null;
  zwanzig20JahreSpaeter: number;
  zwanzigJahreReferenzjahr: number | null;
}

export function vermoegensbilanz(state: VermoegensbilanzInput): VermoegensbilanzOutput {
  const refJahr = referenzPensionsjahr(state);

  const heute = nettovermoegenHeute(state);
  const beiPension = refJahr != null ? nettovermoegenAnJahr(state, refJahr) : heute;
  const refJahr85 = refJahr != null ? refJahr + PENSIONS_DAUER_JAHRE : null;
  const mit85 =
    refJahr != null && refJahr85 != null
      ? beiPension +
        PENSIONS_DAUER_JAHRE * jaehrlicherCashflowInPension(state, refJahr)
      : heute;

  return {
    heute,
    beiPensionierung: Math.round(beiPension),
    pensionierungsjahr: refJahr,
    zwanzig20JahreSpaeter: Math.round(mit85),
    zwanzigJahreReferenzjahr: refJahr85,
  };
}

/** Pensionierungs-Referenzjahr: spätestes Pensionsjahr im Haushalt. */
function referenzPensionsjahr(state: VermoegensbilanzInput): number | null {
  const j1 = pensionsjahr(state.person1.geburtsdatum, state.ziele.bezugsalterP1);
  if (state.fallart === "einzel") return j1;
  const j2 = pensionsjahr(state.person2.geburtsdatum, state.ziele.bezugsalterP2);
  if (j1 == null) return j2;
  if (j2 == null) return j1;
  return Math.max(j1, j2);
}

/** Aktuelles Nettovermögen heute — Summe aller eingegebenen Vermögenspositionen. */
export function nettovermoegenHeute(state: VermoegensbilanzInput): number {
  let total = 0;
  total += vermoegenBlock7Heute(state.vermoegen.items);
  total += immobilienNettoHeute(state.immobilien.items);
  total += pkAltersguthabenHeute(state.bvg.p1);
  total += freizuegigkeitenHeute(state.bvg.p1.freizuegigkeit);
  total += saeuleDreiHeute(state.saeuleDrei.p1);
  if (state.fallart === "paar") {
    total += pkAltersguthabenHeute(state.bvg.p2);
    total += freizuegigkeitenHeute(state.bvg.p2.freizuegigkeit);
    total += saeuleDreiHeute(state.saeuleDrei.p2);
  }
  if (state.firma.vorhanden && state.firma.moeglicherVerkaufserloes != null) {
    total += state.firma.moeglicherVerkaufserloes;
  }
  return Math.round(total);
}

/** Nettovermögen an einem zukünftigen Stichtag (z.B. Pensionierungsjahr). */
function nettovermoegenAnJahr(state: VermoegensbilanzInput, zieljahr: number): number {
  const jetzt = new Date().getFullYear();
  const jahre = Math.max(0, zieljahr - jetzt);

  let total = 0;

  // Block 7: jeder Posten verzinst mit seiner Rendite
  for (const it of state.vermoegen.items) {
    if (it.saldoHeute == null) continue;
    const sign = it.typ === "darlehen" ? -1 : 1;
    total += sign * it.saldoHeute * Math.pow(1 + it.renditeProzent / 100, jahre);
  }

  // Immobilien — Verkauf vor Stichtag: Netto-Erlös bleibt; sonst Netto-Wert konstant
  for (const im of state.immobilien.items) {
    if (im.verkehrswert == null) continue;
    const hypo = im.hypotheken.reduce((s, h) => s + (h.hoehe ?? 0), 0);
    total += im.verkehrswert - hypo;
  }

  // PK — bei Bezug wird Kapitalanteil zum Vermögen, Rentenanteil ist Cashflow
  total += pkBeiBezug(state.bvg.p1, state.person1.geburtsdatum, state.ziele.bezugsalterP1, zieljahr, "kapital");
  if (state.fallart === "paar") {
    total += pkBeiBezug(state.bvg.p2, state.person2.geburtsdatum, state.ziele.bezugsalterP2, zieljahr, "kapital");
  }

  // Freizügigkeit, 3a — alle bis Stichtag fälligen Auszahlungen
  total += freizuegigkeitenBisJahr(state.bvg.p1.freizuegigkeit, zieljahr, jetzt);
  total += saeuleDreiBisJahr(state.saeuleDrei.p1, zieljahr, jetzt);
  if (state.fallart === "paar") {
    total += freizuegigkeitenBisJahr(state.bvg.p2.freizuegigkeit, zieljahr, jetzt);
    total += saeuleDreiBisJahr(state.saeuleDrei.p2, zieljahr, jetzt);
  }

  // Firma: bei Plan "verkaufen" und Verkauf bis Stichtag fliesst Erlös
  if (state.firma.vorhanden && state.firma.plan === "verkaufen" && state.firma.moeglicherVerkaufserloes != null) {
    if (state.firma.verkaufsjahr <= zieljahr) {
      total += state.firma.moeglicherVerkaufserloes;
    }
  } else if (state.firma.vorhanden && state.firma.moeglicherVerkaufserloes != null) {
    total += state.firma.moeglicherVerkaufserloes;
  }

  return total;
}

/** Jährlicher Cashflow während der Pensionsphase: Renten + Mieten − Verbrauch. */
function jaehrlicherCashflowInPension(state: VermoegensbilanzInput, refJahr: number): number {
  const ahvHaushalt = ahvJahresrenteHaushalt(state, refJahr);
  const bvgHaushalt = bvgJahresrenteHaushalt(state);
  const mieten = mieteinnahmenJahresHaushalt(state, refJahr);
  const ausgaben = jaehrlicheAusgaben(state);
  return ahvHaushalt + bvgHaushalt + mieten - ausgaben;
}

function ahvJahresrenteHaushalt(state: VermoegensbilanzInput, refJahr: number): number {
  const e1 = state.ahv.einkommenP1;
  if (e1 == null) return 0;
  const fehljahreP1 = state.ahv.hatFehljahreP1 ? state.ahv.fehljahreAnzahlP1 : 0;
  const bezugsalterP1 = clampAhvAlter(state.ahv.ahvBezugsalterP1);
  const bezugsjahrP1 = pensionsjahr(state.person1.geburtsdatum, bezugsalterP1) ?? refJahr;

  if (state.fallart === "einzel") {
    return ahvJahresrenteEinzel({
      massgebendesEinkommen: e1,
      fehljahre: fehljahreP1,
      bezugsalter: bezugsalterP1,
      bezugsjahr: bezugsjahrP1,
    }).jahresrente;
  }

  const e2 = state.ahv.einkommenP2;
  if (e2 == null) return 0;
  const fehljahreP2 = state.ahv.hatFehljahreP2 ? state.ahv.fehljahreAnzahlP2 : 0;
  const bezugsalterP2 = clampAhvAlter(state.ahv.ahvBezugsalterP2);
  const bezugsjahrP2 = pensionsjahr(state.person2.geburtsdatum, bezugsalterP2) ?? refJahr;
  const refBezugsjahr = Math.max(bezugsjahrP1, bezugsjahrP2);

  return ahvCouplePension({
    einkommenP1: e1,
    einkommenP2: e2,
    fehljahreP1,
    fehljahreP2,
    bezugsalterP1,
    bezugsalterP2,
    bezugsjahr: refBezugsjahr,
  }).haushaltsRente;
}

function bvgJahresrenteHaushalt(state: VermoegensbilanzInput): number {
  let total = 0;
  for (const personIdx of [1, 2] as const) {
    if (personIdx === 2 && state.fallart !== "paar") continue;
    const p = personIdx === 1 ? state.bvg.p1 : state.bvg.p2;
    if (!p.aktiverAnschluss || p.altersguthabenBeiBezug == null) continue;
    if (p.bezugspraeferenz === "kapital") continue;
    const geburt = personIdx === 1 ? state.person1.geburtsdatum : state.person2.geburtsdatum;
    const bezugsalter = personIdx === 1 ? state.ziele.bezugsalterP1 : state.ziele.bezugsalterP2;
    const bj = pensionsjahr(geburt, bezugsalter) ?? new Date().getFullYear();
    const ekGueltig = p.einkaeufe
      .filter((e) => e.betrag != null)
      .map((e) => ({ jahr: e.jahr, betrag: e.betrag as number }));
    const saldo = bvgGesamtkapitalBeiBezug({
      altersguthabenBeiBezug: p.altersguthabenBeiBezug,
      bezugsjahr: bj,
      einkaeufe: ekGueltig,
    });
    const out = bvgBezug({
      saldoBeiBezug: saldo,
      bezugspraeferenz: p.bezugspraeferenz,
      kapitalanteilProzent: p.kapitalanteil,
      umwandlungssatz: p.umwandlungssatzProzent / 100,
    });
    total += out.jahresrente;
  }
  return total;
}

function mieteinnahmenJahresHaushalt(state: VermoegensbilanzInput, refJahr: number): number {
  let total = 0;
  for (const im of state.immobilien.items) {
    if (im.typ !== "rendite") continue;
    if (im.jaehrlicheMieteinnahmen == null) continue;
    if (im.plan === "verkaufen" && im.verkaufsjahr <= refJahr) continue;
    total += im.jaehrlicheMieteinnahmen;
  }
  return total;
}

function jaehrlicheAusgaben(state: VermoegensbilanzInput): number {
  const wunsch = state.budget.wunschverbrauchPension;
  if (wunsch != null) return wunsch * 12;
  const total = state.budget.ausgabenTotal;
  if (total != null) return total * 12;
  return 0;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function clampAhvAlter(alter: number): number {
  return Math.max(
    ORDENTLICHES_AHV_ALTER - MAX_VORBEZUG_JAHRE,
    Math.min(ORDENTLICHES_AHV_ALTER + MAX_AUFSCHUB_JAHRE, alter)
  );
}

function vermoegenBlock7Heute(items: VermoegenItem[]): number {
  let total = 0;
  for (const it of items) {
    if (it.saldoHeute == null) continue;
    total += it.typ === "darlehen" ? -it.saldoHeute : it.saldoHeute;
  }
  return total;
}

function immobilienNettoHeute(items: Immobilie[]): number {
  let total = 0;
  for (const im of items) {
    if (im.verkehrswert == null) continue;
    const hypo = im.hypotheken.reduce((s, h) => s + (h.hoehe ?? 0), 0);
    total += im.verkehrswert - hypo;
  }
  return total;
}

function pkAltersguthabenHeute(p: BvgPersonInput): number {
  if (!p.aktiverAnschluss || p.altersguthabenHeute == null) return 0;
  return p.altersguthabenHeute;
}

function freizuegigkeitenHeute(items: FreizuegigkeitEntry[]): number {
  return items.reduce((s, fz) => s + (fz.saldoHeute ?? 0), 0);
}

function saeuleDreiHeute(items: SaeuleDreiEntry[]): number {
  let total = 0;
  for (const it of items) {
    if (it.type === "konto" && it.aktuellerWert != null) total += it.aktuellerWert;
    else if (it.type === "versicherung" && it.rueckkaufswert != null)
      total += it.rueckkaufswert;
  }
  return total;
}

function pkBeiBezug(
  p: BvgPersonInput,
  geburt: string,
  bezugsalter: number,
  zieljahr: number,
  was: "kapital" | "rente"
): number {
  if (!p.aktiverAnschluss || p.altersguthabenBeiBezug == null) return 0;
  const bj = pensionsjahr(geburt, bezugsalter) ?? zieljahr;
  if (zieljahr < bj) {
    // PK noch nicht bezogen → aktuelles Altersguthaben heute zählt
    return p.altersguthabenHeute ?? 0;
  }
  const ekGueltig = p.einkaeufe
    .filter((e) => e.betrag != null)
    .map((e) => ({ jahr: e.jahr, betrag: e.betrag as number }));
  const saldo = bvgGesamtkapitalBeiBezug({
    altersguthabenBeiBezug: p.altersguthabenBeiBezug,
    bezugsjahr: bj,
    einkaeufe: ekGueltig,
  });
  const out = bvgBezug({
    saldoBeiBezug: saldo,
    bezugspraeferenz: p.bezugspraeferenz,
    kapitalanteilProzent: p.kapitalanteil,
    umwandlungssatz: p.umwandlungssatzProzent / 100,
  });
  return was === "kapital" ? out.kapitalauszahlung : out.jahresrente;
}

function freizuegigkeitenBisJahr(
  items: FreizuegigkeitEntry[],
  zieljahr: number,
  jetzt: number
): number {
  let total = 0;
  for (const fz of items) {
    if (fz.saldoHeute == null) continue;
    if (fz.auszahlungsjahr > zieljahr) {
      // noch nicht ausbezahlt — Saldo heute zählen
      total += fz.saldoHeute;
      continue;
    }
    const jahre = Math.max(0, fz.auszahlungsjahr - jetzt);
    total += fz.saldoHeute * Math.pow(1 + fz.renditeProzent / 100, jahre);
  }
  return total;
}

function saeuleDreiBisJahr(
  items: SaeuleDreiEntry[],
  zieljahr: number,
  jetzt: number
): number {
  let total = 0;
  for (const it of items) {
    const a = saeuleDreiAuszahlung(it, jetzt);
    if (a == null) continue;
    if (a.jahr > zieljahr) {
      // noch nicht ausbezahlt — aktueller Wert / Rückkaufswert
      if (it.type === "konto" && it.aktuellerWert != null) total += it.aktuellerWert;
      else if (it.type === "versicherung" && it.rueckkaufswert != null)
        total += it.rueckkaufswert;
      continue;
    }
    total += a.betrag;
  }
  return total;
}
