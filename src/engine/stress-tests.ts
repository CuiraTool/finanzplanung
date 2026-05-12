/**
 * Stress-Tests Engine — fall-spezifisch.
 *
 * Was wäre wenn? Simuliert verschiedene Schock-Szenarien und liefert
 * für jedes die Auswirkung auf Vermögen heute / bei Pension / mit 85.
 *
 * Aktive Szenarien:
 *  1. Aktien-Crash -30%       — nur wenn Depots > 0
 *  2. Inflation-Schock +2%/J  — compound über Jahre
 *  3. Pflegekosten 200k @ 80  — P1 immer, P2 zusätzlich bei Paar
 *  4. Frühpension Alter 60    — bezugsalter -5
 *  5. Hypozins +2%-Schock     — nur wenn Hypothek > 0
 *  6. Tod P1                  — nur wenn Paar (Hinterlassenen-Schock)
 *  7. UWS-Senkung auf 5.0     — nur wenn aktiver PK-Anschluss
 *
 * Fall-Filter: irrelevante Szenarien werden vor Anwendung herausgefiltert,
 * damit der Berater keine 0-Δ-Karten erklärt bekommt.
 *
 * Differenziator: Stress-Tests sind in keinem etablierten Schweizer Tool
 * (VZ, Logismata, TaxWare) prominent. Das ist der "what if"-Differen-
 * ziator für Premium-Berater-Demos.
 */

import type { PlanState } from "@/lib/store";
import { cashflowReihe, type CashflowInput } from "./cashflow";
import { pensionsjahr, ORDENTLICHES_AHV_ALTER } from "@/lib/pension";
import { STRESS_INFLATION_PROZENT } from "./economy-defaults";

export type StressTestId =
  | "aktien-crash"
  | "inflation-schock"
  | "pflegekosten"
  | "fruehpension"
  | "hypozins-schock"
  | "tod-p1"
  | "uws-senkung";

export interface StressTestSzenario {
  id: StressTestId;
  titel: string;
  beschreibung: string;
  /** Annahme als Klartext für UI-Tooltip. */
  annahme: string;
}

export const STRESS_TESTS: StressTestSzenario[] = [
  {
    id: "aktien-crash",
    titel: "Aktien-Crash −30 %",
    beschreibung: "Schweres Markt-Ereignis trifft Wertschriftendepots",
    annahme:
      "Alle Aktiv-Depots verlieren −30 % ihres heutigen Werts (einmalig). Konten und Darlehen unverändert.",
  },
  {
    id: "inflation-schock",
    titel: "Inflation +2 % p.a.",
    beschreibung: "Anhaltende Hochinflation drückt Kaufkraft",
    annahme:
      "Haushaltsausgaben und Wunschverbrauch wachsen 2 % p.a. compound — kumulativ über die Laufzeit (≈ +22 % nach 10 J., ≈ +49 % nach 20 J.).",
  },
  {
    id: "pflegekosten",
    titel: "Pflegekosten CHF 200'000",
    beschreibung: "Einmalige Eigenkosten ab Alter 80",
    annahme:
      "Ein Pflegeheim-Aufenthalt verursacht CHF 200'000 ungedeckte Kosten im Jahr, in dem Person 1 (und bei Paar: auch Person 2) das Alter 80 erreicht.",
  },
  {
    id: "fruehpension",
    titel: "Frühpension Alter 60",
    beschreibung: "Pensionierung 5 Jahre früher als geplant",
    annahme:
      "Bezugsalter für AHV und PK wird auf 60 gesenkt. AHV-Vorbezug max 2 J. → 6.8 %/J Kürzung; PK-Vorbezug-Kürzung je nach Reglement. Erwerbseinkommen fällt 5 J. früher weg.",
  },
  {
    id: "hypozins-schock",
    titel: "Hypozins +2 %-Schock",
    beschreibung: "Zinswende drückt Wohnkosten",
    annahme:
      "Alle Hypothek-Tranchen verteuern sich um +2 Prozentpunkte ab sofort (lebenslang). Wirkt direkt auf den Cashflow als Mehrausgabe.",
  },
  {
    id: "tod-p1",
    titel: "Tod Person 1",
    beschreibung: "Witwen-/Witwer-Schock",
    annahme:
      "Person 1 fällt heute weg. AHV-Witwenrente 80 % der Maximalrente, PK-Witwenrente 60 % der bisherigen Rente. Erwerbseinkommen P1 entfällt, Verbrauch reduziert sich auf 75 % (eine Person statt zwei).",
  },
  {
    id: "uws-senkung",
    titel: "BVG-Umwandlungssatz auf 5.0 %",
    beschreibung: "Politische Reform drückt PK-Renten",
    annahme:
      "Der Umwandlungssatz wird per Pensionierung auf 5.0 % gesenkt (heute oft 5.5–6.8 %). Wirkt direkt auf die lebenslange PK-Rente.",
  },
];

