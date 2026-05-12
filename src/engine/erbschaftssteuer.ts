/**
 * Erbschafts- und Schenkungssteuer pro Kanton (V10 / fachlicher Befund).
 *
 * Schweizer Erbschaftssteuer ist KANTONAL:
 *  - Bundessteuer auf Erbschaften gibt es NICHT (anders als Einkommen).
 *  - Jeder Kanton hat eigene Tarife + Freibeträge.
 *  - Verwandtschaftsgrad entscheidend: Ehegatte / Nachkommen / Eltern /
 *    Geschwister / Konkubinatspartner / nicht-verwandt.
 *  - Kanton SZ kennt keine Erbschaftssteuer (Abschaffung 1999).
 *  - Ehegatten + eingetragene Partner sind in ALLEN Kantonen befreit.
 *  - Direkte Nachkommen (Kinder, Enkel): in 22 Kantonen befreit, in
 *    AI, AR, BS, BL, LU, NE, OW, SO, TG, VD teilweise besteuert.
 *
 * Vereinfachung Etappe 1:
 *  - Maximaler Tarif pro Kanton × Verwandtschaftsgrad (= Spitzentarif
 *    für grosse Erbschaften > 500k).
 *  - Freibeträge approximiert (Median über Tarifstufen).
 *  - Für genaue Berechnung: einzelne Kantonale Erbschaftssteuer-Tabellen
 *    in Etappe 1.5.
 *
 * Quellen:
 *  - ESTV Übersicht Erbschafts-/Schenkungssteuer 2025
 *  - Kantonale Steuergesetze (Stand 2025)
 */

import type { Fallart } from "@/engine/steuer-engine/types";

export type VerwandtschaftsGrad =
  | "ehegatte" // Ehepartner / eingetragene Partner — überall befreit
  | "nachkomme" // Kinder, Enkel
  | "eltern" // Eltern, Grosseltern
  | "geschwister" // Geschwister, Halbgeschwister
  | "konkubinat" // Konkubinatspartner (zählt meist als "nicht-verwandt")
  | "nicht_verwandt"; // Stiefkinder, Patenkinder, Freunde

export type KantonCode =
  | "ZH" | "BE" | "LU" | "UR" | "SZ" | "OW" | "NW" | "GL" | "ZG" | "FR"
  | "SO" | "BS" | "BL" | "SH" | "AR" | "AI" | "SG" | "GR" | "AG" | "TG"
  | "TI" | "VD" | "VS" | "NE" | "GE" | "JU";

interface KantonErbschaftsTarif {
  /** Max-Steuersatz (Spitzentarif) pro Verwandtschaftsgrad in %. */
  ehegatte: number;
  nachkomme: number;
  eltern: number;
  geschwister: number;
  konkubinat: number;
  nicht_verwandt: number;
  /** Freibetrag in CHF — pauschal pro Grad (vereinfacht). */
  freibetragEhegatte: number;
  freibetragNachkomme: number;
  freibetragEltern: number;
  freibetragGeschwister: number;
  freibetragKonkubinat: number;
  freibetragNichtVerwandt: number;
}

/**
 * Kantonale Erbschaftssteuer-Tarife (Spitzentarife + Freibeträge).
 * Stand 2025, vereinfachte Median-Sätze. Werte sind APPROXIMATIONEN —
 * für rechtsverbindliche Berechnung kantonale Tabellen + Veranlagung
 * konsultieren.
 */
