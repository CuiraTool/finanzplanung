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
 * Inflation: optional via Budget.inflationProzent (default 0 %). Wirkt
 * auf laufende Haushaltsausgaben (haushaltsausgabenJahr) mit Faktor
 * (1 + p/100)^(jahr − heuteJahr). Default null = 0 % = bisheriges
 * Nominal-Verhalten, alle Bestands-Tests bleiben grün.
 *
 * Bewusst nicht modelliert:
 *   - Eigenmietwert, Schuldzinsabzug, GGSt, Kinderabzüge (Steuer-Engine
 *     behandelt diese — hier nur Verweis)
 *   - Inflation auf Versicherungs-Steuerabzüge (kantonale Pauschalen),
 *     einmalige Ausgaben, Hypothek-Zinsen, Wunschverbrauch-Override —
 *     nur die laufenden Haushaltsausgaben werden inflationiert.
 *   - Hypothek-Amortisation, Wertsteigerung Immobilien
 *   - Sterbetafel, partielle Pension (Pensumsreduktion)
 */

import type {
  PlanState,
  BvgPersonInput,
  Einkommensperiode,
  Immobilie,
  VermoegenItem,
} from "@/lib/store";
import {
  ahvJahresrenteEinzel,
  ahvCouplePension,
  ahvBezugsstart,
  ahvJahresFaktor,
  ahvKinderrente,
  ahv21Rentenzuschlag,
  dreizehnteAhvFaktor,
  bezugsfaktor,
  ordentlichesAhvAlter,
  ORDENTLICHES_AHV_ALTER,
  MAX_VORBEZUG_JAHRE,
  MAX_AUFSCHUB_JAHRE,
  ERSTES_JAHR_13TE_AHV,
  type AhvBezugsStart,
} from "./ahv";
import { bvgBezug, bvgGesamtkapitalBeiBezug, freizuegigkeitAuszahlung } from "./bvg";
import { saeuleDreiAuszahlung } from "./saeule3";
import {
  steuerProJahr,
  steuerProJahrIK,
  eigenmietwertAktivImJahr,
  type FremdKantonAnteil,
} from "./steuer";
import { ahvNeBeitragJahr, istNichterwerbstaetig } from "./ahv-ne";
import { IMMO_WERTSTEIGERUNG_DEFAULT_PROZENT } from "./economy-defaults";
import { effektiverSteuerwert } from "./repartition";
import { immobilienVerkaufsAuszahlungNetto } from "./immobilien";
import { pensionsjahr } from "@/lib/pension";
import { berechneErbschaftssteuer } from "./erbschaftssteuer";

export type CashflowInput = Pick<
  PlanState,
  | "fallart"
  | "zivilstand"
  | "person1"
  | "person2"
  | "kinder"
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
> & {
  /** Optional — wird für Erbschaft/Schenkung-Engine verwendet wenn vorhanden. */
  erbschaft?: PlanState["erbschaft"];
  /** Temporäre laufende Ausgaben mit Von/Bis (Studium, Schulden, etc.). */
  laufendeAusgaben?: PlanState["laufendeAusgaben"];
  /**
   * Umzug-Override (von Variante): ab umzugJahr Wohnsitzkanton-Wechsel auf
   * umzugZielKanton. Liegenschafts-Kantone (für EMW + GGSt) bleiben fix.
   */
  umzugJahr?: number;
  umzugZielKanton?: string;
};

/**
 * Wohnsitz-Kanton im gegebenen Jahr — berücksichtigt Umzug-Override.
 * Vor umzugJahr: adresse.kanton. Ab umzugJahr: umzugZielKanton.
 */
function wohnsitzKantonImJahr(state: CashflowInput, jahr: number): string {
  if (state.umzugJahr != null && state.umzugZielKanton && jahr >= state.umzugJahr) {
    return state.umzugZielKanton;
  }
  return state.adresse.kanton;
}

/**
 * Konkubinat-Detektion: fallart="paar" + zivilstand="konkubinat".
 * Steuerlich + AHV-rechtlich werden beide Partner als Einzelpersonen behandelt:
 *  - Bundessteuer: jeder LEDIG-Tarif (kein Splitting)
 *  - Kantonssteuer: jeder LEDIG-Tarif (kein Verheirateten-Tarif)
 *  - Vermsteuer: je 80k Freibetrag (kein 160k gemeinsam)
 *  - AHV: jeder eigene Einzelrente (kein Plafond 45'360, kein Splitting)
 *  - Kapital-Auszahlungs-Steuer: jeder LEDIG-Sondertarif
 */
function istKonkubinat(state: CashflowInput): boolean {
  return state.fallart === "paar" && state.zivilstand === "konkubinat";
}

/**
 * Wendet Szenario-B-Overrides auf einen CashflowInput an. Felder im Overlay
 * überschreiben die entsprechenden State-Felder; alles andere bleibt gleich.
 */
export function applyOverrides(
  base: CashflowInput,
  overrides: import("@/lib/store").SzenarioBOverrides
): CashflowInput {
  // Einkommens-Multiplikator auf alle Perioden anwenden
  const mult = overrides.einkommensMultiplikator;
  const einkommen = mult != null && mult !== 1
    ? base.budget.einkommen.map((e) => ({
        ...e,
        betragMonatlich:
          e.betragMonatlich != null
            ? Math.round(e.betragMonatlich * mult)
            : null,
      }))
    : base.budget.einkommen;

  // Immobilien-Plan-Overrides
  const immoOv = overrides.immobilienOverrides ?? {};
  const immobilien = {
    items: base.immobilien.items.map((im) => {
      const ov = immoOv[im.id];
      if (!ov) return im;
      return {
        ...im,
        plan: ov.plan ?? im.plan,
        verkaufsjahr: ov.verkaufsjahr ?? im.verkaufsjahr,
      };
    }),
  };

  return {
    ...base,
    ziele: {
      ...base.ziele,
      bezugsalterP1: overrides.bezugsalterP1 ?? base.ziele.bezugsalterP1,
      bezugsalterP2: overrides.bezugsalterP2 ?? base.ziele.bezugsalterP2,
    },
    ahv: {
      ...base.ahv,
      ahvBezugsalterP1:
        overrides.ahvBezugsalterP1 ?? base.ahv.ahvBezugsalterP1,
      ahvBezugsalterP2:
        overrides.ahvBezugsalterP2 ?? base.ahv.ahvBezugsalterP2,
    },
    bvg: {
      p1: {
        ...base.bvg.p1,
        bezugspraeferenz:
          overrides.bvgBezugspraeferenzP1 ?? base.bvg.p1.bezugspraeferenz,
      },
      p2: {
        ...base.bvg.p2,
        bezugspraeferenz:
          overrides.bvgBezugspraeferenzP2 ?? base.bvg.p2.bezugspraeferenz,
      },
    },
    budget: {
      ...base.budget,
      einkommen,
      wunschverbrauchPension:
        overrides.wunschverbrauchPension !== undefined
          ? overrides.wunschverbrauchPension
          : base.budget.wunschverbrauchPension,
      ausgabenTotal:
        overrides.ausgabenTotal !== undefined
          ? overrides.ausgabenTotal
          : base.budget.ausgabenTotal,
    },
    immobilien,
    umzugJahr: overrides.umzugJahr,
    umzugZielKanton: overrides.umzugZielKanton,
  };
}

export interface CashflowZeile {
  jahr: number;
  alterP1: number | null;
  alterP2: number | null;
  einnahmenErwerb: number;
  einnahmenAhv: number;
  einnahmenBvgRente: number;
  einnahmenMieten: number;
  einnahmenErbschaft: number; // einmalige Erbschaft (im Jahr; nur wenn Toggle aktiv)
  einnahmenTotal: number;
  /**
   * Eigenmietwert im Jahr (CHF) — Σ über alle selbstbewohnten Liegenschaften
   * × eigenmietwertProzent. Nur bis und mit 2029 wirksam (Reform 2030).
   * Wird zum steuerbaren Einkommen addiert, fliesst aber NICHT in einnahmenTotal
   * (kein Cashflow-Eingang — der Wert ist eine fiktive Einkommens-Position).
   */
  eigenmietwertJahr: number;
  /**
   * Schuldzins-Steuer-Abzug im Jahr — = ausgabenHypozins solange Reform-Phase
   * aktiv (≤2029) und mindestens eine selbstbewohnte Immobilie vorhanden ist.
   * Ab 2030 oder ohne Eigenheim: 0.
   */
  schuldzinsenAbzug: number;
  ausgabenHaushalt: number;
  ausgabenSteuern: number;
  ausgabenSteuernEinkommen: number;
  ausgabenSteuernEinkommenBund: number; // davon Bund (DBG)
  ausgabenSteuernEinkommenKanton: number; // davon Kanton+Gemeinde+Kirche
  /** Steuerbares Einkommen (Kanton-Bemessungsgrundlage) — Basis der Einkommenssteuer. */
  steuerbaresEinkommen: number;
  ausgabenSteuernVermoegen: number;
  ausgabenSteuernKapital: number;
  ausgabenSteuernKapitalBund: number; // davon Bund (1/5 DBG)
  ausgabenSteuernKapitalKanton: number; // davon Kanton-Sondertarif
  ausgabenSozialBvg: number; // AHV/IV/EO + ALV + NBU + BVG-AN-Beitrag (Erwerbsphase)
  ausgabenVorsorge3a: number; // jährliche Einzahlungen Säule 3a/3b
  ausgabenPkEinkauf: number; // freiwilliger PK-Einkauf im Jahr (Σ p1+p2)
  ausgabenAhvNe: number; // AHV-NE-Beiträge bei Frühpension (vor AHV-Alter, nicht-erwerbstätig)
  ausgabenHypozins: number; // jährliche Hypothek-Zinsen (Σ über alle laufenden Tranchen)
  ausgabenSchenkung: number; // einmalige Schenkung / Erbvorbezug (im Jahr; nur wenn Toggle aktiv)
  ausgabenAlimente: number; // Alimente / Unterhaltsbeiträge (Art. 33 DBG, Cashflow + Steuer-Abzug)
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
  // AHV-Bezugsstart ist monatsgenau (BSV-Merkblatt 3.04 "Flexibler Rentenbezug"):
  // Folgemonat nach Erreichen des Bezugsalters. Pro-Rata im Bezugsjahr.
  const ahvStartP1: AhvBezugsStart | null = ahvBezugsstart(
    state.person1.geburtsdatum,
    clampAhvAlter(state.ahv.ahvBezugsalterP1)
  );
  const ahvStartP2: AhvBezugsStart | null =
    state.fallart === "paar"
      ? ahvBezugsstart(
          state.person2.geburtsdatum,
          clampAhvAlter(state.ahv.ahvBezugsalterP2)
        )
      : null;
  const ahvBezugsjahrP1 = ahvStartP1?.jahr ?? null;
  const ahvBezugsjahrP2 = ahvStartP2?.jahr ?? null;
  // PK-Rentenbezug ebenfalls monatsgenau (Folgemonat nach Erreichen des
  // PK-Bezugsalters). Pro-Rata im Bezugsjahr nur bei Rente — Kapital ist
  // bereits einmaliger Stichtags-Bezug.
  const pkStartP1 = ahvBezugsstart(state.person1.geburtsdatum, state.ziele.bezugsalterP1);
  const pkStartP2 =
    state.fallart === "paar"
      ? ahvBezugsstart(state.person2.geburtsdatum, state.ziele.bezugsalterP2)
      : null;
  const pkBezugsjahrP1 = pkStartP1?.jahr ?? null;
  const pkBezugsjahrP2 = pkStartP2?.jahr ?? null;

  const ahvRenteHaushalt = computeAhvRente(state, ahvBezugsjahrP1, ahvBezugsjahrP2);
  const bvgRenteHaushalt = computeBvgRenteHaushalt(state);
  const bvgKapitalAuszahlungen = computeBvgKapitalAuszahlungen(state);

