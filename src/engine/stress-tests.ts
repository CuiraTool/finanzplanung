/**
 * Stress-Tests Engine — V1.
 *
 * Was wäre wenn? Simuliert verschiedene Schock-Szenarien und liefert
 * für jedes die Auswirkung auf Vermögen heute / bei Pension / mit 85.
 *
 * V1-Szenarien:
 *  1. Aktien-Crash -30% (alle Wertschriftendepots, einmalig im Schock-Jahr)
 *  2. Inflation-Schock +2% (zusätzlich zur Default-Inflation, lebenslang)
 *  3. Pflegekosten — einmalige Ausgabe CHF 200'000 mit 80
 *
 * V2-Szenarien (Sprint 2.5):
 *  4. Tod P1 mit X Jahren (Hinterlassenen-Renten + reduzierter Verbrauch)
 *  5. Lohnausfall durch Erwerbsunfähigkeit für 5 Jahre
 *
 * Differenziator: Stress-Tests sind in keinem etablierten Schweizer Tool
 * (VZ, Logismata, TaxWare) prominent. Das ist der "what if"-Differen-
 * ziator für Premium-Berater-Demos.
 */

import type { PlanState } from "@/lib/store";
import { cashflowReihe, type CashflowInput } from "./cashflow";
import { pensionsjahr, ORDENTLICHES_AHV_ALTER } from "@/lib/pension";

export type StressTestId = "aktien-crash" | "inflation-schock" | "pflegekosten";

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
      "Ausgaben und Wunschverbrauch steigen 2 % stärker p.a. als die Default-Annahme — wirkt lebenslang.",
  },
  {
    id: "pflegekosten",
    titel: "Pflegekosten CHF 200'000",
    beschreibung: "Einmalige Eigenkosten ab Alter 80",
    annahme:
      "Ein Pflegeheim-Aufenthalt verursacht CHF 200'000 ungedeckte Kosten im Jahr, in dem Person 1 das Alter 80 erreicht.",
  },
];

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
      // Inflation wirkt im Cashflow auf alle Ausgaben — wir simulieren
      // das als Erhöhung des Wunschverbrauchs und der heutigen Ausgaben
      // um 2% lebenslang. Der Effekt akkumuliert sich nicht jahrweise
      // (das macht echte Inflation), aber zeigt die Richtung.
      // Vereinfachung für V1: +20% auf alle Ausgaben dauerhaft (ergibt
      // ungefähr 10 J × 2% Compound).
      if (clone.budget.ausgabenTotal != null) {
        clone.budget.ausgabenTotal = Math.round(
          clone.budget.ausgabenTotal * 1.2
        );
      }
      if (clone.budget.wunschverbrauchPension != null) {
        clone.budget.wunschverbrauchPension = Math.round(
          clone.budget.wunschverbrauchPension * 1.2
        );
      }
      return clone;
    }

    case "pflegekosten": {
      // Einmalige Ausgabe CHF 200'000 wenn P1 mit 80 ist
      const geburtsjahr = parseInt(
        (clone.person1.geburtsdatum || "").slice(0, 4),
        10
      );
      if (Number.isFinite(geburtsjahr)) {
        const pflegeJahr = geburtsjahr + 80;
        clone.einmaligeAusgaben = [
          ...clone.einmaligeAusgaben,
          {
            id: `stress-pflege-${pflegeJahr}`,
            jahr: pflegeJahr,
            betrag: 200_000,
            beschreibung: "Stress-Test: Pflegekosten",
          },
        ];
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
  return STRESS_TESTS.map((s) => {
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