const KANTON_TARIFE: Record<KantonCode, KantonErbschaftsTarif> = {
  ZH: { ehegatte: 0, nachkomme: 0, eltern: 6, geschwister: 18, konkubinat: 36, nicht_verwandt: 36,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 200_000, freibetragGeschwister: 15_000, freibetragKonkubinat: 50_000, freibetragNichtVerwandt: 0 },
  BE: { ehegatte: 0, nachkomme: 0, eltern: 8, geschwister: 16, konkubinat: 40, nicht_verwandt: 40,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 12_000, freibetragGeschwister: 12_000, freibetragKonkubinat: 12_000, freibetragNichtVerwandt: 0 },
  LU: { ehegatte: 0, nachkomme: 2, eltern: 4, geschwister: 12, konkubinat: 30, nicht_verwandt: 30,
        freibetragEhegatte: 0, freibetragNachkomme: 100_000, freibetragEltern: 20_000, freibetragGeschwister: 5_000, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  UR: { ehegatte: 0, nachkomme: 0, eltern: 8, geschwister: 14, konkubinat: 28, nicht_verwandt: 28,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 15_000, freibetragGeschwister: 15_000, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  SZ: { ehegatte: 0, nachkomme: 0, eltern: 0, geschwister: 0, konkubinat: 0, nicht_verwandt: 0,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 0, freibetragGeschwister: 0, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  OW: { ehegatte: 0, nachkomme: 0, eltern: 0, geschwister: 0, konkubinat: 0, nicht_verwandt: 0,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 0, freibetragGeschwister: 0, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  NW: { ehegatte: 0, nachkomme: 0, eltern: 0, geschwister: 5, konkubinat: 15, nicht_verwandt: 15,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 0, freibetragGeschwister: 20_000, freibetragKonkubinat: 20_000, freibetragNichtVerwandt: 0 },
  GL: { ehegatte: 0, nachkomme: 0, eltern: 6, geschwister: 13, konkubinat: 30, nicht_verwandt: 30,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 5_000, freibetragGeschwister: 5_000, freibetragKonkubinat: 5_000, freibetragNichtVerwandt: 0 },
  ZG: { ehegatte: 0, nachkomme: 0, eltern: 4, geschwister: 8, konkubinat: 20, nicht_verwandt: 20,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 5_000, freibetragGeschwister: 5_000, freibetragKonkubinat: 5_000, freibetragNichtVerwandt: 5_000 },
  FR: { ehegatte: 0, nachkomme: 0, eltern: 5, geschwister: 15, konkubinat: 32, nicht_verwandt: 32,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 0, freibetragGeschwister: 0, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  SO: { ehegatte: 0, nachkomme: 8, eltern: 12, geschwister: 20, konkubinat: 30, nicht_verwandt: 30,
        freibetragEhegatte: 0, freibetragNachkomme: 200_000, freibetragEltern: 20_000, freibetragGeschwister: 10_000, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  BS: { ehegatte: 0, nachkomme: 0, eltern: 15, geschwister: 25, konkubinat: 30, nicht_verwandt: 49.5,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 0, freibetragGeschwister: 0, freibetragKonkubinat: 30_000, freibetragNichtVerwandt: 0 },
  BL: { ehegatte: 0, nachkomme: 0, eltern: 17, geschwister: 25, konkubinat: 30, nicht_verwandt: 30,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 0, freibetragGeschwister: 0, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  SH: { ehegatte: 0, nachkomme: 0, eltern: 6, geschwister: 14, konkubinat: 28, nicht_verwandt: 40,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 30_000, freibetragGeschwister: 10_000, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  AR: { ehegatte: 0, nachkomme: 0, eltern: 12, geschwister: 18, konkubinat: 32, nicht_verwandt: 32,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 0, freibetragGeschwister: 0, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  AI: { ehegatte: 0, nachkomme: 1, eltern: 6, geschwister: 12, konkubinat: 27, nicht_verwandt: 27,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 5_000, freibetragGeschwister: 5_000, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  SG: { ehegatte: 0, nachkomme: 0, eltern: 9, geschwister: 18, konkubinat: 30, nicht_verwandt: 30,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 25_000, freibetragGeschwister: 25_000, freibetragKonkubinat: 10_000, freibetragNichtVerwandt: 0 },
  GR: { ehegatte: 0, nachkomme: 0, eltern: 5, geschwister: 15, konkubinat: 25, nicht_verwandt: 25,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 7_000, freibetragGeschwister: 7_000, freibetragKonkubinat: 7_000, freibetragNichtVerwandt: 0 },
  AG: { ehegatte: 0, nachkomme: 0, eltern: 9, geschwister: 23, konkubinat: 32, nicht_verwandt: 32,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 0, freibetragGeschwister: 0, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  TG: { ehegatte: 0, nachkomme: 2, eltern: 6, geschwister: 12, konkubinat: 24, nicht_verwandt: 24,
        freibetragEhegatte: 0, freibetragNachkomme: 50_000, freibetragEltern: 0, freibetragGeschwister: 0, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  TI: { ehegatte: 0, nachkomme: 0, eltern: 10, geschwister: 21, konkubinat: 36, nicht_verwandt: 41,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 0, freibetragGeschwister: 10_000, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  VD: { ehegatte: 0, nachkomme: 3.5, eltern: 7, geschwister: 16, konkubinat: 25, nicht_verwandt: 25,
        freibetragEhegatte: 0, freibetragNachkomme: 250_000, freibetragEltern: 250_000, freibetragGeschwister: 50_000, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  VS: { ehegatte: 0, nachkomme: 0, eltern: 0, geschwister: 25, konkubinat: 25, nicht_verwandt: 25,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 0, freibetragGeschwister: 0, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  NE: { ehegatte: 0, nachkomme: 3, eltern: 3, geschwister: 15, konkubinat: 45, nicht_verwandt: 45,
        freibetragEhegatte: 0, freibetragNachkomme: 50_000, freibetragEltern: 50_000, freibetragGeschwister: 0, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  GE: { ehegatte: 0, nachkomme: 0, eltern: 0, geschwister: 11, konkubinat: 26, nicht_verwandt: 26,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 0, freibetragGeschwister: 0, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
  JU: { ehegatte: 0, nachkomme: 0, eltern: 7, geschwister: 14, konkubinat: 35, nicht_verwandt: 35,
        freibetragEhegatte: 0, freibetragNachkomme: 0, freibetragEltern: 0, freibetragGeschwister: 0, freibetragKonkubinat: 0, freibetragNichtVerwandt: 0 },
};

export interface ErbschaftssteuerInput {
  /** Erbschafts-/Schenkungs-Betrag (Brutto). */
  betrag: number;
  /** Verwandtschaftsgrad zum Erblasser. */
  verwandtschaft: VerwandtschaftsGrad;
  /** Wohnsitz-Kanton des Erblassers (für unbewegliches Vermögen: Lage-Kanton). */
  kanton: string;
}

export interface ErbschaftssteuerOutput {
  steuerBetrag: number;
  steuerProzent: number;
  freibetrag: number;
  steuerbarerBetrag: number;
  /** True wenn Erbschaft komplett steuerfrei (z.B. Ehegatte). */
  steuerfrei: boolean;
  /** Notiz für UI. */
  hinweis: string;
}

/**
 * Berechnet Erbschafts-/Schenkungssteuer für einen Kanton + Verwandtschaftsgrad.
 *
 * Vereinfachung: lineare Anwendung Spitzentarif × (Betrag − Freibetrag).
 * Echte Tarife haben Progression — Etappe 1.5.
 */
export function berechneErbschaftssteuer(
  input: ErbschaftssteuerInput
): ErbschaftssteuerOutput {
  const kt = input.kanton as KantonCode;
  const tarif = KANTON_TARIFE[kt];

  if (!tarif) {
    // Unbekannter Kanton: konservativer Default 20% Spitzentarif
    return {
      steuerBetrag: Math.round(input.betrag * 0.2),
      steuerProzent: 20,
      freibetrag: 0,
      steuerbarerBetrag: input.betrag,
      steuerfrei: false,
      hinweis: `Kanton "${input.kanton}" nicht erkannt — Default 20 % angewendet.`,
    };
  }

  const grad = input.verwandtschaft;
  const satz = tarif[grad];
  const freibetrag = (() => {
    switch (grad) {
      case "ehegatte": return tarif.freibetragEhegatte;
      case "nachkomme": return tarif.freibetragNachkomme;
      case "eltern": return tarif.freibetragEltern;
      case "geschwister": return tarif.freibetragGeschwister;
      case "konkubinat": return tarif.freibetragKonkubinat;
      case "nicht_verwandt": return tarif.freibetragNichtVerwandt;
    }
  })();

  const steuerbar = Math.max(0, input.betrag - freibetrag);
  const steuerBetrag = Math.round(steuerbar * (satz / 100));
  const steuerfrei = satz === 0 || steuerBetrag === 0;

  let hinweis = "";
  if (grad === "ehegatte") {
    hinweis = "Ehegatten + eingetragene Partner sind in allen Kantonen befreit.";
  } else if (grad === "konkubinat" && !steuerfrei) {
    hinweis = `Konkubinat zählt steuerlich als "nicht-verwandt" — höchster Tarif (${satz}% im ${kt}).`;
  } else if (kt === "SZ" || kt === "OW") {
    hinweis = `${kt}: keine Erbschafts-/Schenkungssteuer.`;
  } else if (grad === "nachkomme" && steuerfrei) {
    hinweis = `Direkte Nachkommen sind im Kanton ${kt} befreit.`;
  } else {
    hinweis = `Erbschaftssteuer ${kt}: ${satz}% Spitzentarif (Freibetrag CHF ${freibetrag.toLocaleString("de-CH")}).`;
  }

  return {
    steuerBetrag,
    steuerProzent: satz,
    freibetrag,
    steuerbarerBetrag: steuerbar,
    steuerfrei,
    hinweis,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _UnusedFallart = Fallart;