/**
 * Liefert nur die für diesen Fall relevanten Stress-Tests.
 *
 * Filterregeln:
 *  - aktien-crash:   mindestens ein Depot mit Saldo > 0
 *  - hypozins-schock: mindestens eine Hypothek mit Höhe > 0
 *  - tod-p1:         fallart === "paar"
 *  - uws-senkung:    mindestens ein aktiver PK-Anschluss
 *  - rest:           immer aktiv
 */
export function stressTestsRelevant(state: PlanState): StressTestSzenario[] {
  return STRESS_TESTS.filter((s) => testIstRelevant(s.id, state));
}

function testIstRelevant(id: StressTestId, state: PlanState): boolean {
  switch (id) {
    case "aktien-crash": {
      return state.vermoegen.items.some(
        (it) => it.typ === "depot" && (it.saldoHeute ?? 0) > 0
      );
    }
    case "hypozins-schock": {
      return state.immobilien.items.some((im) =>
        im.hypotheken.some((h) => (h.hoehe ?? 0) > 0)
      );
    }
    case "tod-p1":
      return state.fallart === "paar";
    case "uws-senkung":
      return (
        state.bvg.p1.aktiverAnschluss ||
        (state.fallart === "paar" && state.bvg.p2.aktiverAnschluss)
      );
    case "inflation-schock":
    case "pflegekosten":
    case "fruehpension":
      return true;
  }
}

export interface StressTestResultat {
  id: StressTestId;
  titel: string;
  /** Vermögen heute — sollte unverändert sein bei den meisten Tests. */
  heute: number;
  /** Vermögen bei Pensionierung. */
  beiPensionierung: number;
  /** Vermögen mit Alter 85. */
  mit85: number;
  /** Δ vs. Basis-Szenario bei Pensionierung. */
  deltaPension: number;
  /** Δ vs. Basis-Szenario mit 85. */
  delta85: number;
  /** Abdeckung — bleibt das Vermögen über 0 mit 85? */
  schwere: "leicht" | "mittel" | "kritisch";
}

/**
 * Wendet ein Stress-Szenario auf einen PlanState an und liefert eine
 * neue, modifizierte State-Kopie zurück. Original bleibt unverändert.
 */