  // Anker-Einkommen: User hat im Budget aktuelle Jahressteuer (steuernHeute)
  // erfasst — diese soll im aktuellen Jahr exakt als Steuer-Ausgabe
  // erscheinen und in Folgejahren proportional zum Einkommen skaliert
  // werden. Da das frühere Brutto-Feld weg ist, leiten wir das
  // Anker-Einkommen aus dem heutigen Erwerbseinkommen (Block 3 netto) ab.
  const heuteJahr = new Date().getFullYear();
  const erwerbHeute = erwerbseinkommenJahr(state.budget.einkommen, heuteJahr);
  const ankerEinkommenImplizit =
    state.budget.einkommenHeute && state.budget.einkommenHeute > 0
      ? state.budget.einkommenHeute
      : erwerbHeute > 0
        ? erwerbHeute
        : null;

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
    // Aufgesplittet pro Person (für Steuer-Abzüge — Sozial+BVG+Berufsauslagen
    // sind pro Person zu rechnen)
    const erwerbP1Roh = erwerbseinkommenJahrPerson(state.budget.einkommen, jahr, 1);
    const erwerbP2Roh = erwerbseinkommenJahrPerson(state.budget.einkommen, jahr, 2);
    const istVorPensionP1 =
      pkBezugsjahrP1 == null || jahr < pkBezugsjahrP1;
    const istVorPensionP2 =
      pkBezugsjahrP2 == null || jahr < pkBezugsjahrP2;
    // Fallback auf ahv.einkommenP1/P2 (Block 4) NUR wenn Block 3 für diese
    // Person KEINE Perioden hat. Wenn Perioden existieren, ist erwerbP*Roh=0
    // ein bewusstes "Erwerb endete vor dem Jahr" → keine Fallback-Kontamination
    // (sonst doppelverdienerabzug/3a-Limit/Berufsauslagen P2 würden auch nach
    // Erwerbsende weiter wirken — siehe Stanojevic-Regression 2027).
    const hatPeriodenP1 = state.budget.einkommen.some((p) => p.personIdx === 1);
    const hatPeriodenP2 = state.budget.einkommen.some((p) => p.personIdx === 2);
    let bruttoErwerbP1 = 0;
    if (erwerbP1Roh > 0) bruttoErwerbP1 = erwerbP1Roh;
    else if (istVorPensionP1 && !hatPeriodenP1)
      bruttoErwerbP1 = state.ahv.einkommenP1 ?? 0;

    let bruttoErwerbP2 = 0;
    if (state.fallart === "paar") {
      if (erwerbP2Roh > 0) bruttoErwerbP2 = erwerbP2Roh;
      else if (istVorPensionP2 && !hatPeriodenP2)
        bruttoErwerbP2 = state.ahv.einkommenP2 ?? 0;
    }
    // Total 3a-Einzahlung im Jahr (alle Konten + Versicherungen, beide Personen,
    // wenn jahr in einzahlungAb..einzahlungBis liegt)
    const saeule3aEinzahlungJahr =
      saeuleDreiEinzahlungJahr(state.saeuleDrei.p1, jahr, "3a") +
      (state.fallart === "paar"
        ? saeuleDreiEinzahlungJahr(state.saeuleDrei.p2, jahr, "3a")
        : 0);
    // 3b-Prämien: budgetrelevant (Cashflow-Ausgabe), KEIN Steuer-Abzug
    const saeule3bEinzahlungJahr =
      saeuleDreiEinzahlungJahr(state.saeuleDrei.p1, jahr, "3b") +
      (state.fallart === "paar"
        ? saeuleDreiEinzahlungJahr(state.saeuleDrei.p2, jahr, "3b")
        : 0);

    // PK-Einkauf-Summe im aktuellen Jahr (beide Personen). Wirkt:
    //  - als Ausgabe im Cashflow (mindert Hauptkonto)
    //  - als Steuer-Abzug (pkEinkaufJahr im Steuer-Input)
    //  - wächst PK-Saldo via bvgGesamtkapitalBeiBezug (schon vorhanden)
    const pkEinkaufJahr = pkEinkaufSummeJahr(state, jahr);

    // AHV-Einnahmen mit Monats-genauer Pro-Rata-Logik:
    //  • Bezugsstart-Jahr → anteilig (Folgemonat nach Erreichen des Bezugsalters)
    //  • Folgejahre → volle Jahresrente
    //  • Plafonierung Ehepaar greift sobald BEIDE Ehegatten im Bezug sind
    //    (Vereinfachung: Übergangsjahr nutzt plafonierte Rate × max-Faktor).
    const ahvFaktorP1 = ahvJahresFaktor(jahr, ahvStartP1);
    const ahvFaktorP2 =
      state.fallart === "paar" ? ahvJahresFaktor(jahr, ahvStartP2) : 0;
    const p1AhvBezieht = ahvFaktorP1 > 0;
    const p2AhvBezieht = ahvFaktorP2 > 0;
    let einnahmenAhv = 0;
    if (state.fallart === "paar") {
      if (istKonkubinat(state)) {
        // Konkubinat: jeder eigene Einzelrente, kein Plafond, individuelle
        // Pro-Rata-Faktoren.
        einnahmenAhv = Math.round(
          ahvRenteHaushalt.p1Einzel * ahvFaktorP1 +
            ahvRenteHaushalt.p2Einzel * ahvFaktorP2
        );
      } else if (p1AhvBezieht && p2AhvBezieht) {
        // Verheiratet: beide im Bezug → gewichtete Einzelrenten, gecappt
        // auf Ehepaar-Plafond. Bei Übergangsjahr (P1 startet z.B. Aug,
        // P2 schon Vollbezug) reflektiert das die echte Pro-Rata pro
        // Person statt fix max(faktor) × Plafond zu nehmen.
        const summeGewichtet =
          ahvRenteHaushalt.p1Einzel * ahvFaktorP1 +
          ahvRenteHaushalt.p2Einzel * ahvFaktorP2;
        const plafondAktiv = ahvRenteHaushalt.haushalt;
        einnahmenAhv = Math.round(Math.min(summeGewichtet, plafondAktiv));
      } else if (p1AhvBezieht) {
        einnahmenAhv = Math.round(ahvRenteHaushalt.p1Einzel * ahvFaktorP1);
      } else if (p2AhvBezieht) {
        einnahmenAhv = Math.round(ahvRenteHaushalt.p2Einzel * ahvFaktorP2);
      }
    } else if (p1AhvBezieht) {
      einnahmenAhv = Math.round(ahvRenteHaushalt.haushalt * ahvFaktorP1);
    }

    // 13. AHV-Korrektur für Pre-2026-Pensionierte: 13. AHV gilt ab Dez 2026
    // für ALLE Rentner — auch für Personen, die vor 2026 in Bezug gingen.
    // p1Einzel / p2Einzel enthalten df(bezugsjahrPx) — bei Pre-2026-Bezug ist
    // df=1, ab 2026 fehlt der 13. Monat. Korrektur per Person (additiv), damit
    // Mischfälle (z.B. P1 vor 2026 + P2 nach 2026 in Bezug) richtig behandelt
    // werden. Plafond gilt nur bei Ehe — Cap auf Ehepaar-Maximum × 13/12.
    if (jahr >= ERSTES_JAHR_13TE_AHV && einnahmenAhv > 0) {
      let zusatz = 0;
      const p1Pre =
        p1AhvBezieht &&
        ahvBezugsjahrP1 != null &&
        ahvBezugsjahrP1 < ERSTES_JAHR_13TE_AHV;
      const p2Pre =
        state.fallart === "paar" &&
        p2AhvBezieht &&
        ahvBezugsjahrP2 != null &&
        ahvBezugsjahrP2 < ERSTES_JAHR_13TE_AHV;
      if (state.fallart === "paar") {
        if (p1Pre) zusatz += ahvRenteHaushalt.p1Einzel * ahvFaktorP1 * (1 / 12);
        if (p2Pre) zusatz += ahvRenteHaushalt.p2Einzel * ahvFaktorP2 * (1 / 12);
      } else if (p1Pre) {
        zusatz += ahvRenteHaushalt.haushalt * ahvFaktorP1 * (1 / 12);
      }
      if (zusatz > 0) {
        einnahmenAhv = Math.round(einnahmenAhv + zusatz);
        if (
          state.fallart === "paar" &&
          !istKonkubinat(state) &&
          p1AhvBezieht &&
          p2AhvBezieht
        ) {
          const plafondMax = Math.round(45_360 * (13 / 12));
          if (einnahmenAhv > plafondMax) einnahmenAhv = plafondMax;
        }
      }
    }

    // AHV21-Rentenzuschlag für Übergangs-Frauen Jg 1961-1969 — wird ZUSÄTZLICH
    // zur (plafondierten) Ehepaarrente addiert. Pro-Rata im Bezugsstart-Jahr
    // via ahvFaktorPx. Zuschlag wird mit dreizehnteAhvFaktor multipliziert,
    // damit auch der 13.-AHV-Monat den Zuschlag enthält (BSV-Praxis).
    //
    // WICHTIG: Zuschlag wird NUR berechnet wenn KEIN Override-Wert gesetzt
    // ist (ahvRenteJahrEffektivP*). Berater-Override-Werte enthalten den
    // Zuschlag bereits oder die Berater-Annahme ist bewusst ohne Zuschlag —
    // Engine darf nicht doppelt addieren. Bei Skala-44-Berechnung addiert
    // die Engine den Zuschlag standardmässig (BSV-Praxis).
    {
      const gjP1 = state.person1.geburtsdatum
        ? Number.parseInt(state.person1.geburtsdatum.slice(0, 4), 10)
        : null;
      const gjP2 =
        state.fallart === "paar" && state.person2.geburtsdatum
          ? Number.parseInt(state.person2.geburtsdatum.slice(0, 4), 10)
          : null;
      const dfJahr = dreizehnteAhvFaktor(jahr);
      const overrideP1 =
        state.ahv.ahvRenteJahrEffektivP1 != null &&
        state.ahv.ahvRenteJahrEffektivP1 > 0;
      const overrideP2 =
        state.ahv.ahvRenteJahrEffektivP2 != null &&
        state.ahv.ahvRenteJahrEffektivP2 > 0;
      if (p1AhvBezieht && gjP1 != null && !overrideP1) {
        const ordP1 = ordentlichesAhvAlter(gjP1, state.person1.geschlecht ?? null);
        const zuschlagP1 = ahv21Rentenzuschlag(
          gjP1,
          state.person1.geschlecht ?? null,
          clampAhvAlter(state.ahv.ahvBezugsalterP1),
          ordP1,
          state.ahv.einkommenP1 ?? 0
        );
        if (zuschlagP1 > 0) {
          einnahmenAhv = Math.round(
            einnahmenAhv + zuschlagP1 * ahvFaktorP1 * dfJahr
          );
        }
      }
      if (
        state.fallart === "paar" &&
        p2AhvBezieht &&
        gjP2 != null &&
        !overrideP2
      ) {
        const ordP2 = ordentlichesAhvAlter(gjP2, state.person2.geschlecht ?? null);
        const zuschlagP2 = ahv21Rentenzuschlag(
          gjP2,
          state.person2.geschlecht ?? null,
          clampAhvAlter(state.ahv.ahvBezugsalterP2),
          ordP2,
          state.ahv.einkommenP2 ?? 0
        );
        if (zuschlagP2 > 0) {
          einnahmenAhv = Math.round(
            einnahmenAhv + zuschlagP2 * ahvFaktorP2 * dfJahr
          );
        }
      }
    }

    // V2: AHV-Kinderrente — pensionierter Elternteil + Kind < 18 (oder < 25 in Ausbildung).
    // Plafondierung gegen Haushalts-Altersrente (max ~49'140 inkl. 13. AHV).
    // Bei Paar mit beiden Max-Renten: Plafond schon erreicht → 0 Kinderrente.
    const anzahlKinderAhvRente = anzahlAhvKinderrentenberechtigt(state.kinder, jahr);
    let einnahmenAhvKinderrente = 0;
    if (anzahlKinderAhvRente > 0 && einnahmenAhv > 0) {
      einnahmenAhvKinderrente = ahvKinderrente(
        einnahmenAhv,
        anzahlKinderAhvRente,
        jahr
      );
    }
    einnahmenAhv += einnahmenAhvKinderrente;

    // BVG-Rente mit Pro-Rata im Bezugsstart-Jahr (Folgemonat nach Erreichen
    // des PK-Bezugsalters). PK kennt keine 13. Rente, daher Divisor 12.
    // Kapital-Auszahlungen sind separat (einmaliger Stichtags-Bezug).
    let einnahmenBvgRente = 0;
    const pkFaktorP1 = pkJahresFaktor(jahr, pkStartP1);
    if (pkFaktorP1 > 0) {
      einnahmenBvgRente += Math.round(bvgRenteHaushalt.p1 * pkFaktorP1);
    }
    if (state.fallart === "paar") {
      const pkFaktorP2 = pkJahresFaktor(jahr, pkStartP2);
      if (pkFaktorP2 > 0) {
        einnahmenBvgRente += Math.round(bvgRenteHaushalt.p2 * pkFaktorP2);
      }
    }

    const einnahmenMieten = mieteinnahmenJahr(state.immobilien.items, jahr);

    // Erbschaft als einmaliger Eingang im erwartetJahr (nur wenn Toggle aktiv)
    const einnahmenErbschaft = erbschaftEinnahmeJahr(state, jahr);

