/**
 * Cashflow-Engine V2 — Jahres-Iteration für Charts.
 *
 * Liefert pro Jahr eine Zeile mit Einnahmen / Ausgaben / Saldo / Vermögen
 * für den Zeitraum [vonJahr, bisJahr]. Konsumiert die einzelnen Engine-Module
 * (AHV, BVG, 3a, FZ, Immobilien, Firma) sowie die Steuer-Engine.
 *
 * Vereinfachungen Etappe 2 V1:
 *   - Erwerbseinkommen aus Einkommens-Perioden, monatlich → jährlich
 *   - AHV/BVG-Rente ab dem jeweiligen Bezugsjahr, konstant
 *   - Mieteinnahmen bis Verkaufsjahr (exklusiv), brutto
 *   - Kapitalauszahlungen (PK, 3a, FZ, Immobilienverkauf, Firma) im
 *     jeweiligen Auszahlungsjahr — fliessen einmalig ins Vermögen
 *   - Wunschverbrauch ab Pensionierung, vorher aktuelle Ausgaben
 *   - Steuern via steuerProJahr (Anker oder Default-Satz)
 *   - Vermögen wird Jahr für Jahr fortgeschrieben (Saldo + Kap.-Auszahlungen
 *     − Steuern aufs Kap.). Block 7 verzinst sich mit eigener Rendite.
 *
 * Bewusst nicht modelliert:
 *   - Inflation, Eigenmietwert, Schuldzinsabzug, GGSt, Kinderabzüge
 *   - Hypothek-Amortisation, Wertsteigerung Immobilien
 *   - Sterbetafel, partielle Pension (Pensumsreduktion)
 */

import type {
  PlanState,
  BvgPersonInput,
  Einkommensperiode,
  Immobilie,
  VermoegenItem,
  FreizuegigkeitEntry,
  SaeuleDreiEntry,
  FirmaInput,
} from "@/lib/store";
import {
  ahvJahresrenteEinzel,
  ahvCouplePension,
  ORDENTLICHES_AHV_ALTER,
  MAX_VORBEZUG_JAHRE,
  MAX_AUFSCHUB_JAHRE,
} from "./ahv";
import { bvgBezug, bvgGesamtkapitalBeiBezug, freizuegigkeitAuszahlung } from "./bvg";
import { saeuleDreiAuszahlung } from "./saeule3";
import { steuerProJahr } from "./steuer";
import { pensionsjahr } from "@/lib/pension";

export type CashflowInput = Pick<
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
  | "adresse"
  | "einmaligeAusgaben"
>;

export interface CashflowZeile {
  jahr: number;
  alterP1: number | null;
  alterP2: number | null;
  einnahmenErwerb: number;
  einnahmenAhv: number;
  einnahmenBvgRente: number;
  einnahmenMieten: number;
  einnahmenTotal: number;
  ausgabenHaushalt: number;
  ausgabenSteuern: number;
  ausgabenSteuernEinkommen: number;
  ausgabenSteuernVermoegen: number;
  ausgabenSteuernKapital: number;
  ausgabenEinmalig: number;
  ausgabenTotal: number;
  kapAuszahlungen: number;
  saldo: number;
  // Granular Vermögens-Komponenten (Snapshot zum Jahresende):
  vermoegenLiquiditaet: number; // Block 7 Konten + Hauptkonto-Saldo
  vermoegenWertschriften: number; // Block 7 Depots
  vermoegenVorsorge: number; // PK + 3a + FZ vor Auszahlung
  vermoegenImmobilien: number; // Verkehrswerte aller noch gehaltenen Liegenschaften
  vermoegenFirma: number; // Verkaufserlös wenn behalten, 0 nach Verkauf
  vermoegenSchulden: number; // Hypotheken (auf gehaltenen Liegenschaften) + Darlehen
  vermoegenAktiva: number; // Liquid + Wertschriften + Vorsorge + Immobilien + Firma
  vermoegenNetto: number; // Aktiva − Schulden
}