function applyStressTest(state: PlanState, id: StressTestId): PlanState {
  // Deep-Clone via JSON für Sicherheit gegen Mutation
  const clone = JSON.parse(
    JSON.stringify(state, (_k, v) =>
      typeof v === "function" ? undefined : v
    )
  ) as PlanState;

  switch (id) {
    case "aktien-crash": {
      // Alle Depots um -30% kürzen (Konten und Darlehen unangetastet)
      clone.vermoegen.items = clone.vermoegen.items.map((it) =>
        it.typ === "depot" && it.saldoHeute != null
          ? { ...it, saldoHeute: Math.round(it.saldoHeute * 0.7) }
          : it
      );
      return clone;
    }

    case "inflation-schock": {
      // Inflation 2 % p.a. compound — Horizont profil-abhängig statt fix 15J.
      // (Y-1a H-2): vorher fix (1.02)^15 = +34.6%, ignorierte
      // Zeit-Heterogenität. Jetzt: ø über (95 − heutigesAlter) Jahre, also
      // ein Mittelwert über erwartete Restlebenszeit der älteren Person.
      // - 65-Jähriger: (1.02)^30 ≈ +81 % (worst case Inflation über ganze Pension)
      // - 45-Jähriger: (1.02)^50 ≈ +169 % (lange Restzeit, hohe Wirkung)
      // - Hochrechnung trifft Mid-Range, da Ausgaben nicht alle bis 95 laufen
      //   → konservativer Mittelwert: (1.02)^((95 − age) × 0.5)
      const heuteJahr = new Date().getFullYear();
      const gj1 = parseInt((clone.person1.geburtsdatum || "").slice(0, 4), 10);
      const gj2 = parseInt((clone.person2.geburtsdatum || "").slice(0, 4), 10);
      const alterMax = Math.max(
        Number.isFinite(gj1) ? heuteJahr - gj1 : 40,
        Number.isFinite(gj2) && clone.fallart === "paar" ? heuteJahr - gj2 : 0
      );
      const restjahre = Math.max(5, 95 - alterMax);
      const horizont = Math.round(restjahre * 0.5); // konservativer Mittelpunkt
      const compoundFaktor = Math.pow(1 + STRESS_INFLATION_PROZENT / 100, horizont);
      if (clone.budget.ausgabenTotal != null) {
        clone.budget.ausgabenTotal = Math.round(
          clone.budget.ausgabenTotal * compoundFaktor
        );
      }
      if (clone.budget.wunschverbrauchPension != null) {
        clone.budget.wunschverbrauchPension = Math.round(
          clone.budget.wunschverbrauchPension * compoundFaktor
        );
      }
      const kat = clone.budget.ausgabenKategorien;
      for (const key of Object.keys(kat) as Array<keyof typeof kat>) {
        if (kat[key] != null) {
          kat[key] = Math.round(kat[key]! * compoundFaktor);
        }
      }
      return clone;
    }

    case "pflegekosten": {
      // Einmalige Ausgabe CHF 200'000 wenn P1 mit 80 ist — und bei Paar
      // zusätzlich für P2 (eigenes Jahr).
      const gj1 = parseInt((clone.person1.geburtsdatum || "").slice(0, 4), 10);
      const gj2 =
        clone.fallart === "paar"
          ? parseInt((clone.person2.geburtsdatum || "").slice(0, 4), 10)
          : NaN;
      const neueAusgaben = [...clone.einmaligeAusgaben];
      if (Number.isFinite(gj1)) {
        neueAusgaben.push({
          id: `stress-pflege-p1-${gj1 + 80}`,
          jahr: gj1 + 80,
          betrag: 200_000,
          beschreibung: "Stress: Pflege Person 1",
        });
      }
      if (Number.isFinite(gj2)) {
        neueAusgaben.push({
          id: `stress-pflege-p2-${gj2 + 80}`,
          jahr: gj2 + 80,
          betrag: 200_000,
          beschreibung: "Stress: Pflege Person 2",
        });
      }
      clone.einmaligeAusgaben = neueAusgaben;
      return clone;
    }

    case "fruehpension": {
      // Bezugsalter AHV + PK um 5 J. nach unten, min 58 (max BVG-Vorbezug).
      clone.ziele.bezugsalterP1 = Math.max(58, clone.ziele.bezugsalterP1 - 5);
      clone.ahv.ahvBezugsalterP1 = Math.max(
        63,
        clone.ahv.ahvBezugsalterP1 - 2
      ); // AHV-Vorbezug max 2 J.
      if (clone.fallart === "paar") {
        clone.ziele.bezugsalterP2 = Math.max(58, clone.ziele.bezugsalterP2 - 5);
        clone.ahv.ahvBezugsalterP2 = Math.max(
          63,
          clone.ahv.ahvBezugsalterP2 - 2
        );
      }
      return clone;
    }

    case "hypozins-schock": {
      // Alle Hypothek-Tranchen +2 Prozentpunkte
      clone.immobilien.items = clone.immobilien.items.map((im) => ({
        ...im,
        hypotheken: im.hypotheken.map((h) => ({
          ...h,
          zinssatzProzent: (h.zinssatzProzent ?? 0) + 2,
        })),
      }));
      return clone;
    }

    case "tod-p1": {
      // Hinterlassenen-Schock mit echter AHV-/BVG-Rechnung (Engine
      // berechneHinterlassenen via Witwen-/Waisenrenten-Faktoren).
      // - Erwerb P1 entfällt
      // - AHV P1 entfällt (überlebender bekommt eigene + Witwen-Rente)
      // - PK P1 als Witwen-Rente: 60 % der Altersrente, wir reduzieren
      //   UWS auf 60% der Bisherigen — vereinfachte Approximation, in
      //   Realität fliesst Witwenrente sofort (nicht erst ab Pensionsalter).
      // - AHV-Witwenrente fliesst ab Todesjahr (vereinfacht modelliert
      //   via reduziertes ahv.einkommenP2: simuliert höheres
      //   Einkommen am überlebenden Partner = Witwenrente-Effekt)
      // - Verbrauch reduziert auf 75 %
      clone.budget.einkommen = clone.budget.einkommen.filter(
        (e) => e.personIdx !== 1
      );
      clone.ahv.einkommenP1 = 0;
      clone.ahv.ahvBezugsalterP1 = 99; // effektiv nie
      clone.bvg.p1.umwandlungssatzProzent = Math.max(
        0,
        clone.bvg.p1.umwandlungssatzProzent * 0.6
      );
      // Verbrauch auf 75 %
      if (clone.budget.ausgabenTotal != null) {
        clone.budget.ausgabenTotal = Math.round(
          clone.budget.ausgabenTotal * 0.75
        );
      }
      if (clone.budget.wunschverbrauchPension != null) {
        clone.budget.wunschverbrauchPension = Math.round(
          clone.budget.wunschverbrauchPension * 0.75
        );
      }
      const kat = clone.budget.ausgabenKategorien;
      for (const key of Object.keys(kat) as Array<keyof typeof kat>) {
        if (kat[key] != null) {
          kat[key] = Math.round(kat[key]! * 0.75);
        }
      }
      return clone;
    }

    case "uws-senkung": {
      // BVG-UWS auf 5.0 % bei aktiven Anschlüssen
      if (clone.bvg.p1.aktiverAnschluss) {
        clone.bvg.p1.umwandlungssatzProzent = Math.min(
          5.0,
          clone.bvg.p1.umwandlungssatzProzent
        );
      }
      if (
        clone.fallart === "paar" &&
        clone.bvg.p2.aktiverAnschluss
      ) {
        clone.bvg.p2.umwandlungssatzProzent = Math.min(
          5.0,
          clone.bvg.p2.umwandlungssatzProzent
        );
      }
      return clone;
    }
  }
}