    // Erbschaftssteuer (kantonal, separater Steuer-Strang — nicht in
    // Einkommens-/Vermögenssteuer enthalten). Default-Verwandtschaft
    // "nachkomme" (Eltern → Kind, häufigster Fall — Ehegatte ist überall
    // befreit, Konkubinats-Erblasser selten als Erblasser für die zu
    // planende Person). Wird unten zu ausgabenSteuern addiert.
    const erbschaftssteuerJahr =
      einnahmenErbschaft > 0
        ? berechneErbschaftssteuer({
            betrag: einnahmenErbschaft,
            verwandtschaft: state.erbschaft?.erwartetVerwandtschaft ?? "nachkomme",
            kanton: wohnsitzKantonImJahr(state, jahr),
          }).steuerBetrag
        : 0;

    // Alimente: zwei Richtungen.
    //   - "zahlt": voll abzugsfähig (Art. 33 Abs. 1 lit. c DBG) + Cashflow-Ausgabe
    //   - "erhaelt": voll steuerbar (Art. 23 lit. f DBG) + Cashflow-Einnahme
    const alimenteAktiv =
      state.budget.alimente?.aktiv && state.budget.alimente.betragJahr != null;
    const alimenteBetrag = alimenteAktiv
      ? Math.max(0, state.budget.alimente.betragJahr ?? 0)
      : 0;
    const alimenteRichtung = state.budget.alimente?.richtung ?? "zahlt";
    const ausgabenAlimente = alimenteRichtung === "zahlt" ? alimenteBetrag : 0;
    const einnahmenAlimente = alimenteRichtung === "erhaelt" ? alimenteBetrag : 0;

    const einnahmenTotal =
      einnahmenErwerb +
      einnahmenAhv +
      einnahmenBvgRente +
      einnahmenMieten +
      einnahmenErbschaft +
      einnahmenAlimente;

    // ─── Kapitalauszahlungen (einmalig im Jahr) ──────────────────
    const kapAuszahlungen = kapitalauszahlungenJahr(
      state,
      jahr,
      bvgKapitalAuszahlungen
    );
    // 3b-Auszahlung ist steuerfrei — wird vom Steuer-Input abgezogen
    const auszahlungen3b = saeule3bAuszahlungenJahr(state, jahr);
    // WEF-Vorbezug: wird mit Kapitalauszahlungs-Sondertarif besteuert,
    // fliesst aber typisch direkt ins Eigenheim (nicht aufs Hauptkonto).
    // Daher zur Steuer-Bemessung dazu, aber NICHT zum Cashflow-Total.
    const wefBetragJahr = wefVorbezugJahr(state, jahr);
    // Steuerpflichtige Kapital-Auszahlungen: total minus steuerfreie 3b
    // + WEF-Vorbezug (Sondertarif). 3b-Auszahlung fliesst ins Hauptkonto
    // aber wird NICHT besteuert (PreVorsorge ohne Steuerprivileg).
    // Art. 37b DBG: Liquidationsgewinn aus Aufgabe selbständiger Erwerb ab
    // Alter 55 wird mit 1/5-Sondertarif besteuert (Bund). Kantone meist
    // analog. Wir wenden Bemessung 1/5 auf den Firma-Erlös an, wenn die
    // Selbständig-Person bei Verkauf ≥ 55 ist. Pragmatic; echter Tarif
    // hat eigene Kurve (kommt in Etappe 2).
    const firmaErloesJahr = firmaVerkaufErloesJahr(state, jahr);
    const firma37bAktiv = firmaArt37bAktiv(state, jahr);
    const firma37bReduktion = firma37bAktiv ? firmaErloesJahr * (4 / 5) : 0;
    // Immobilien-Verkaufserlös ist KEINE Vorsorge-Kapitalleistung — der
    // Gewinn wird ausschliesslich mit der Grundstückgewinnsteuer belastet
    // (bereits in immobilienVerkaufsAuszahlungNetto verrechnet). Der
    // Netto-Erlös darf daher NICHT zusätzlich mit dem Kapitalleistungs-
    // Sondertarif besteuert werden — sonst entsteht eine Phantom-Steuer
    // bei jedem Liegenschaftsverkauf.
    const immobilienVerkaufNetto = immobilienVerkaufErloesJahr(state, jahr);
    const kapAuszahlungenFuerSteuer =
      kapAuszahlungen -
      auszahlungen3b +
      wefBetragJahr -
      firma37bReduktion -
      immobilienVerkaufNetto;

    // ─── Ausgaben ────────────────────────────────────────────────
    const istPensioniert =
      pkBezugsjahrP1 != null && jahr >= pkBezugsjahrP1;
    const ausgabenHaushalt = haushaltsausgabenJahr(
      state.budget,
      istPensioniert,
      jahr,
      heuteJahr
    );
    const ausgabenEinmalig = einmaligeAusgabenJahr(state.einmaligeAusgaben, jahr);
    const ausgabenLaufend = laufendeAusgabenJahr(state.laufendeAusgaben, jahr);
    // V5: Selbständigkeits-AHV-Mehraufwand (10 % statt 5.3 % AN-Anteil)
    const ausgabenSelbstaendigAhv = selbstaendigAhvMehraufwandJahr(
      state.budget.einkommen,
      jahr
    );
    const ausgabenHypozins = hypothekenZinsenJahr(state, jahr);
    const ausgabenHypoTilgung = hypothekTilgungenJahr(state, jahr);
    const ausgabenSchenkung = schenkungAusgabeJahr(state, jahr);
    // Alimente-Variablen (ausgabenAlimente, einnahmenAlimente, alimenteBetrag,
    // alimenteRichtung) wurden bereits oben definiert, weil einnahmenAlimente
    // in einnahmenTotal einfliesst.
    // Eigenmietwert: bis 2029 wirksam auf Einkommen (Reform 2030)
    const eigenmietwertJahr = eigenmietwertJahrTotal(state, jahr);
    // Schuldzinsabzug: nur bis 2029 UND nur wenn mindestens eine selbst-
    // bewohnte Immobilie vorhanden ist. Vereinfacht: voller Hypozinsen-Abzug
    // (ohne 60k-Pauschale / Vermögensertrag-Begrenzung). Korrekt für
    // typische Eigenheim-Fälle in der Auslegeordnung.
    const hatEigenheim = state.immobilien.items.some(
      (im) => im.typ === "selbstbewohnt" && !immobilieAbgegeben(im, jahr)
    );
    const schuldzinsenAbzug =
      eigenmietwertAktivImJahr(jahr) && hatEigenheim ? ausgabenHypozins : 0;

    // Vermögen vor Steuern (Stand Jahresanfang) — vereinfacht: Block-7-Saldi
    // VOR der Cashflow-Buchung in diesem Jahr, plus Immobilien minus Hypotheken.
    const block7AktivaJahresanfang = block7
      .filter((b) => b.item.typ !== "darlehen")
      .reduce((s, b) => s + b.saldo, 0);
    const block7DarlehenJahresanfang = block7
      .filter((b) => b.item.typ === "darlehen")
      .reduce((s, b) => s + b.saldo, 0);
    const immoJahresanfang = immobilienWertAmJahresende(state, jahr - 1);
    const hypoJahresanfang = hypothekenAmJahresende(state, jahr - 1);
    const vermoegenJahresanfang =
      block7AktivaJahresanfang +
      immoJahresanfang -
      block7DarlehenJahresanfang -
      hypoJahresanfang;

    // Vermögenssteuer-Bemessung: Immobilien zum Steuerwert (E2-6), nicht
    // zum Verkehrswert. Sonst werden Eigenheimer in Kantonen mit tiefem
    // Steuerwert (z.B. ZH ~70%) überbesteuert.
    const immoSteuerwertJahresanfang = immoSteuerwertAmJahresende(state, jahr - 1);
    const vermoegenSteuerwertJahresanfang =
      block7AktivaJahresanfang +
      immoSteuerwertJahresanfang -
      block7DarlehenJahresanfang -
      hypoJahresanfang;

    // Interkantonale Steuerausscheidung: pro ausserkantonaler Liegenschaft
    // einen FremdKantonAnteil bauen. Wenn keine fremde Liegenschaft → Array
    // bleibt leer, steuerProJahrIK fällt auf steuerProJahr zurück.
    const fremdAnteile: FremdKantonAnteil[] = [];
    const wohnsitzKt = wohnsitzKantonImJahr(state, jahr);
    for (const im of state.immobilien.items) {
      if (!im.adresse?.kanton) continue;
      if (im.adresse.kanton === wohnsitzKt) continue;
      // Liegenschaft schon weg (verkauft oder verschenkt)? Wirkt erst ab dem Jahr.
      if (immobilieAbgegeben(im, jahr)) continue;
      const mietenImm =
        im.typ === "rendite" ? im.jaehrlicheMieteinnahmen ?? 0 : 0;
      const hypo = im.hypotheken.reduce((s, h) => s + (h.hoehe ?? 0), 0);
      const wert = im.verkehrswert ?? 0;
      const netto = Math.max(0, wert - hypo);
      fremdAnteile.push({
        kanton: im.adresse.kanton,
        bfsId: im.adresse.gemeindeBfsId ?? undefined,
        mietenJahr: mietenImm,
        vermoegenNetto: netto,
      });
    }

    // Konkubinat (V1): zwei separate Steuer-Berechnungen pro Person mit
    // fallart="einzel", danach summiert. Kein Ehepaar-Splitting, kein
    // Verheirateten-Tarif. Vermögen + shared income 50/50 zugeordnet.
    const konkubinatAktiv = istKonkubinat(state);
    const ahvP1Jahr = ahvRenteHaushalt.p1Einzel * ahvFaktorP1;
    const ahvP2Jahr = ahvRenteHaushalt.p2Einzel * ahvFaktorP2;
    const bvgP1Jahr =
      pkFaktorP1 > 0 ? bvgRenteHaushalt.p1 * pkFaktorP1 : 0;
    const pkFaktorP2Lokal =
      state.fallart === "paar" ? pkJahresFaktor(jahr, pkStartP2) : 0;
    const bvgP2Jahr =
      pkFaktorP2Lokal > 0 ? bvgRenteHaushalt.p2 * pkFaktorP2Lokal : 0;
    // Erbschaft NICHT einkommens-steuerpflichtig (separat via Erbschaftssteuer).
    const passivShared = einnahmenMieten + einnahmenAlimente;

    const baseSteuerInput = {
      kanton: wohnsitzKt,
      // Gemeinde-BFS nur valid wenn Wohnsitz unverändert; sonst Default (null)
      bfsId:
        wohnsitzKt === state.adresse.kanton
          ? state.adresse.gemeindeBfsId ?? undefined
          : undefined,
      religion: state.budget.religion,
      jahr,
      einkommenIstNetto: true,
      eigenmietwertJahr,
      schuldzinsenJahr: schuldzinsenAbzug,
      alimenteJahr: ausgabenAlimente,
    };