export function cashflowReihe(
  state: CashflowInput,
  vonJahr: number,
  bisJahr: number
): CashflowZeile[] {
  const result: CashflowZeile[] = [];

  // Vorab-Berechnungen
  const ahvBezugsjahrP1 = pensionsjahr(
    state.person1.geburtsdatum,
    clampAhvAlter(state.ahv.ahvBezugsalterP1)
  );
  const ahvBezugsjahrP2 =
    state.fallart === "paar"
      ? pensionsjahr(state.person2.geburtsdatum, clampAhvAlter(state.ahv.ahvBezugsalterP2))
      : null;
  const pkBezugsjahrP1 = pensionsjahr(state.person1.geburtsdatum, state.ziele.bezugsalterP1);
  const pkBezugsjahrP2 =
    state.fallart === "paar"
      ? pensionsjahr(state.person2.geburtsdatum, state.ziele.bezugsalterP2)
      : null;

  const ahvRenteHaushalt = computeAhvRente(state, ahvBezugsjahrP1, ahvBezugsjahrP2);
  const bvgRenteHaushalt = computeBvgRenteHaushalt(state);
  const bvgKapitalAuszahlungen = computeBvgKapitalAuszahlungen(state);

  // Per-Item Tracker für Block 7 — jedes Item hat seine eigene Rendite und
  // wird Jahr für Jahr fortgeschrieben. Hauptkonto bekommt zusätzlich den
  // Cashflow-Saldo + Kapitalauszahlungen.
  type Block7Tracker = { item: VermoegenItem; saldo: number };
  const block7: Block7Tracker[] = state.vermoegen.items.map((it) => ({
    item: it,
    saldo: it.saldoHeute ?? 0,
  }));
  const hauptkontoIdx = block7.findIndex((b) => b.item.istHauptkonto);

  for (let jahr = vonJahr; jahr <= bisJahr; jahr++) {
    const alterP1 = berechneAlter(state.person1.geburtsdatum, jahr);
    const alterP2 =
      state.fallart === "paar" ? berechneAlter(state.person2.geburtsdatum, jahr) : null;

    // ─── Einnahmen ────────────────────────────────────────────────
    const einnahmenErwerb = erwerbseinkommenJahr(state.budget.einkommen, jahr);

    let einnahmenAhv = 0;
    if (ahvBezugsjahrP1 != null && jahr >= ahvBezugsjahrP1) {
      einnahmenAhv += ahvRenteHaushalt.haushalt;
    } else if (
      state.fallart === "paar" &&
      ahvBezugsjahrP2 != null &&
      jahr >= ahvBezugsjahrP2
    ) {
      // Nur P2 ist pensioniert — vereinfacht: gleiche Rente wenn beide pensioniert wären, halbiert
      einnahmenAhv += ahvRenteHaushalt.haushalt / 2;
    }

    let einnahmenBvgRente = 0;
    if (pkBezugsjahrP1 != null && jahr >= pkBezugsjahrP1) {
      einnahmenBvgRente += bvgRenteHaushalt.p1;
    }
    if (
      state.fallart === "paar" &&
      pkBezugsjahrP2 != null &&
      jahr >= pkBezugsjahrP2
    ) {
      einnahmenBvgRente += bvgRenteHaushalt.p2;
    }

    const einnahmenMieten = mieteinnahmenJahr(state.immobilien.items, jahr);

    const einnahmenTotal =
      einnahmenErwerb + einnahmenAhv + einnahmenBvgRente + einnahmenMieten;

    // ─── Kapitalauszahlungen (einmalig im Jahr) ──────────────────
    const kapZeile = kapitalauszahlungenJahr(
      state,
      jahr,
      bvgKapitalAuszahlungen,
      pkBezugsjahrP1,
      pkBezugsjahrP2
    );
    const kapAuszahlungen = kapZeile;

    // ─── Ausgaben ────────────────────────────────────────────────
    const istPensioniert =
      pkBezugsjahrP1 != null && jahr >= pkBezugsjahrP1;
    const ausgabenHaushalt = haushaltsausgabenJahr(state.budget, istPensioniert);
    const ausgabenEinmalig = einmaligeAusgabenJahr(state.einmaligeAusgaben, jahr);

    // Vermögen vor Steuern (Stand Jahresanfang) — vereinfacht: Block-7-Saldi
    // VOR der Cashflow-Buchung in diesem Jahr, plus Immobilien minus Hypotheken.
    const block7AktivaJahresanfang = block7
      .filter((b) => b.item.typ !== "darlehen")
      .reduce((s, b) => s + b.saldo, 0);
    const block7DarlehenJahresanfang = block7
      .filter((b) => b.item.typ === "darlehen")
      .reduce((s, b) => s + b.saldo, 0);
    const immoJahresanfang = immobilienWertAmJahresende(
      state.immobilien.items,
      jahr - 1
    );
    const hypoJahresanfang = hypothekenAmJahresende(
      state.immobilien.items,
      jahr - 1
    );
    const vermoegenJahresanfang =
      block7AktivaJahresanfang +
      immoJahresanfang -
      block7DarlehenJahresanfang -
      hypoJahresanfang;

    const steuern = steuerProJahr({
      einkommenJahr: einnahmenErwerb + einnahmenMieten + einnahmenAhv + einnahmenBvgRente,
      vermoegenJahr: vermoegenJahresanfang,
      kapAuszahlungenJahr: kapAuszahlungen,
      kanton: state.adresse.kanton,
      religion: state.budget.religion,
      ankerSteuernHeute: state.budget.steuernHeute,
      ankerEinkommenHeute: state.budget.einkommenHeute,
    });
    const ausgabenSteuern = steuern.total;
    const ausgabenSteuernEinkommen = steuern.einkommen;
    const ausgabenSteuernVermoegen = steuern.vermoegen;
    const ausgabenSteuernKapital = steuern.kapital;

    const ausgabenTotal = ausgabenHaushalt + ausgabenSteuern + ausgabenEinmalig;

    // ─── Saldo ───────────────────────────────────────────────────
    const saldo = einnahmenTotal - ausgabenTotal;

    // ─── Vermögens-Update: pro Bucket fortschreiben ─────────────
    // 1. Block 7: jedes Item mit eigener Rendite verzinsen
    for (const b of block7) {
      b.saldo *= 1 + b.item.renditeProzent / 100;
    }
    // 2. Hauptkonto bekommt Cashflow-Saldo + Kapitalauszahlungen aus Vorsorge/
    //    Immo-Verkauf/Firma-Verkauf
    if (hauptkontoIdx >= 0) {
      const hk = block7[hauptkontoIdx]!;
      hk.saldo += saldo + kapAuszahlungen;
    }

    // 3. Snapshot: Liquidität / Wertschriften / Schulden aus Block 7
    let vermoegenLiquiditaet = 0;
    let vermoegenWertschriften = 0;
    let darlehenStand = 0;
    for (const b of block7) {
      if (b.item.typ === "konto") vermoegenLiquiditaet += b.saldo;
      else if (b.item.typ === "depot") vermoegenWertschriften += b.saldo;
      else if (b.item.typ === "darlehen") darlehenStand += b.saldo;
    }

    // 4. Vorsorge-Bucket: PK + 3a + FZ — alle, die noch nicht ausbezahlt sind
    const vermoegenVorsorge = vorsorgeVermoegenAmJahresende(
      state,
      jahr,
      pkBezugsjahrP1,
      pkBezugsjahrP2,
      bvgKapitalAuszahlungen
    );

    // 5. Immobilien-Bucket: noch gehaltene Liegenschaften (vor Verkaufsjahr)
    const vermoegenImmobilien = immobilienWertAmJahresende(
      state.immobilien.items,
      jahr
    );

    // 6. Firma-Bucket: möglicher Verkaufserlös solange noch nicht verkauft
    const vermoegenFirma = firmaWertAmJahresende(state.firma, jahr);

    // 7. Schulden: Hypotheken auf noch gehaltenen Liegenschaften + Darlehen
    const hypothekenStand = hypothekenAmJahresende(state.immobilien.items, jahr);
    const vermoegenSchulden = hypothekenStand + darlehenStand;

    const vermoegenAktiva =
      vermoegenLiquiditaet +
      vermoegenWertschriften +
      vermoegenVorsorge +
      vermoegenImmobilien +
      vermoegenFirma;
    const vermoegenNetto = vermoegenAktiva - vermoegenSchulden;

    result.push({
      jahr,
      alterP1,
      alterP2,
      einnahmenErwerb: Math.round(einnahmenErwerb),
      einnahmenAhv: Math.round(einnahmenAhv),
      einnahmenBvgRente: Math.round(einnahmenBvgRente),
      einnahmenMieten: Math.round(einnahmenMieten),
      einnahmenTotal: Math.round(einnahmenTotal),
      ausgabenHaushalt: Math.round(ausgabenHaushalt),
      ausgabenSteuern: Math.round(ausgabenSteuern),
      ausgabenSteuernEinkommen: Math.round(ausgabenSteuernEinkommen),
      ausgabenSteuernVermoegen: Math.round(ausgabenSteuernVermoegen),
      ausgabenSteuernKapital: Math.round(ausgabenSteuernKapital),
      ausgabenEinmalig: Math.round(ausgabenEinmalig),
      ausgabenTotal: Math.round(ausgabenTotal),
      kapAuszahlungen: Math.round(kapAuszahlungen),
      saldo: Math.round(saldo),
      vermoegenLiquiditaet: Math.round(vermoegenLiquiditaet),
      vermoegenWertschriften: Math.round(vermoegenWertschriften),
      vermoegenVorsorge: Math.round(vermoegenVorsorge),
      vermoegenImmobilien: Math.round(vermoegenImmobilien),
      vermoegenFirma: Math.round(vermoegenFirma),
      vermoegenSchulden: Math.round(vermoegenSchulden),
      vermoegenAktiva: Math.round(vermoegenAktiva),
      vermoegenNetto: Math.round(vermoegenNetto),
    });
  }

  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────

function clampAhvAlter(alter: number): number {
  return Math.max(
    ORDENTLICHES_AHV_ALTER - MAX_VORBEZUG_JAHRE,
    Math.min(ORDENTLICHES_AHV_ALTER + MAX_AUFSCHUB_JAHRE, alter)
  );
}

function berechneAlter(geburtsdatum: string, jahr: number): number | null {
  if (!geburtsdatum) return null;
  const geburtsjahr = Number.parseInt(geburtsdatum.slice(0, 4), 10);
  if (!Number.isFinite(geburtsjahr)) return null;
  return jahr - geburtsjahr;
}

function erwerbseinkommenJahr(perioden: Einkommensperiode[], jahr: number): number {
  let total = 0;
  for (const p of perioden) {
    if (p.betragMonatlich == null) continue;
    const von = parseYearMonth(p.von);
    const bis = parseYearMonth(p.bis);
    // Anzahl aktive Monate in `jahr`
    const aktivMonate = aktiveMonateImJahr(jahr, von, bis);
    total += p.betragMonatlich * aktivMonate;
  }
  return total;
}

function parseYearMonth(s: string): { jahr: number; monat: number } | null {
  if (!s) return null;
  const [j, m] = s.split("-").map(Number);
  if (!j || !m) return null;
  return { jahr: j, monat: m };
}

function aktiveMonateImJahr(
  jahr: number,
  von: { jahr: number; monat: number } | null,
  bis: { jahr: number; monat: number } | null
): number {
  // Default: ganzes Jahr
  let startMonat = 1;
  let endMonat = 12;

  if (von) {
    if (jahr < von.jahr) return 0;
    if (jahr === von.jahr) startMonat = von.monat;
  }

  if (bis) {
    if (jahr > bis.jahr) return 0;
    if (jahr === bis.jahr) endMonat = bis.monat;
  }

  return Math.max(0, endMonat - startMonat + 1);
}

function computeAhvRente(
  state: CashflowInput,
  bezugsjahrP1: number | null,
  bezugsjahrP2: number | null
): { haushalt: number } {
  const e1 = state.ahv.einkommenP1;
  if (e1 == null) return { haushalt: 0 };
  const fehljahreP1 = state.ahv.hatFehljahreP1 ? state.ahv.fehljahreAnzahlP1 : 0;
  const bezugsalterP1 = clampAhvAlter(state.ahv.ahvBezugsalterP1);

  if (state.fallart === "einzel") {
    const r = ahvJahresrenteEinzel({
      massgebendesEinkommen: e1,
      fehljahre: fehljahreP1,
      bezugsalter: bezugsalterP1,
      bezugsjahr: bezugsjahrP1 ?? new Date().getFullYear(),
    });
    return { haushalt: r.jahresrente };
  }

  const e2 = state.ahv.einkommenP2;
  if (e2 == null) return { haushalt: 0 };
  const fehljahreP2 = state.ahv.hatFehljahreP2 ? state.ahv.fehljahreAnzahlP2 : 0;
  const bezugsalterP2 = clampAhvAlter(state.ahv.ahvBezugsalterP2);
  const refJahr = Math.max(
    bezugsjahrP1 ?? new Date().getFullYear(),
    bezugsjahrP2 ?? new Date().getFullYear()
  );
  const out = ahvCouplePension({
    einkommenP1: e1,
    einkommenP2: e2,
    fehljahreP1,
    fehljahreP2,
    bezugsalterP1,
    bezugsalterP2,
    bezugsjahr: refJahr,
  });
  return { haushalt: out.haushaltsRente };
}

function computeBvgRenteHaushalt(state: CashflowInput): { p1: number; p2: number } {
  return {
    p1: bvgRentePerson(state.bvg.p1, state.person1.geburtsdatum, state.ziele.bezugsalterP1),
    p2:
      state.fallart === "paar"
        ? bvgRentePerson(state.bvg.p2, state.person2.geburtsdatum, state.ziele.bezugsalterP2)
        : 0,
  };
}

function bvgRentePerson(
  p: BvgPersonInput,
  geburt: string,
  bezugsalter: number
): number {
  if (!p.aktiverAnschluss || p.altersguthabenBeiBezug == null) return 0;
  if (p.bezugspraeferenz === "kapital") return 0;
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
  return out.jahresrente;
}

function computeBvgKapitalAuszahlungen(
  state: CashflowInput
): { p1: { jahr: number | null; betrag: number }; p2: { jahr: number | null; betrag: number } } {
  return {
    p1: bvgKapitalPerson(state.bvg.p1, state.person1.geburtsdatum, state.ziele.bezugsalterP1),
    p2:
      state.fallart === "paar"
        ? bvgKapitalPerson(
            state.bvg.p2,
            state.person2.geburtsdatum,
            state.ziele.bezugsalterP2
          )
        : { jahr: null, betrag: 0 },
  };
}

function bvgKapitalPerson(
  p: BvgPersonInput,
  geburt: string,
  bezugsalter: number
): { jahr: number | null; betrag: number } {
  if (!p.aktiverAnschluss || p.altersguthabenBeiBezug == null)
    return { jahr: null, betrag: 0 };
  if (p.bezugspraeferenz === "rente") return { jahr: null, betrag: 0 };
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
  return { jahr: bj, betrag: out.kapitalauszahlung };
}

function mieteinnahmenJahr(items: Immobilie[], jahr: number): number {
  let total = 0;
  for (const im of items) {
    if (im.typ !== "rendite") continue;
    if (im.jaehrlicheMieteinnahmen == null) continue;
    if (im.plan === "verkaufen" && jahr >= im.verkaufsjahr) continue;
    total += im.jaehrlicheMieteinnahmen;
  }
  return total;
}

function kapitalauszahlungenJahr(
  state: CashflowInput,
  jahr: number,
  bvgKap: ReturnType<typeof computeBvgKapitalAuszahlungen>,
  _pkBjP1: number | null,
  _pkBjP2: number | null
): number {
  let total = 0;

  // PK-Kapitalauszahlung
  if (bvgKap.p1.jahr === jahr) total += bvgKap.p1.betrag;
  if (bvgKap.p2.jahr === jahr) total += bvgKap.p2.betrag;

  // 3a-Auszahlungen
  for (const items of [state.saeuleDrei.p1, state.saeuleDrei.p2]) {
    for (const it of items) {
      const a = saeuleDreiAuszahlung(it);
      if (a && a.jahr === jahr) total += a.betrag;
    }
  }

  // FZ-Auszahlungen
  for (const fz of [...state.bvg.p1.freizuegigkeit, ...state.bvg.p2.freizuegigkeit]) {
    if (fz.saldoHeute == null) continue;
    if (fz.auszahlungsjahr !== jahr) continue;
    const a = freizuegigkeitAuszahlung({
      saldoHeute: fz.saldoHeute,
      auszahlungsjahr: fz.auszahlungsjahr,
      renditeProzent: fz.renditeProzent,
    });
    total += a.betrag;
  }

  // Immobilien-Verkauf
  for (const im of state.immobilien.items) {
    if (im.plan !== "verkaufen") continue;
    if (im.verkaufsjahr !== jahr) continue;
    if (im.verkehrswert == null) continue;
    const hypo = im.hypotheken.reduce((s, h) => s + (h.hoehe ?? 0), 0);
    total += im.verkehrswert - hypo;
  }

  // Firma-Verkauf
  if (
    state.firma.vorhanden &&
    state.firma.plan === "verkaufen" &&
    state.firma.verkaufsjahr === jahr &&
    state.firma.moeglicherVerkaufserloes != null
  ) {
    total += state.firma.moeglicherVerkaufserloes;
  }

  return total;
}

function haushaltsausgabenJahr(budget: CashflowInput["budget"], istPensioniert: boolean): number {
  if (istPensioniert && budget.wunschverbrauchPension != null) {
    return budget.wunschverbrauchPension * 12;
  }
  if (budget.ausgabenModus === "total" && budget.ausgabenTotal != null) {
    return budget.ausgabenTotal * 12;
  }
  if (budget.ausgabenModus === "detailliert") {
    const sum = Object.values(budget.ausgabenKategorien).reduce(
      (s, v) => s + (v ?? 0),
      0
    );
    return sum * 12;
  }
  return 0;
}

function einmaligeAusgabenJahr(
  ausgaben: CashflowInput["einmaligeAusgaben"],
  jahr: number
): number {
  let total = 0;
  for (const a of ausgaben) {
    if (a.jahr === jahr && a.betrag != null) total += a.betrag;
  }
  return total;
}

// ─── Bucket-Helper für die Vermögens-Granularisierung ──────────────

/**
 * Vorsorge-Bucket = nicht ausbezahlte PK + 3a + FZ.
 * - PK: vor Bezugsjahr → altersguthabenHeute (oder nichts wenn nicht angegeben);
 *       nach Bezug → 0 bei reinem Kapital, sonst geht Rente in Cashflow ein
 *       (Saldo aus Vorsorge "rausgeflossen"). Vereinfacht: ab Bezugsjahr 0.
 * - 3a-Konto: vor auszahlungsjahr → aktuellerWert × Rendite^(jahr - jetzt);
 *             ab Auszahlungsjahr → 0 (ist auf Hauptkonto via kapAuszahlungen).
 * - 3a-Versicherung: vor ablaufjahr → rueckkaufswert (oder ablaufswert wenn vorh.);
 *                    ab ablaufjahr → 0.
 * - FZ: vor Auszahlungsjahr → saldoHeute × Rendite^(jahr - jetzt);
 *       ab Auszahlungsjahr → 0.
 */
function vorsorgeVermoegenAmJahresende(
  state: CashflowInput,
  jahr: number,
  pkBezugsjahrP1: number | null,
  pkBezugsjahrP2: number | null,
  bvgKap: ReturnType<typeof computeBvgKapitalAuszahlungen>
): number {
  let total = 0;
  const jetzt = new Date().getFullYear();

  // PK: aktuelles Altersguthaben heute (informativ) bis Bezugsjahr,
  // danach 0 (Kapital ist auf Hauptkonto, Rente fliesst als Cashflow).
  if (state.bvg.p1.aktiverAnschluss && state.bvg.p1.altersguthabenHeute != null) {
    if (pkBezugsjahrP1 == null || jahr < pkBezugsjahrP1) {
      total += state.bvg.p1.altersguthabenHeute;
    } else if (jahr === pkBezugsjahrP1 && state.bvg.p1.bezugspraeferenz === "mischung") {
      // Bei Mischung: Restbetrag, der für Rente reserviert ist, bleibt formal in Vorsorge.
      // Vereinfacht: nicht separat ausgewiesen — Rente fliesst als Cashflow.
      total += 0;
    }
  }
  if (
    state.fallart === "paar" &&
    state.bvg.p2.aktiverAnschluss &&
    state.bvg.p2.altersguthabenHeute != null
  ) {
    if (pkBezugsjahrP2 == null || jahr < pkBezugsjahrP2) {
      total += state.bvg.p2.altersguthabenHeute;
    }
  }

  // 3a — pro Item bis Auszahlungs-/Ablaufjahr
  for (const items of [state.saeuleDrei.p1, state.saeuleDrei.p2]) {
    for (const it of items) {
      if (it.type === "konto") {
        if (it.aktuellerWert == null) continue;
        if (jahr < it.auszahlungsjahr) {
          const j = Math.max(0, jahr - jetzt);
          total += it.aktuellerWert * Math.pow(1 + it.renditeProzent / 100, j);
        }
      } else {
        const wert = it.ablaufswert ?? it.rueckkaufswert;
        if (wert == null) continue;
        if (jahr < it.ablaufjahr) total += wert;
      }
    }
  }

  // FZ — pro Item bis Auszahlungsjahr, mit Rendite verzinst
  for (const fz of [
    ...state.bvg.p1.freizuegigkeit,
    ...state.bvg.p2.freizuegigkeit,
  ]) {
    if (fz.saldoHeute == null) continue;
    if (jahr < fz.auszahlungsjahr) {
      const j = Math.max(0, jahr - jetzt);
      total += fz.saldoHeute * Math.pow(1 + fz.renditeProzent / 100, j);
    }
  }

  return total;
}

function immobilienWertAmJahresende(items: Immobilie[], jahr: number): number {
  let total = 0;
  for (const im of items) {
    if (im.verkehrswert == null) continue;
    if (im.plan === "verkaufen" && jahr >= im.verkaufsjahr) continue;
    total += im.verkehrswert;
  }
  return total;
}

function hypothekenAmJahresende(items: Immobilie[], jahr: number): number {
  let total = 0;
  for (const im of items) {
    if (im.plan === "verkaufen" && jahr >= im.verkaufsjahr) continue;
    total += im.hypotheken.reduce((s, h) => s + (h.hoehe ?? 0), 0);
  }
  return total;
}

function firmaWertAmJahresende(
  firma: CashflowInput["firma"],
  jahr: number
): number {
  if (!firma.vorhanden) return 0;
  if (firma.moeglicherVerkaufserloes == null) return 0;
  if (firma.plan === "verkaufen" && jahr >= firma.verkaufsjahr) return 0;
  return firma.moeglicherVerkaufserloes;
}