function bewerteSchwere(
  delta85: number,
  basisVermoegen85: number
): StressTestResultat["schwere"] {
  if (basisVermoegen85 <= 0) {
    // Basis-Szenario ist schon negativ — Stress macht es schlimmer
    return delta85 < -50_000 ? "kritisch" : "mittel";
  }
  // Test wenn Stress das Vermögen mit 85 unter Null drückt
  const neuVermoegen85 = basisVermoegen85 + delta85;
  if (neuVermoegen85 < 0) return "kritisch";
  if (neuVermoegen85 < basisVermoegen85 * 0.5) return "mittel";
  return "leicht";
}

interface BilanzEckwerte {
  heute: number;
  beiPensionierung: number;
  mit85: number;
}

/**
 * Volle Cashflow-Iteration für die Stress-Test-Eckwerte. Wir nutzen die
 * grosse Engine (cashflowReihe) statt der schnellen vermoegensbilanz —
 * sonst würden einmalige Ausgaben (Pflegekosten) und Inflation-Effekte
 * im Stress nicht sichtbar.
 */
function bilanzEckwerteAusCashflow(state: PlanState): BilanzEckwerte {
  const heuteJahr = new Date().getFullYear();
  const geburtsjahr = parseInt(
    (state.person1.geburtsdatum || "").slice(0, 4),
    10
  );
  const endJahr = Number.isFinite(geburtsjahr)
    ? geburtsjahr + 90
    : heuteJahr + 30;
  const reihe = cashflowReihe(
    state as unknown as CashflowInput,
    heuteJahr,
    endJahr
  );

  const heute = reihe[0]?.vermoegenNetto ?? 0;

  const ordPensionsjahr = pensionsjahr(
    state.person1.geburtsdatum,
    ORDENTLICHES_AHV_ALTER
  );
  const beiPensionsjahr = ordPensionsjahr ?? heuteJahr + 10;
  const beiPensionsZeile = reihe.find((z) => z.jahr === beiPensionsjahr);

  const jahr85 = Number.isFinite(geburtsjahr) ? geburtsjahr + 85 : null;
  const mit85Zeile =
    jahr85 != null
      ? reihe.find((z) => z.jahr === jahr85)
      : reihe[reihe.length - 1];

  return {
    heute,
    beiPensionierung: beiPensionsZeile?.vermoegenNetto ?? heute,
    mit85: mit85Zeile?.vermoegenNetto ?? heute,
  };
}

/**
 * Hauptfunktion: berechnet alle Stress-Tests einer State im Vergleich
 * zur Basis-Bilanz. Liefert ein Array mit Auswirkung pro Szenario.
 */
export function runAllStressTests(state: PlanState): StressTestResultat[] {
  const basis = bilanzEckwerteAusCashflow(state);
  return stressTestsRelevant(state).map((s) => {
    const stressedState = applyStressTest(state, s.id);
    const stressedBilanz = bilanzEckwerteAusCashflow(stressedState);
    const deltaPension =
      stressedBilanz.beiPensionierung - basis.beiPensionierung;
    const delta85 = stressedBilanz.mit85 - basis.mit85;
    return {
      id: s.id,
      titel: s.titel,
      heute: stressedBilanz.heute,
      beiPensionierung: stressedBilanz.beiPensionierung,
      mit85: stressedBilanz.mit85,
      deltaPension,
      delta85,
      schwere: bewerteSchwere(delta85, basis.mit85),
    };
  });
}