    let steuern: ReturnType<typeof steuerProJahrIK>;
    if (konkubinatAktiv) {
      // Konkubinat: pro Kind exklusiv ein Elternteil bekommt Abzug.
      // - zuordnung "p1" / "p2": direkt zugeordnet
      // - zuordnung "gemeinsam": Konvention → höheres Bruttoerwerbs-Einkommen
      //   bekommt Abzug (steueroptimiert). Bei Gleichstand: P1.
      const gemeinsamBei: "p1" | "p2" =
        bruttoErwerbP1 >= bruttoErwerbP2 ? "p1" : "p2";
      const kinderP1 = anzahlKinderAbzugsfaehig(
        state.kinder,
        jahr,
        "p1",
        gemeinsamBei
      );
      const kinderP2 = anzahlKinderAbzugsfaehig(
        state.kinder,
        jahr,
        "p2",
        gemeinsamBei
      );
      // Person 1
      const s1 = steuerProJahrIK(
        {
          ...baseSteuerInput,
          fallart: "einzel",
          einkommenJahr: bruttoErwerbP1 + ahvP1Jahr + bvgP1Jahr + passivShared / 2,
          vermoegenJahr: vermoegenSteuerwertJahresanfang / 2,
          kapAuszahlungenJahr: kapAuszahlungenFuerSteuer / 2,
          bruttoErwerbP1,
          bruttoErwerbP2: 0,
          alterP1: alterP1 ?? 40,
          alterP2: 40,
          anzahlKinder: kinderP1,
          saeule3aEinzahlungJahr: saeule3aEinzahlungJahr / 2,
          pkEinkaufJahr: pkEinkaufJahr / 2,
          hatPkAnschlussP1: state.bvg.p1.aktiverAnschluss && istVorPensionP1,
          hatPkAnschlussP2: false,
          ankerSteuernHeute:
            jahr === heuteJahr && state.budget.steuernHeute
              ? state.budget.steuernHeute / 2
              : null,
          ankerEinkommenHeute:
            jahr === heuteJahr && ankerEinkommenImplizit
              ? ankerEinkommenImplizit / 2
              : null,
        },
        fremdAnteile
      );
      // Person 2
      const s2 = steuerProJahrIK(
        {
          ...baseSteuerInput,
          fallart: "einzel",
          einkommenJahr: bruttoErwerbP2 + ahvP2Jahr + bvgP2Jahr + passivShared / 2,
          vermoegenJahr: vermoegenSteuerwertJahresanfang / 2,
          kapAuszahlungenJahr: kapAuszahlungenFuerSteuer / 2,
          bruttoErwerbP1: bruttoErwerbP2, // P2 ist hier als P1 erfasst (Single-Pfad)
          bruttoErwerbP2: 0,
          alterP1: alterP2 ?? 40,
          alterP2: 40,
          anzahlKinder: kinderP2,
          saeule3aEinzahlungJahr: saeule3aEinzahlungJahr / 2,
          pkEinkaufJahr: pkEinkaufJahr / 2,
          hatPkAnschlussP1: state.bvg.p2.aktiverAnschluss && istVorPensionP2,
          hatPkAnschlussP2: false,
          ankerSteuernHeute:
            jahr === heuteJahr && state.budget.steuernHeute
              ? state.budget.steuernHeute / 2
              : null,
          ankerEinkommenHeute:
            jahr === heuteJahr && ankerEinkommenImplizit
              ? ankerEinkommenImplizit / 2
              : null,
        },
        fremdAnteile
      );
      steuern = {
        einkommen: s1.einkommen + s2.einkommen,
        einkommenBund: s1.einkommenBund + s2.einkommenBund,
        einkommenKanton: s1.einkommenKanton + s2.einkommenKanton,
        vermoegen: s1.vermoegen + s2.vermoegen,
        kapital: s1.kapital + s2.kapital,
        kapitalBund: (s1.kapitalBund ?? 0) + (s2.kapitalBund ?? 0),
        kapitalKanton: (s1.kapitalKanton ?? 0) + (s2.kapitalKanton ?? 0),
        total: s1.total + s2.total,
        kalibriert: s1.kalibriert || s2.kalibriert,
        abzuegeDbg: s1.abzuegeDbg,
        abzuegeKanton: s1.abzuegeKanton,
        steuerbaresEinkommenKanton:
          (s1.steuerbaresEinkommenKanton ?? 0) +
          (s2.steuerbaresEinkommenKanton ?? 0),
        steuerbaresEinkommenBund:
          (s1.steuerbaresEinkommenBund ?? 0) +
          (s2.steuerbaresEinkommenBund ?? 0),
      };
    } else {
      steuern = steuerProJahrIK(
        {
          ...baseSteuerInput,
          // Erhaltene Alimente voll steuerbar (Art. 23 lit. f DBG)
          einkommenJahr:
            einnahmenErwerb +
            einnahmenMieten +
            einnahmenAhv +
            einnahmenBvgRente +
            einnahmenAlimente,
          vermoegenJahr: vermoegenSteuerwertJahresanfang,
          kapAuszahlungenJahr: kapAuszahlungenFuerSteuer,
          fallart: state.fallart,
          bruttoErwerbP1,
          bruttoErwerbP2,
          alterP1: alterP1 ?? 40,
          alterP2: alterP2 ?? 40,
          anzahlKinder: anzahlKinderAbzugsfaehig(state.kinder, jahr),
          saeule3aEinzahlungJahr,
          pkEinkaufJahr,
          hatPkAnschlussP1:
            state.bvg.p1.aktiverAnschluss && istVorPensionP1,
          hatPkAnschlussP2:
            state.fallart === "paar" &&
            state.bvg.p2.aktiverAnschluss &&
            istVorPensionP2,
          ankerSteuernHeute:
            jahr === heuteJahr ? state.budget.steuernHeute : null,
          ankerEinkommenHeute:
            jahr === heuteJahr ? ankerEinkommenImplizit : null,
        },
        fremdAnteile
      );
    }
    // ausgabenSteuern enthält: Einkommens-, Vermögens-, Kapital- + ggf.
    // Erbschaftssteuer im Bezugsjahr (separater kantonaler Strang).
    const ausgabenSteuern = steuern.total + erbschaftssteuerJahr;

    // Budget-Modell: User gibt NETTO-Einkommen im Budget ein. Sozial-AN-
    // Abzüge (AHV/IV/EO + ALV + NBU + BVG-AN) sind NICHT zusätzlich ab-
    // zuziehen — sie sind bereits aus der Lohnabrechnung weg. ausgaben-
    // SozialBvg bleibt deshalb 0 im Cashflow + Dashboard. Steuer-Engine
    // arbeitet ebenfalls mit Netto (einkommenIstNetto: true).
    // Tragbarkeit-Check rechnet separat Netto × 1.15 → Brutto-Schätzung.
    const ausgabenSozialBvg = 0;
    // 3a-Einzahlung als separate Vorsorge-Ausgabe (geht NICHT auf das
    // Hauptkonto, sondern wächst den 3a-Saldo)
    // 3a + 3b-Prämien fliessen als Vorsorge-Ausgabe (3a wächst Saldo, 3b
    // wirkt nur als Versicherungsprämie ohne Saldo-Effekt). Steuerlich
    // ist nur 3a abzugsfähig (pkEinkaufJahr + saeule3aEinzahlungJahr im
    // Steuer-Input — 3b läuft nicht durch Steuer-Engine).
    const ausgabenVorsorge3a = saeule3aEinzahlungJahr + saeule3bEinzahlungJahr;
    // PK-Einkauf: fliesst als Ausgabe ab Hauptkonto, PK-Saldo wächst (via
    // bvgGesamtkapitalBeiBezug → wird im Bezugsjahr addiert + verzinst).
    const ausgabenPkEinkauf = pkEinkaufJahr;

    // AHV-NE-Beiträge bei Frühpension: pro Person separat, ab Erwerbsende
    // bis ordentliches AHV-Bezugsalter. Bemessung = Vermögen × 20 + Renten × 20.
    // Vermögen wird bei Ehepaar hälftig zugerechnet. Pro-Rata bei Erwerbs-
    // Wechseljahr: NE-Anteil = (12 - Erwerbsmonate) / 12.
    const ahvNeBeitragsbasisVermoegen =
      state.fallart === "paar"
        ? vermoegenJahresanfang / 2
        : vermoegenJahresanfang;
    // BSV-Merkblatt 2.03 "Beiträge der Nichterwerbstätigen":
    // Wer im Beitragsjahr aus Erwerb mind. den AHV-Mindestbeitrag (530 CHF/J)
    // einbezahlt, gilt als erwerbstätig — KEIN zusätzlicher NE-Beitrag.
    // Bei AHV-Satz 10.6 % entspricht das einem Jahres-Erwerbslohn ab ~5'000 CHF.
    // → NE-Beitrag nur bei Erwerb < Mindestschwelle UND alter < ahvBezugsalter.
    const AHV_ERWERBS_MINDESTSCHWELLE = 5_000;
    let ausgabenAhvNe = 0;
    if (
      alterP1 != null &&
      alterP1 < state.ahv.ahvBezugsalterP1 &&
      erwerbP1Roh < AHV_ERWERBS_MINDESTSCHWELLE
    ) {
      ausgabenAhvNe += ahvNeBeitragJahr({
        vermoegen: ahvNeBeitragsbasisVermoegen,
        rentenJahr: einnahmenBvgRente * 0.5 + einnahmenAhv * 0.5,
      });
    }
    if (
      state.fallart === "paar" &&
      alterP2 != null &&
      alterP2 < state.ahv.ahvBezugsalterP2 &&
      erwerbP2Roh < AHV_ERWERBS_MINDESTSCHWELLE
    ) {
      ausgabenAhvNe += ahvNeBeitragJahr({
        vermoegen: ahvNeBeitragsbasisVermoegen,
        rentenJahr: einnahmenBvgRente * 0.5 + einnahmenAhv * 0.5,
      });
    }

    const ausgabenTotal =
      ausgabenHaushalt +
      ausgabenSteuern +
      ausgabenEinmalig +
      ausgabenLaufend +
      ausgabenSelbstaendigAhv +
      ausgabenSozialBvg +
      ausgabenVorsorge3a +
      ausgabenPkEinkauf +
      ausgabenAhvNe +
      ausgabenHypozins +
      ausgabenHypoTilgung +
      ausgabenSchenkung +
      ausgabenAlimente;

    // ─── Saldo ───────────────────────────────────────────────────
    const saldo = einnahmenTotal - ausgabenTotal;

    // ─── Vermögens-Update: pro Bucket fortschreiben ─────────────
    // 1. Block 7: jedes Item mit eigener Rendite verzinsen.
    //    Negative Saldi werden NICHT verzinst (kein Zinsgewinn auf
    //    Schulden — Liquid kann nicht negativ "Rendite" erzielen). Wenn
    //    der User explizit Schuldzins-Logik braucht, soll er einen
    //    Darlehen-Eintrag mit negativem Saldo + Zinssatz erfassen.
    //    Konto-Typ (Liquidität) wird NICHT verzinst — Bankkonto-Realität:
    //    0-0.25% p.a. Falls User Festgeld/Anlage will, soll er typ="depot"
    //    erfassen. Schützt gegen unrealistische Vermögens-Projektionen
    //    (Validierung Wullimann 2025: 1.5% auf 1.1M → +223k Drift vs Taxware).
    for (const b of block7) {
      if (b.saldo > 0 && b.item.typ !== "konto") {
        b.saldo *= 1 + b.item.renditeProzent / 100;
      }
    }
    // 2. Hauptkonto bekommt Cashflow-Saldo + Kapitalauszahlungen aus Vorsorge/
    //    Immo-Verkauf/Firma-Verkauf
    if (hauptkontoIdx >= 0) {
      const hk = block7[hauptkontoIdx]!;
      hk.saldo += saldo + kapAuszahlungen;
      // Liquidations-Wasserfall: wenn Hauptkonto < 0 → erst andere Konten,
      // dann Depots anzapfen. Vorsorge bleibt geschützt (gesperrt bis Bezug),
      // Immobilien werden NICHT zwangsverkauft (Berater sieht negatives Netto
      // als Signal). Reihenfolge stabil über Block-Reihenfolge.
      if (hk.saldo < 0) {
        for (let i = 0; i < block7.length && hk.saldo < 0; i++) {
          if (i === hauptkontoIdx) continue;
          const other = block7[i]!;
          if (other.item.typ === "darlehen") continue;
          if (other.saldo <= 0) continue;
          const needed = -hk.saldo;
          const take = Math.min(needed, other.saldo);
          other.saldo -= take;
          hk.saldo += take;
        }
      }
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
    const vermoegenImmobilien = immobilienWertAmJahresende(state, jahr);

    // 6. Firma-Bucket: möglicher Verkaufserlös solange noch nicht verkauft
    const vermoegenFirma = firmaWertAmJahresende(state.firma, jahr);

    // 7. Schulden: Hypotheken auf noch gehaltenen Liegenschaften + Darlehen
    const hypothekenStand = hypothekenAmJahresende(state, jahr);
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
      einnahmenErbschaft: Math.round(einnahmenErbschaft),
      einnahmenTotal: Math.round(einnahmenTotal),
      ausgabenHaushalt: Math.round(ausgabenHaushalt),
      ausgabenSteuern: Math.round(ausgabenSteuern),
      ausgabenSteuernEinkommen: Math.round(steuern.einkommen),
      ausgabenSteuernEinkommenBund: Math.round(steuern.einkommenBund),
      ausgabenSteuernEinkommenKanton: Math.round(steuern.einkommenKanton),
      steuerbaresEinkommen: Math.round(
        steuern.steuerbaresEinkommenKanton ?? 0
      ),
      ausgabenSteuernVermoegen: Math.round(steuern.vermoegen),
      ausgabenSteuernKapital: Math.round(steuern.kapital),
      ausgabenSteuernKapitalBund: Math.round(steuern.kapitalBund),
      ausgabenSteuernKapitalKanton: Math.round(steuern.kapitalKanton),
      ausgabenSozialBvg: Math.round(ausgabenSozialBvg),
      ausgabenVorsorge3a: Math.round(ausgabenVorsorge3a),
      ausgabenPkEinkauf: Math.round(ausgabenPkEinkauf),
      ausgabenAhvNe: Math.round(ausgabenAhvNe),
      ausgabenHypozins: Math.round(ausgabenHypozins),
      ausgabenSchenkung: Math.round(ausgabenSchenkung),
      ausgabenAlimente: Math.round(ausgabenAlimente),
      eigenmietwertJahr: Math.round(eigenmietwertJahr),
      schuldzinsenAbzug: Math.round(schuldzinsenAbzug),
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

/**
 * Jahres-Faktor für PK-Rentenauszahlung im Bezugsstart-Jahr.
 *
 * Analog zur AHV (Folgemonat nach Erreichen des Bezugsalters), aber ohne
 * 13. Rente — Divisor 12.
 *
 * - Vor Bezugsstart: 0
 * - Nach Bezugsstart (volles Jahr): 1
 * - Bezugsstart-Jahr: (13 - startMonat) / 12 (Aug-Dez = 5/12)
 */
function pkJahresFaktor(jahr: number, start: AhvBezugsStart | null): number {
  if (!start) return 0;
  if (jahr < start.jahr) return 0;
  if (jahr > start.jahr) return 1;
  return (13 - start.monat) / 12;
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

/** Erwerbseinkommen für eine spezifische Person (filter über personIdx). */
function erwerbseinkommenJahrPerson(
  perioden: Einkommensperiode[],
  jahr: number,
  personIdx: 1 | 2
): number {
  let total = 0;
  for (const p of perioden) {
    if (p.personIdx !== personIdx) continue;
    if (p.betragMonatlich == null) continue;
    const von = parseYearMonth(p.von);
    const bis = parseYearMonth(p.bis);
    const aktivMonate = aktiveMonateImJahr(jahr, von, bis);
    total += p.betragMonatlich * aktivMonate;
  }
  return total;
}

/** Erwerbs-Monate im Jahr für Person (max 12). Für NE-Pro-Rata-Berechnung. */
function erwerbsMonateJahrPerson(
  perioden: Einkommensperiode[],
  jahr: number,
  personIdx: 1 | 2
): number {
  let maxMonate = 0;
  for (const p of perioden) {
    if (p.personIdx !== personIdx) continue;
    if (p.betragMonatlich == null || p.betragMonatlich <= 0) continue;
    const von = parseYearMonth(p.von);
    const bis = parseYearMonth(p.bis);
    const aktivMonate = aktiveMonateImJahr(jahr, von, bis);
    if (aktivMonate > maxMonate) maxMonate = aktivMonate;
  }
  return Math.min(12, maxMonate);
}

/**
 * V5: Selbständigkeits-Einkommen im Jahr (Σ aktive Perioden mit typ="selbstaendigkeit").
 * Wird für zusätzlichen AHV-Beitrags-Cashflow verwendet.
 */
function selbstaendigEinkommenJahr(
  perioden: Einkommensperiode[],
  jahr: number
): number {
  let total = 0;
  for (const p of perioden) {
    if (p.typ !== "selbstaendigkeit") continue;
    if (p.betragMonatlich == null) continue;
    const von = parseYearMonth(p.von);
    const bis = parseYearMonth(p.bis);
    const aktivMonate = aktiveMonateImJahr(jahr, von, bis);
    total += p.betragMonatlich * aktivMonate;
  }
  return total;
}

/**
 * V5: AHV/IV/EO-Beitrags-Mehraufwand für Selbständige.
 * Stand 2025: Selbständige zahlen 10.0 % AHV + 1.4 % IV + 0.5 % EO = 11.9 %
 * direkt selbst (statt nur 5.3 % bei AN-Anstellung). Differenz ~5.85 %
 * wird als zusätzliche Cashflow-Ausgabe gebucht (ja, Engine modelliert
 * Erwerb als "Netto" → bei Selbständigkeit muss Brutto-AHV-Last sichtbar
 * werden).
 *
 * Bei sehr tiefem Einkommen (< CHF 9'800) gilt absoluter Mindestbeitrag,
 * hier vereinfacht.
 */
const SELBSTAENDIG_AHV_MEHRSATZ = 0.0585;

function selbstaendigAhvMehraufwandJahr(
  perioden: Einkommensperiode[],
  jahr: number
): number {
  return Math.round(
    selbstaendigEinkommenJahr(perioden, jahr) * SELBSTAENDIG_AHV_MEHRSATZ
  );
}

/** Total 3a- oder 3b-Einzahlungen einer Person im Jahr — filterbar per
 *  `nurSaeule`. 3a wirkt als Steuer-Abzug, 3b nur als Cashflow-Ausgabe. */
function saeuleDreiEinzahlungJahr(
  entries: {
    jaehrlicheEinzahlung: number | null;
    einzahlungAb: number;
    einzahlungBis: number;
    saeule?: "3a" | "3b";
  }[],
  jahr: number,
  nurSaeule?: "3a" | "3b"
): number {
  let total = 0;
  for (const e of entries) {
    if (e.jaehrlicheEinzahlung == null) continue;
    if (jahr < e.einzahlungAb) continue;
    if (e.einzahlungBis > 0 && jahr > e.einzahlungBis) continue;
    // Default "3a" für Legacy-Items ohne saeule-Feld
    const sub = e.saeule ?? "3a";
    if (nurSaeule && sub !== nurSaeule) continue;
    total += e.jaehrlicheEinzahlung;
  }
  return total;
}

/**
 * Prüft, ob ein einzelner PK-Einkauf in einem konkreten Jahr aktiv ist.
 * Einzel-Einkauf (serie=false): wirkt genau im Startjahr.
 * Serie (serie=true): wirkt jährlich vom Startjahr bis bisJahr (inkl.).
 */
function einkaufAktivImJahr(
  e: import("@/lib/store").EinkaufEntry,
  jahr: number
): boolean {
  if (e.betrag == null || e.betrag <= 0) return false;
  if (!e.serie) return e.jahr === jahr;
  const bis = e.bisJahr ?? e.jahr;
  return jahr >= e.jahr && jahr <= bis;
}

/**
 * PK-Einkauf-Summe pro Jahr: summiert betrag aller Einkäufe (Einzel + Serie),
 * die im Cashflow-Jahr aktiv sind — beide Personen (bei Paar).
 * Wirkt als Ausgabe + Steuer-Abzug + Saldo-Hochlauf.
 */
function pkEinkaufSummeJahr(state: CashflowInput, jahr: number): number {
  let total = 0;
  for (const e of state.bvg.p1.einkaeufe) {
    if (einkaufAktivImJahr(e, jahr)) total += e.betrag ?? 0;
  }
  if (state.fallart === "paar") {
    for (const e of state.bvg.p2.einkaeufe) {
      if (einkaufAktivImJahr(e, jahr)) total += e.betrag ?? 0;
    }
  }
  return total;
}

/**
 * Expandiert Einkauf-Entries (Einzel + Serie) zu (jahr, betrag)-Paaren für
 * die BVG-Hochlauf-Berechnung. Serien werden in einzelne Jahre aufgelöst.
 */
function expandEinkaeufe(
  einkaeufe: import("@/lib/store").EinkaufEntry[]
): { jahr: number; betrag: number }[] {
  const out: { jahr: number; betrag: number }[] = [];
  for (const e of einkaeufe) {
    if (e.betrag == null || e.betrag <= 0) continue;
    if (!e.serie) {
      out.push({ jahr: e.jahr, betrag: e.betrag });
    } else {
      const bis = e.bisJahr ?? e.jahr;
      for (let y = e.jahr; y <= bis; y++) {
        out.push({ jahr: y, betrag: e.betrag });
      }
    }
  }
  return out;
}

/**
 * Summe Eigenmietwert über alle selbstbewohnten Liegenschaften, die im
 * Jahr noch gehalten werden. Default-Prozentsatz: 1.13 % vom Verkehrswert
 * (ZH-Median). Pro Liegenschaft konfigurierbar via eigenmietwertProzent.
 * Verkehrswert wird auf das Jahr hochgerechnet (gleiche Logik wie
 * immobilieWert).
 */
const DEFAULT_EIGENMIETWERT_PROZENT = 1.13;

function eigenmietwertJahrTotal(state: CashflowInput, jahr: number): number {
  if (!eigenmietwertAktivImJahr(jahr)) return 0;
  const heute = new Date().getFullYear();
  let total = 0;
  for (const im of state.immobilien.items) {
    if (im.typ !== "selbstbewohnt") continue;
    if (im.verkehrswert == null) continue;
    if (immobilieAbgegeben(im, jahr)) continue;
    const prozent = im.eigenmietwertProzent ?? DEFAULT_EIGENMIETWERT_PROZENT;
    const wert = immobilieWert(im, jahr, heute);
    total += (wert * prozent) / 100;
  }
  return Math.round(total);
}

/**
 * True wenn der Plan mindestens eine selbstbewohnte Liegenschaft enthält
 * (unabhängig von Jahr / Verkauf). Triggert die UI-Banner und den
 * Schuldzinsabzug-Pfad.
 */
export function hatSelbstbewohnteLiegenschaft(
  immobilien: { typ: string }[]
): boolean {
  return immobilien.some((i) => i.typ === "selbstbewohnt");
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
): { haushalt: number; p1Einzel: number; p2Einzel: number } {
  // Override-Pfad: wenn User echte AHV-Rente aus IK-Auszug eingetragen hat
  // (z.B. bei Geschiedenen mit Splitting bereits im IK), nutzen wir den
  // Wert direkt statt Skala-44-Berechnung.
  const override1 = state.ahv.ahvRenteJahrEffektivP1;
  const override2 = state.ahv.ahvRenteJahrEffektivP2;

  const e1 = state.ahv.einkommenP1;
  const fehljahreP1 = state.ahv.hatFehljahreP1 ? state.ahv.fehljahreAnzahlP1 : 0;
  const bezugsalterP1 = clampAhvAlter(state.ahv.ahvBezugsalterP1);

  const gjP1 = state.person1.geburtsdatum
    ? Number.parseInt(state.person1.geburtsdatum.slice(0, 4), 10)
    : undefined;
  // Override = Vollrente Skala 44 bei ordentlichem Bezugsalter (BSV-Prognose /
  // IK-Auszug-Output). Vorbezugskürzung + 13. AHV werden hier draufgerechnet,
  // analog zum Skala-44-Pfad in ahvJahresrenteEinzel.
  const ahv21CtxP1 =
    gjP1 != null && e1 != null
      ? { geburtsjahr: gjP1, geschlecht: state.person1.geschlecht, massgebendesEinkommen: e1 }
      : undefined;
  const ordAlterP1 =
    gjP1 != null
      ? ordentlichesAhvAlter(gjP1, state.person1.geschlecht ?? null)
      : ORDENTLICHES_AHV_ALTER;
  const bfP1Override = bezugsfaktor(bezugsalterP1, ordAlterP1, ahv21CtxP1);
  const dfP1Override = dreizehnteAhvFaktor(bezugsjahrP1 ?? new Date().getFullYear());
  const p1Einzel =
    override1 != null && override1 > 0
      ? Math.round(override1 * bfP1Override * dfP1Override)
      : e1 != null
        ? ahvJahresrenteEinzel({
            massgebendesEinkommen: e1,
            fehljahre: fehljahreP1,
            bezugsalter: bezugsalterP1,
            bezugsjahr: bezugsjahrP1 ?? new Date().getFullYear(),
            geburtsjahr: gjP1,
            geschlecht: state.person1.geschlecht,
          }).jahresrente
        : 0;

  if (state.fallart === "einzel") {
    return { haushalt: p1Einzel, p1Einzel, p2Einzel: 0 };
  }

  const e2 = state.ahv.einkommenP2;
  const fehljahreP2 = state.ahv.hatFehljahreP2 ? state.ahv.fehljahreAnzahlP2 : 0;
  const bezugsalterP2 = clampAhvAlter(state.ahv.ahvBezugsalterP2);

  const gjP2 = state.person2.geburtsdatum
    ? Number.parseInt(state.person2.geburtsdatum.slice(0, 4), 10)
    : undefined;
  const ahv21CtxP2 =
    gjP2 != null && e2 != null
      ? { geburtsjahr: gjP2, geschlecht: state.person2.geschlecht, massgebendesEinkommen: e2 }
      : undefined;
  const ordAlterP2 =
    gjP2 != null
      ? ordentlichesAhvAlter(gjP2, state.person2.geschlecht ?? null)
      : ORDENTLICHES_AHV_ALTER;
  const bfP2Override = bezugsfaktor(bezugsalterP2, ordAlterP2, ahv21CtxP2);
  const dfP2Override = dreizehnteAhvFaktor(bezugsjahrP2 ?? new Date().getFullYear());
  const p2Einzel =
    override2 != null && override2 > 0
      ? Math.round(override2 * bfP2Override * dfP2Override)
      : e2 != null
        ? ahvJahresrenteEinzel({
            massgebendesEinkommen: e2,
            fehljahre: fehljahreP2,
            bezugsalter: bezugsalterP2,
            bezugsjahr: bezugsjahrP2 ?? new Date().getFullYear(),
            geburtsjahr: gjP2,
            geschlecht: state.person2.geschlecht,
          }).jahresrente
        : 0;

  // Konkubinat: jeder bezieht seine eigene Einzelrente, KEIN Splitting,
  // KEIN Plafond (gilt nur für Ehe + eingetragene Partnerschaft).
  // p1Einzel/p2Einzel sind bereits ohne Splitting berechnet → summieren.
  if (istKonkubinat(state)) {
    return { haushalt: p1Einzel + p2Einzel, p1Einzel, p2Einzel };
  }

  // Ehepaar-Rente: wenn beide Override haben, einfach summieren mit Plafond
  // CHF 45'360 (150% Max einzelne Rente) × 13/12 ab 2026 (13. AHV).
  // BSV-Praxis: Override-Werte aus IK-Auszug sind bereits die nach Splitting
  // korrigierten Renten — Cuira plafondiert auf gemeinsamen Ehepaar-Cap.
  let haushalt: number;
  if (override1 != null && override1 > 0 && override2 != null && override2 > 0) {
    const refJahr = Math.max(
      bezugsjahrP1 ?? new Date().getFullYear(),
      bezugsjahrP2 ?? new Date().getFullYear()
    );
    // Plafond inkl. 13. AHV ab 2026 + Konkubinat-Klammer
    const plafond = istKonkubinat(state)
      ? Number.POSITIVE_INFINITY // bei Konkubinat kein Plafond (bereits oben behandelt)
      : 45_360 * dreizehnteAhvFaktor(refJahr);
    // p1Einzel/p2Einzel sind bereits Vorbezug-/Aufschub-korrigiert + inkl. 13. AHV.
    haushalt = Math.min(plafond, p1Einzel + p2Einzel);
  } else if (e1 != null && e2 != null) {
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
    haushalt = out.haushaltsRente;
  } else {
    // Mixed: ein Override gesetzt, anderer nicht → einfache Summe der
    // beiden Einzelrenten (kein voller Splitting-Effekt)
    haushalt = p1Einzel + p2Einzel;
  }

  return { haushalt, p1Einzel, p2Einzel };
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

/**
 * Annahme: altersguthabenBeiBezug ist die PK-Ausweis-Projektion auf das
 * ordentliche AHV-Alter (65). Bei Frühpension (bezugsalter < 65) reduzieren
 * wir den Wert linear zwischen altersguthabenHeute und altersguthabenBeiBezug.
 * Bei Aufschub (bezugsalter > 65) wachsen wir den Saldo mit BVG-Mindestzins
 * weiter (annahme: keine zusätzlichen Sparbeiträge nach 65; konservativ).
 * Vereinfachung: ±2-3% Fehler vs. exakter Sparphasen-Mathematik (siehe CLAUDE.md).
 */
function pkAltersguthabenBeiAlter(
  p: BvgPersonInput,
  geburt: string,
  bezugsalter: number
): number {
  if (p.altersguthabenBeiBezug == null) return 0;
  if (p.altersguthabenHeute == null) return p.altersguthabenBeiBezug;
  const gj = Number.parseInt(geburt.slice(0, 4), 10);
  if (!Number.isFinite(gj)) return p.altersguthabenBeiBezug;
  const alterHeute = new Date().getFullYear() - gj;
  const ordAlter = ORDENTLICHES_AHV_ALTER;
  if (alterHeute >= ordAlter) return p.altersguthabenBeiBezug;
  // Aufschub > 65: Saldo wächst mit BVG-Mindestzins ohne neue Sparbeiträge
  if (bezugsalter > ordAlter) {
    const aufschubJahre = bezugsalter - ordAlter;
    return Math.round(
      p.altersguthabenBeiBezug * Math.pow(1 + BVG_MINDESTZINS, aufschubJahre)
    );
  }
  if (bezugsalter >= ordAlter) return p.altersguthabenBeiBezug;
  if (bezugsalter <= alterHeute) return p.altersguthabenHeute;
  const fraction =
    (bezugsalter - alterHeute) / (ordAlter - alterHeute);
  return Math.round(
    p.altersguthabenHeute +
      (p.altersguthabenBeiBezug - p.altersguthabenHeute) * fraction
  );
}

function bvgRentePerson(
  p: BvgPersonInput,
  geburt: string,
  bezugsalter: number
): number {
  if (!p.aktiverAnschluss || p.altersguthabenBeiBezug == null) return 0;
  if (p.bezugspraeferenz === "kapital") return 0;
  const bj = pensionsjahr(geburt, bezugsalter) ?? new Date().getFullYear();
  const ekGueltig = expandEinkaeufe(p.einkaeufe);
  // WEF-Vorbezüge bis Bezugsjahr mindern das Altersguthaben für die
  // Renten-Berechnung (Vereinfachung: ohne Verzinsungs-Verlust-Approximation,
  // weil das beim altersguthabenBeiBezug-Wert vom PK-Ausweis schon
  // implizit drin sein kann).
  const wefBisBezug = wefSummeBis(p, bj);
  // Frühpension-Korrektur: altersguthabenBeiBezug an tatsächliches bezugsalter
  // anpassen (linearer Hochlauf zwischen heute und ord. AHV-Alter).
  const guthabenBeiBezug = pkAltersguthabenBeiAlter(p, geburt, bezugsalter);
  const ausgangssaldo = Math.max(0, guthabenBeiBezug - wefBisBezug);
  const saldo = bvgGesamtkapitalBeiBezug({
    altersguthabenBeiBezug: ausgangssaldo,
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
  const ekGueltig = expandEinkaeufe(p.einkaeufe);
  // WEF-Vorbezüge mindern Bezugskapital (siehe bvgRentePerson)
  const wefBisBezug = wefSummeBis(p, bj);
  // Frühpension-Korrektur (siehe bvgRentePerson)
  const guthabenBeiBezug = pkAltersguthabenBeiAlter(p, geburt, bezugsalter);
  const ausgangssaldo = Math.max(0, guthabenBeiBezug - wefBisBezug);
  const saldo = bvgGesamtkapitalBeiBezug({
    altersguthabenBeiBezug: ausgangssaldo,
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
    if (immobilieAbgegeben(im, jahr)) continue;
    // Vor Kaufjahr: keine Mieteinnahmen
    if (im.kaufjahr != null && im.kaufjahr > 0 && jahr < im.kaufjahr) continue;
    total += im.jaehrlicheMieteinnahmen;
  }
  return total;
}

/**
 * Auszahlungen aus Säule-3b-Versicherungen im Jahr. Diese sind steuerfrei
 * (Ablaufswert wird nicht zur Kapitalleistungssteuer herangezogen), fliessen
 * aber genauso ins Hauptkonto wie 3a.
 */
function saeule3bAuszahlungenJahr(state: CashflowInput, jahr: number): number {
  let total = 0;
  for (const items of [state.saeuleDrei.p1, state.saeuleDrei.p2]) {
    for (const it of items) {
      if ((it.saeule ?? "3a") !== "3b") continue;
      const a = saeuleDreiAuszahlung(it);
      if (a && a.jahr === jahr) total += a.betrag;
    }
  }
  return total;
}

function kapitalauszahlungenJahr(
  state: CashflowInput,
  jahr: number,
  bvgKap: ReturnType<typeof computeBvgKapitalAuszahlungen>
): number {
  let total = 0;

  // PK-Kapitalauszahlung
  if (bvgKap.p1.jahr === jahr) total += bvgKap.p1.betrag;
  if (bvgKap.p2.jahr === jahr) total += bvgKap.p2.betrag;

  // 3a- + 3b-Auszahlungen — beide gehen aufs Hauptkonto. ABER für die
  // Steuer-Bemessung wird unten via kapAuszahlungenFuerSteuerKap nur 3a
  // berücksichtigt (3b ist steuerfrei).
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

  // Immobilien-Verkauf — netto nach Grundstückgewinnsteuer
  // GGSt wird auf den Reingewinn (Verkehrswert − Anlagekosten) berechnet
  // und vom Brutto-Erlös (Verkehrswert − Hypothek) abgezogen. Der
  // Kanton kommt aus state.adresse — bei unbekannten Kantonen fällt
  // die Engine auf "andere"-Tarif (≈ ZH-Median) zurück.
  // Verkehrswert wird auf das Verkaufsjahr hochgerechnet (default 1.5 %/J).
  const heuteJahr = new Date().getFullYear();
  for (const im of state.immobilien.items) {
    if (im.plan !== "verkaufen") continue;
    if (im.verkaufsjahr !== jahr) continue;
    if (im.verkehrswert == null) continue;
    const hypo = im.hypotheken.reduce((s, h) => s + (h.hoehe ?? 0), 0);
    const verkehrswertImVerkaufsjahr = immobilieWert(im, jahr, heuteJahr);
    const auszahlung = immobilienVerkaufsAuszahlungNetto(
      {
        verkehrswert: verkehrswertImVerkaufsjahr,
        hypothekenSumme: hypo,
        plan: im.plan,
        verkaufsjahr: im.verkaufsjahr,
        kaufjahr: im.kaufjahr,
        anlagekosten: im.anlagekosten,
        wertvermehrendeInvestitionen: im.wertvermehrendeInvestitionen,
      },
      // GGSt fällt am Liegenschafts-Kanton an (eigene Adresse) — fallback
      // auf Wohnsitz wenn keine eigene Adresse erfasst.
      im.adresse?.kanton || state.adresse.kanton || ""
    );
    if (auszahlung) total += auszahlung.netto;
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

/**
 * Netto-Verkaufserlös aller im Jahr veräusserten Immobilien
 * (= Brutto-Verkehrswert − Hypothekensumme − Grundstückgewinnsteuer).
 *
 * Wird benötigt, um den Erlös aus der Bemessungsgrundlage der Kapital-
 * leistungs-Sondertarif-Steuer auszuklammern: Immobilien-Gewinne unter-
 * liegen ausschliesslich der GGSt, NICHT dem Kapitalleistungs-Sondertarif
 * (dieser gilt nur für Vorsorge-Kapital aus PK / 3a / FZ — sowie 1/5 des
 * Liquidationsgewinns bei Geschäftsaufgabe ≥ Alter 55, Art. 37b DBG).
 */
function immobilienVerkaufErloesJahr(state: CashflowInput, jahr: number): number {
  const heuteJahr = new Date().getFullYear();
  let total = 0;
  for (const im of state.immobilien.items) {
    if (im.plan !== "verkaufen") continue;
    if (im.verkaufsjahr !== jahr) continue;
    if (im.verkehrswert == null) continue;
    const hypo = im.hypotheken.reduce((s, h) => s + (h.hoehe ?? 0), 0);
    const verkehrswertImVerkaufsjahr = immobilieWert(im, jahr, heuteJahr);
    const auszahlung = immobilienVerkaufsAuszahlungNetto(
      {
        verkehrswert: verkehrswertImVerkaufsjahr,
        hypothekenSumme: hypo,
        plan: im.plan,
        verkaufsjahr: im.verkaufsjahr,
        kaufjahr: im.kaufjahr,
        anlagekosten: im.anlagekosten,
        wertvermehrendeInvestitionen: im.wertvermehrendeInvestitionen,
      },
      im.adresse?.kanton || state.adresse.kanton || ""
    );
    if (auszahlung) total += auszahlung.netto;
  }
  return total;
}

/**
 * Haushaltsausgaben/Jahr — Wunschverbrauch in Pension, sonst aktuelles
 * Budget (total oder detailliert summiert), mal 12.
 *
 * Inflation: wenn `budget.inflationProzent` gesetzt ist (>0 %), wird das
 * Nominal-Ergebnis mit `(1 + p/100)^(jahr − heuteJahr)` hochskaliert. Für
 * `jahr <= heuteJahr` oder `inflationProzent` null/≤0 bleibt das Ergebnis
 * nominal (= bisheriges Verhalten). Wirkt sowohl auf Wunschverbrauch in
 * Pension als auch auf das Vor-Pension-Budget (egal ob total oder
 * detailliert) — die Inflation läuft konsistent über den gesamten Horizont.
 */
function haushaltsausgabenJahr(
  budget: CashflowInput["budget"],
  istPensioniert: boolean,
  jahr: number,
  heuteJahr: number
): number {
  let basis = 0;
  if (istPensioniert && budget.wunschverbrauchPension != null) {
    basis = budget.wunschverbrauchPension * 12;
  } else if (budget.ausgabenModus === "total" && budget.ausgabenTotal != null) {
    basis = budget.ausgabenTotal * 12;
  } else if (budget.ausgabenModus === "detailliert") {
    // ?? {} schützt vor Crash, wenn ausgabenKategorien fehlt (alter
    // persistierter State oder importiertes JSON mit unvollständigem Budget).
    const sum = Object.values(budget.ausgabenKategorien ?? {}).reduce(
      (s, v) => s + (v ?? 0),
      0
    );
    basis = sum * 12;
  }

  // Inflations-Toggle: opt-in via Budget.inflationProzent. Wir greifen
  // safe auf das Feld zu — alter LocalStorage-State ohne v44-Migration
  // (theoretisch unmöglich, aber defensive) würde `undefined` liefern.
  const p = (budget as { inflationProzent?: number | null }).inflationProzent;
  if (p == null || p <= 0 || jahr <= heuteJahr) return basis;
  const faktor = Math.pow(1 + p / 100, jahr - heuteJahr);
  return basis * faktor;
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

/**
 * Laufende temporäre Ausgaben pro Jahr (Studium, Schulden, Ausbildung).
 * Wirkt Pro-Rata pro Monat aktiv (von/bis). Leer = ganzes Jahr.
 */
function laufendeAusgabenJahr(
  ausgaben: CashflowInput["laufendeAusgaben"] | undefined,
  jahr: number
): number {
  if (!ausgaben) return 0;
  let total = 0;
  for (const a of ausgaben) {
    if (a.betragMonatlich == null) continue;
    const von = parseYearMonth(a.von);
    const bis = parseYearMonth(a.bis);
    const aktivMonate = aktiveMonateImJahr(jahr, von, bis);
    total += a.betragMonatlich * aktivMonate;
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
/**
 * Summe der WEF-Vorbezüge bis (und einschliesslich) eines Jahres.
 * Nach einem WEF-Vorbezug ist das PK-Altersguthaben um diesen Betrag
 * (plus Verzinsung-Verlust) niedriger.
 */
function wefSummeBis(p: BvgPersonInput, jahr: number): number {
  return (p.wefVorbezuege ?? []).reduce(
    (s, e) => s + (e.betrag ?? 0) * (e.jahr <= jahr ? 1 : 0),
    0
  );
}

/**
 * Summe aller WEF-Vorbezüge im konkreten Jahr (P1 + P2). Wird zur
 * Kapitalauszahlungs-Steuer-Bemessung addiert, fliesst aber NICHT zum
 * Hauptkonto (Geld geht direkt ins Eigenheim — siehe wefSummeFuerImmoBis).
 */
function wefVorbezugJahr(state: CashflowInput, jahr: number): number {
  const sumP1 = (state.bvg.p1.wefVorbezuege ?? [])
    .filter((e) => e.jahr === jahr && e.betrag != null)
    .reduce((s, e) => s + (e.betrag ?? 0), 0);
  const sumP2 =
    state.fallart === "paar"
      ? (state.bvg.p2.wefVorbezuege ?? [])
          .filter((e) => e.jahr === jahr && e.betrag != null)
          .reduce((s, e) => s + (e.betrag ?? 0), 0)
      : 0;
  return sumP1 + sumP2;
}

/**
 * Default-Immobilie für WEF-Bezüge ohne explizite Zuordnung: erste
 * selbstbewohnte Immobilie, die im betreffenden Jahr noch gehalten wird.
 */
function defaultWefImmoId(state: CashflowInput, jahr: number): string | null {
  const im = state.immobilien.items.find(
    (x) => x.typ === "selbstbewohnt" && !immobilieAbgegeben(x, jahr)
  );
  return im?.id ?? null;
}

/**
 * Summe aller WEF-Bezüge (P1 + P2), die einer bestimmten Immobilie
 * zugeordnet sind und bis zum Jahr (inkl.) stattgefunden haben.
 * Einträge ohne explizite immoId fallen auf die Default-Immobilie zurück.
 */
function wefSummeFuerImmoBis(
  state: CashflowInput,
  immoId: string,
  jahr: number
): number {
  const fallback = defaultWefImmoId(state, jahr);
  const allEntries = [
    ...(state.bvg.p1.wefVorbezuege ?? []),
    ...(state.fallart === "paar" ? (state.bvg.p2.wefVorbezuege ?? []) : []),
  ];
  return allEntries
    .filter((e) => e.betrag != null && e.jahr <= jahr)
    .filter((e) => (e.immoId ?? fallback) === immoId)
    .reduce((s, e) => s + (e.betrag ?? 0), 0);
}

/**
 * PK-Saldo in der Sparphase — versicherungsmathematischer Hochlauf
 * (compound) vom Altersguthaben heute zum voraussichtlichen Altersguthaben
 * bei Bezug, abzüglich WEF-Vorbezüge.
 *
 * Modell:
 *   FV = PV × (1+r)^n + S × ((1+r)^n − 1) / r
 *   - PV = altersguthabenHeute
 *   - FV = altersguthabenBeiBezug (vom PK-Ausweis)
 *   - n  = bezugsjahr − jetzt
 *   - r  = BVG-Mindestzins 1.25 % p.a. (annährungsweise)
 *   - S  = jährliche Spargutschrift, abgeleitet aus PV/FV/n/r
 *
 * Für Jahr k (mit 0 ≤ k ≤ n):
 *   saldo(k) = PV × (1+r)^k + S × ((1+r)^k − 1) / r
 *
 * Dadurch konkaver Verlauf statt linear — entspricht der echten
 * Sparphasen-Mathematik aus dem PK-Reglement (Zinseszins + Sparbeitrag).
 *
 * Logik:
 *   - kein aktiver Anschluss → 0
 *   - keine PV/FV Daten → 0
 *   - jahr ≥ bezugsjahr → 0 (Kapital auf Hauptkonto via kapAuszahlungenJahr)
 *   - sonst: versicherungsmath. Hochlauf, minus WEF-Vorbezüge bis Jahr
 */
const BVG_MINDESTZINS = 0.0125; // 1.25 % p.a. (Stand 2025)

function pkSaldoSparphase(
  p: BvgPersonInput,
  jahr: number,
  bezugsjahr: number | null,
  jetzt: number
): number {
  if (!p.aktiverAnschluss) return 0;

  const heute = p.altersguthabenHeute;
  const beiBezug = p.altersguthabenBeiBezug;

  if (heute == null && beiBezug == null) return 0;
  if (bezugsjahr != null && jahr >= bezugsjahr) return 0;

  const wefSumme = wefSummeBis(p, jahr);
  // Tiago-Fix: PK-Einkäufe bis zum aktuellen Jahr inkl. addieren (sichtbar
  // im Vorsorge-Vermögen statt nur im Bezugsjahr).
  const einkaufSummeBis = einkaufSummeBisJahr(p.einkaeufe, jahr);

  if (bezugsjahr == null || beiBezug == null) {
    return Math.max(0, (heute ?? beiBezug ?? 0) - wefSumme + einkaufSummeBis);
  }
  if (heute == null) return Math.max(0, beiBezug - wefSumme);
  if (bezugsjahr <= jetzt) return Math.max(0, beiBezug - wefSumme);
  if (jahr <= jetzt) return Math.max(0, heute - wefSumme + einkaufSummeBis);

  // Versicherungsmathematischer Hochlauf
  const n = bezugsjahr - jetzt;
  const k = jahr - jetzt;
  const r = BVG_MINDESTZINS;

  // Y-1a H-1 Guard: n=0 wäre Division-durch-0; n<=0 sollte oben gefangen sein.
  if (n <= 0) return Math.max(0, beiBezug - wefSumme);

  // Sparbeitrag S rückwärts aus FV / PV / n / r ableiten
  const pvAufgezinst = heute * Math.pow(1 + r, n);
  const annuitaetsFaktor = (r as number) === 0 ? n : (Math.pow(1 + r, n) - 1) / r;
  const rohSparBeitrag = (beiBezug - pvAufgezinst) / annuitaetsFaktor;
  const sparBeitrag = Math.max(0, rohSparBeitrag);

  // Saldo nach k Jahren
  const compoundedPv = heute * Math.pow(1 + r, k);
  const kompoFaktorK = (r as number) === 0 ? k : (Math.pow(1 + r, k) - 1) / r;
  const saldoOhneEinkauf = Math.round(compoundedPv + sparBeitrag * kompoFaktorK);
  // Tiago-Fix: PK-Einkäufe bis jahr zusätzlich addiert (Mindestzins-verzinst
  // ab Einkauf-Jahr). Macht Vorsorge-Sprung im Cashflow sichtbar.
  return Math.max(0, saldoOhneEinkauf - wefSumme + einkaufSummeBis);
}

/**
 * Summe aller PK-Einkäufe bis und mit Jahr (inkl.) — mit Mindestzins
 * ab Einkauf-Jahr bis aktuelles Jahr verzinst.
 */
function einkaufSummeBisJahr(
  einkaeufe: import("@/lib/store").EinkaufEntry[],
  jahr: number
): number {
  const r = BVG_MINDESTZINS;
  let total = 0;
  for (const e of einkaeufe) {
    if (e.betrag == null || e.betrag <= 0) continue;
    if (!e.serie) {
      if (e.jahr <= jahr) {
        const verzinsungsJahre = Math.max(0, jahr - e.jahr);
        total += e.betrag * Math.pow(1 + r, verzinsungsJahre);
      }
    } else {
      const bis = e.bisJahr ?? e.jahr;
      for (let j = e.jahr; j <= bis && j <= jahr; j++) {
        const verzinsungsJahre = Math.max(0, jahr - j);
        total += e.betrag * Math.pow(1 + r, verzinsungsJahre);
      }
    }
  }
  return Math.round(total);
}

function vorsorgeVermoegenAmJahresende(
  state: CashflowInput,
  jahr: number,
  pkBezugsjahrP1: number | null,
  pkBezugsjahrP2: number | null,
  bvgKap: ReturnType<typeof computeBvgKapitalAuszahlungen>
): number {
  let total = 0;
  const jetzt = new Date().getFullYear();

  // PK-Sparphase: linearer Hochlauf vom Altersguthaben heute zum
  // voraussichtlichen Altersguthaben bei Bezug. Vor Bezug → interpolierter
  // Wert; nach Bezug → 0 (Kapital auf Hauptkonto, Rente fliesst als Cashflow).
  //
  // Vereinfachung: linearer Hochlauf statt echter Sparphasen-Mathematik
  // (Beiträge × Verzinsung = leichter S-förmiger Verlauf). Bei normalen
  // Karrieren ist der Fehler ±2-3% zur exakten Kurve.
  total += pkSaldoSparphase(
    state.bvg.p1,
    jahr,
    pkBezugsjahrP1,
    jetzt
  );
  if (state.fallart === "paar") {
    total += pkSaldoSparphase(
      state.bvg.p2,
      jahr,
      pkBezugsjahrP2,
      jetzt
    );
  }

  // 3a — pro Item bis Auszahlungs-/Ablaufjahr.
  // Konto: Saldo wächst Jahr für Jahr durch Einzahlung + Verzinsung.
  // Versicherung: statischer Wert (Rückkaufs-/Ablaufwert) — die Prämien
  // sind im Vertrag gesperrt, der ausgewiesene Wert wächst nicht linear
  // mit der Einzahlung (Versicherungsmathematik).
  for (const items of [state.saeuleDrei.p1, state.saeuleDrei.p2]) {
    for (const it of items) {
      if (it.type === "konto") {
        if (it.aktuellerWert == null) continue;
        if (jahr >= it.auszahlungsjahr) continue;
        const r = it.renditeProzent / 100;
        let saldo = it.aktuellerWert;
        // Pro Jahr von jetzt+1 bis jahr: ggf. Einzahlung addieren, dann verzinsen
        for (let y = jetzt + 1; y <= jahr; y++) {
          if (
            it.jaehrlicheEinzahlung != null &&
            y >= it.einzahlungAb &&
            (it.einzahlungBis === 0 || y <= it.einzahlungBis)
          ) {
            saldo += it.jaehrlicheEinzahlung;
          }
          saldo *= 1 + r;
        }
        total += saldo;
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

/**
 * True wenn die Liegenschaft im gegebenen Jahr nicht mehr in der Bilanz steht
 * — entweder verkauft oder an Nachkommen verschenkt (Erbvorbezug). In beiden
 * Fällen werden Verkehrswert und Hypothek per `verkaufsjahr` aus der Bilanz
 * genommen; der Unterschied liegt nur im Geldfluss (Verkauf = Netto-Erlös aufs
 * Hauptkonto + ggf. GGSt; Verschenken = kein Geldfluss, kein GGSt).
 */
function immobilieAbgegeben(
  im: { plan: import("@/lib/store").ImmobilienPlan; verkaufsjahr: number },
  jahr: number
): boolean {
  return (
    (im.plan === "verkaufen" || im.plan === "verschenken") &&
    jahr >= im.verkaufsjahr
  );
}

/**
 * Immobilien-Verkehrswert mit Wertsteigerung.
 *
 * Approximation: jährlich um wertsteigerungProzent (default 1.5 % —
 * historischer CH-Mittelwert für Wohneigentum) compound. Heute ist
 * der eingegebene `verkehrswert` der Anker.
 */
function immobilieWert(
  im: Immobilie,
  jahr: number,
  heute: number
): number {
  if (im.verkehrswert == null) return 0;
  // Vor Kaufjahr ist Immobilie noch nicht im Eigentum → 0
  // (Y-1c-Fix: Cuira buchte vorher Eigenheim ab heute auch bei Kauf in Zukunft)
  if (im.kaufjahr != null && im.kaufjahr > 0 && jahr < im.kaufjahr) return 0;
  const p = (im.wertsteigerungProzent ?? IMMO_WERTSTEIGERUNG_DEFAULT_PROZENT) / 100;
  // Wertsteigerung-Basis ist heute (oder Kaufjahr, falls in Zukunft)
  const basisJahr = im.kaufjahr != null && im.kaufjahr > heute ? im.kaufjahr : heute;
  const dauer = Math.max(0, jahr - basisJahr);
  return Math.round(im.verkehrswert * Math.pow(1 + p, dauer));
}

/**
 * Berechnet pro Immobilie die durch WEF-Bezüge angepasste Bilanz:
 *  • Hypothek wird primär durch WEF getilgt (max bis 0).
 *  • WEF-Überschuss (wenn Hypo bereits getilgt) erhöht den Verkehrswert
 *    — modelliert den initialen Eigenkapital-Einsatz beim Kauf.
 * So bleibt das Nettovermögen über den WEF-Bezug konstant (PK-Saldo
 * sinkt, Eigenheim-Position steigt um den gleichen Betrag).
 */
function immobilienBilanzAmJahresende(
  state: CashflowInput,
  jahr: number
): { aktiva: number; schulden: number } {
  const heute = new Date().getFullYear();
  let aktiva = 0;
  let schulden = 0;
  for (const im of state.immobilien.items) {
    if (im.verkehrswert == null) continue;
    if (immobilieAbgegeben(im, jahr)) continue;
    // Vor Kaufjahr: keine Aktiva, keine Hypothek
    if (im.kaufjahr != null && im.kaufjahr > 0 && jahr < im.kaufjahr) continue;

    const baseWert = immobilieWert(im, jahr, heute);
    // Pro Tranche: effektiver Stand nach Tilgungsplan
    const baseHypo = im.hypotheken.reduce(
      (s, h) => s + hypothekStandImJahr(h, jahr),
      0
    );
    const wefSumme = wefSummeFuerImmoBis(state, im.id, jahr);

    const hypoNetto = Math.max(0, baseHypo - wefSumme);
    const wefRest = Math.max(0, wefSumme - baseHypo);

    aktiva += baseWert + wefRest;
    schulden += hypoNetto;
  }
  return { aktiva, schulden };
}

/**
 * Effektiver Hypothek-Stand einer Tranche im gegebenen Jahr.
 * Berücksichtigt Tilgungsplan (Summe aller tilgungen mit jahr ≤ aktuellem jahr).
 * Stand kann nicht negativ werden.
 */
function hypothekStandImJahr(
  h: import("@/lib/store").Hypothek,
  jahr: number
): number {
  if (h.hoehe == null) return 0;
  let stand = h.hoehe;
  if (h.tilgungsplan && h.tilgungsplan.length > 0) {
    for (const t of h.tilgungsplan) {
      if (t.jahr <= jahr) stand -= Math.max(0, t.betrag);
    }
  }
  return Math.max(0, stand);
}

/**
 * Effektiver Zinssatz einer Tranche im gegebenen Jahr.
 * Vor `ablaufjahr`: zinssatzProzent. Ab `ablaufjahr`: refinanzierungZinssatz
 * wenn gesetzt, sonst zinssatzProzent (Default = keine Refi).
 */
function hypothekZinssatzImJahr(
  h: import("@/lib/store").Hypothek,
  jahr: number
): number {
  if (
    h.refinanzierungZinssatzProzent != null &&
    h.refinanzierungZinssatzProzent >= 0 &&
    jahr >= h.ablaufjahr
  ) {
    return h.refinanzierungZinssatzProzent;
  }
  return h.zinssatzProzent ?? 0;
}

function immobilienWertAmJahresende(
  state: CashflowInput,
  jahr: number
): number {
  return immobilienBilanzAmJahresende(state, jahr).aktiva;
}

/**
 * Summe der Immobilien-Steuerwerte zum Jahresende (E2-6 / Y-1c-Audit).
 * Wird für Vermögenssteuer-Bemessung verwendet — typischerweise tiefer
 * als der Verkehrswert (Kanton-Faktor 0.70-0.85).
 */
function immoSteuerwertAmJahresende(
  state: CashflowInput,
  jahr: number
): number {
  const heute = new Date().getFullYear();
  let total = 0;
  for (const im of state.immobilien.items) {
    if (im.verkehrswert == null) continue;
    if (immobilieAbgegeben(im, jahr)) continue;
    if (im.kaufjahr != null && im.kaufjahr > 0 && jahr < im.kaufjahr) continue;
    const baseWert = immobilieWert(im, jahr, heute);
    // Steuerwert: User-Override oder Kanton-Faktor × Verkehrswert (mit Wertsteigerung)
    const wefSumme = wefSummeFuerImmoBis(state, im.id, jahr);
    const aktivBeitrag = baseWert + Math.max(0, wefSumme - im.hypotheken.reduce((s, h) => s + (h.hoehe ?? 0), 0));
    const kanton = im.adresse?.kanton ?? state.adresse.kanton;
    total += effektiverSteuerwert(aktivBeitrag, im.steuerwert ?? null, kanton);
  }
  return total;
}

function hypothekenAmJahresende(
  state: CashflowInput,
  jahr: number
): number {
  return immobilienBilanzAmJahresende(state, jahr).schulden;
}

/**
 * Hypothek-Zinsen-Total im Jahr (Σ über alle laufenden Tranchen).
 *
 * Pro Hypothek-Tranche: hoehe × zinssatzProzent / 100. Zählt nur, wenn
 * die Liegenschaft im Jahr noch nicht verkauft ist. Eigenmietwert +
 * Schuldzinsabzug bewusst nicht modelliert (Reform 2028 schafft beides ab).
 */
function hypothekenZinsenJahr(state: CashflowInput, jahr: number): number {
  let total = 0;
  for (const im of state.immobilien.items) {
    if (immobilieAbgegeben(im, jahr)) continue;
    // Vor Kaufjahr: keine Hypothek aktiv → keine Zinsen
    if (im.kaufjahr != null && im.kaufjahr > 0 && jahr < im.kaufjahr) continue;
    for (const h of im.hypotheken) {
      const stand = hypothekStandImJahr(h, jahr);
      if (stand === 0) continue;
      const satz = hypothekZinssatzImJahr(h, jahr);
      total += (stand * satz) / 100;
    }
  }
  return Math.round(total);
}

/**
 * Summe aller Tilgungs-Beträge im gegebenen Jahr (Cashflow-Ausgabe).
 * Berater plant aktiv Tilgung → wirkt direkt aufs Hauptkonto.
 */
function hypothekTilgungenJahr(state: CashflowInput, jahr: number): number {
  let total = 0;
  for (const im of state.immobilien.items) {
    if (immobilieAbgegeben(im, jahr)) continue;
    if (im.kaufjahr != null && im.kaufjahr > 0 && jahr < im.kaufjahr) continue;
    for (const h of im.hypotheken) {
      if (!h.tilgungsplan) continue;
      for (const t of h.tilgungsplan) {
        if (t.jahr === jahr && t.betrag > 0) total += t.betrag;
      }
    }
  }
  return Math.round(total);
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

/** Firma-Verkauf-Erlös im konkreten Jahr (oder 0). */
function firmaVerkaufErloesJahr(state: CashflowInput, jahr: number): number {
  const f = state.firma;
  if (!f.vorhanden || f.plan !== "verkaufen") return 0;
  if (f.verkaufsjahr !== jahr) return 0;
  return f.moeglicherVerkaufserloes ?? 0;
}

/**
 * Art. 37b DBG (Liquidationsgewinn): Selbständig-Person muss bei Aufgabe
 * mind. 55 J. alt sein. Wir prüfen über Alter der Selbständig-Person im
 * Verkaufsjahr. Selbständig-Erkennung via Einkommensperiode typ "selbstaendigkeit".
 */
function firmaArt37bAktiv(state: CashflowInput, jahr: number): boolean {
  const f = state.firma;
  if (!f.vorhanden || f.plan !== "verkaufen") return false;
  if (f.verkaufsjahr !== jahr) return false;
  // Person 1 oder 2 selbständig? alter ≥ 55 bei Verkauf?
  const selbst = state.budget.einkommen.some(
    (e) => e.typ === "selbstaendigkeit"
  );
  if (!selbst) return false;
  const gj1 = Number.parseInt((state.person1.geburtsdatum ?? "").slice(0, 4), 10);
  const gj2 = Number.parseInt((state.person2.geburtsdatum ?? "").slice(0, 4), 10);
  const alterP1 = Number.isFinite(gj1) ? jahr - gj1 : 0;
  const alterP2 = Number.isFinite(gj2) ? jahr - gj2 : 0;
  return alterP1 >= 55 || alterP2 >= 55;
}

/**
 * Anzahl Kinder, die im Steuerjahr noch abzugsfähig sind.
 *
 * Schweizer Recht: Kinderabzug gilt für minderjährige Kinder UND für
 * volljährige Kinder in Erstausbildung (typisch bis ~25). Wir nutzen:
 *   - Kind < 18 im Jahr → abzugsfähig
 *   - Kind ≥ 18 UND ausbildungBisJahr >= jahr → abzugsfähig
 *   - sonst nicht abzugsfähig
 */
function anzahlKinderAbzugsfaehig(
  kinder: CashflowInput["kinder"],
  jahr: number,
  /**
   * Filter für Konkubinat-Konstellation:
   *  - undefined: alle Kinder zählen (Default; Single + Ehepaar)
   *  - "p1" / "p2": nur Kinder mit `zuordnung === person` + (wenn
   *    `gemeinsamBeiPerson` matched) gemeinsame Kinder zählen
   * Real BSV-Praxis Konkubinat: pro Kind exklusiv ein Elternteil.
   */
  fuerPerson?: "p1" | "p2",
  gemeinsamBeiPerson?: "p1" | "p2"
): number {
  let count = 0;
  for (const k of kinder) {
    const geburtsjahr = parseInt((k.geburtsdatum || "").slice(0, 4), 10);
    if (!Number.isFinite(geburtsjahr)) continue;
    if (fuerPerson) {
      if (k.zuordnung === "gemeinsam") {
        if (gemeinsamBeiPerson !== fuerPerson) continue;
      } else if (k.zuordnung !== fuerPerson) {
        continue;
      }
    }
    const alter = jahr - geburtsjahr;
    if (alter < 18) {
      count++;
    } else if (k.ausbildungBisJahr != null && k.ausbildungBisJahr >= jahr) {
      count++;
    }
  }
  return count;
}

/**
 * V2: Anzahl Kinder mit Anspruch auf AHV-Kinderrente.
 * Art. 22ter AHVG: < 18, oder < 25 + Ausbildung.
 */
function anzahlAhvKinderrentenberechtigt(
  kinder: CashflowInput["kinder"],
  jahr: number
): number {
  let count = 0;
  for (const k of kinder) {
    const geburtsjahr = parseInt((k.geburtsdatum || "").slice(0, 4), 10);
    if (!Number.isFinite(geburtsjahr)) continue;
    const alter = jahr - geburtsjahr;
    if (alter < 18) count++;
    else if (
      alter < 25 &&
      k.ausbildungBisJahr != null &&
      k.ausbildungBisJahr >= jahr
    ) {
      count++;
    }
  }
  return count;
}

/**
 * Erbschaft als Einmal-Eingang im erwarteten Jahr.
 * Wirkt nur, wenn:
 *  - User hat 'Ja absehbar' oder 'Möglich' gewählt
 *  - Toggle 'erwartetBeruecksichtigen' ist aktiv
 *  - Betrag und Jahr sind gefüllt
 *  - Das aktuelle Jahr === erwartetes Jahr
 */
function erbschaftEinnahmeJahr(state: CashflowInput, jahr: number): number {
  const e = state.erbschaft;
  if (!e) return 0;
  if (!e.erwartetBeruecksichtigen) return 0;
  if (e.erwartet === "nein" || e.erwartet === "keine_angabe") return 0;
  if (e.erwartetJahr !== jahr) return 0;
  return Math.max(0, e.erwartetBetrag ?? 0);
}

/**
 * Schenkung / Erbvorbezug als Einmal-Ausgang im angegebenen Jahr.
 * Wirkt nur, wenn:
 *  - User hat 'getätigt' oder 'geplant' gewählt
 *  - Toggle 'schenkungenBeruecksichtigen' ist aktiv
 *  - Betrag und Jahr sind gefüllt
 *  - Das aktuelle Jahr === Schenkungs-Jahr
 */
function schenkungAusgabeJahr(state: CashflowInput, jahr: number): number {
  const e = state.erbschaft;
  if (!e) return 0;
  if (!e.schenkungenBeruecksichtigen) return 0;
  if (e.schenkungenStatus === "nein" || e.schenkungenStatus == null) return 0;
  if (e.schenkungenJahr !== jahr) return 0;
  return Math.max(0, e.schenkungenBetrag ?? 0);
}
