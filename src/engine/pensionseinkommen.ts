/**
 * Voraussichtliches Bruttojahreseinkommen bei Pensionierung.
 *
 * Setzt sich zusammen aus:
 *  - AHV-Rente (1. Säule) — pro Person separat berechnet, bei Paar plafoniert
 *  - BVG-Rente (2. Säule) — pro Person aus Altersguthaben × UWS
 *  - Mieteinnahmen (Renditeliegenschaften) — soweit nach Pensionierung noch
 *    gehalten
 *
 * Vereinfachung: Kapitalauszahlungen aus PK/3a sind hier NICHT als Rente
 * enthalten (das wäre Vermögensumschichtung). Das Tool zeigt die Tragbarkeit
 * also für den "Renten-Fall" — wenn der User Kapital bezieht, sinkt das
 * laufende Einkommen entsprechend.
 *
 * Wird in der Tragbarkeits-Anzeige für Block 8 verwendet.
 */

import type { PlanState } from "@/lib/store";
import {
  ahvJahresrenteEinzel,
  ahvCouplePension,
} from "./ahv";
import { bvgGesamtkapitalBeiBezug, bvgBezug } from "./bvg";

export interface PensionseinkommenResult {
  /** Total Pensionseinkommen p.a. (Brutto, vor Steuern). */
  total: number;
  /** Davon AHV (Haushalt). */
  ahv: number;
  /** Davon BVG-Renten (Summe). */
  bvg: number;
  /** Davon Netto-Mieteinnahmen Rendite. */
  mieten: number;
}

export function pensionseinkommenJahr(
  state: PlanState,
  bezugsalter?: number
): PensionseinkommenResult {
  const fallart = state.fallart;
  // Default: Bezugsalter aus Block 2 (oder 65), nicht das übergebene Alter.
  // Das übergebene Alter erlaubt Szenarien "Tragbarkeit bei 60 / 65 / 67".
  const altP1 = bezugsalter ?? state.ziele.bezugsalterP1;
  const altP2 = bezugsalter ?? state.ziele.bezugsalterP2;

  // ─── AHV ─────────────────────────────────────────────────────
  let ahv = 0;
  const heute = new Date().getFullYear();
  // Geburtsjahr aus Geburtsdatum extrahieren (YYYY-MM-DD); wenn fehlt → 1965 als sicherer Default.
  const geburtsjahr = (g: string) => {
    const j = parseInt(g.slice(0, 4), 10);
    return Number.isFinite(j) && j > 1900 ? j : 1965;
  };
  const bezugsjahrP1 = geburtsjahr(state.person1.geburtsdatum) + altP1;
  const bezugsjahrP2 =
    state.fallart === "paar"
      ? geburtsjahr(state.person2.geburtsdatum) + altP2
      : heute;

  if (fallart === "paar") {
    const couple = ahvCouplePension({
      einkommenP1: state.ahv.einkommenP1 ?? 0,
      einkommenP2: state.ahv.einkommenP2 ?? 0,
      fehljahreP1: state.ahv.hatFehljahreP1 ? state.ahv.fehljahreAnzahlP1 : 0,
      fehljahreP2: state.ahv.hatFehljahreP2 ? state.ahv.fehljahreAnzahlP2 : 0,
      bezugsalterP1: state.ahv.ahvBezugsalterP1,
      bezugsalterP2: state.ahv.ahvBezugsalterP2,
      bezugsjahr: Math.max(bezugsjahrP1, bezugsjahrP2),
    });
    ahv = couple.haushaltsRente;
  } else {
    const single = ahvJahresrenteEinzel({
      massgebendesEinkommen: state.ahv.einkommenP1 ?? 0,
      fehljahre: state.ahv.hatFehljahreP1 ? state.ahv.fehljahreAnzahlP1 : 0,
      bezugsalter: state.ahv.ahvBezugsalterP1,
      bezugsjahr: bezugsjahrP1,
    });
    ahv = single.jahresrente;
  }

  // ─── BVG ─────────────────────────────────────────────────────
  let bvg = 0;
  const bvgPerson = (
    p: PlanState["bvg"]["p1"],
    pensionsAlter: number,
    geburtsdatum: string
  ): number => {
    if (!p.aktiverAnschluss) return 0;
    const bezugsjahr = geburtsjahr(geburtsdatum) + pensionsAlter;
    const saldoBeiBezug = bvgGesamtkapitalBeiBezug({
      altersguthabenBeiBezug: p.altersguthabenBeiBezug ?? 0,
      bezugsjahr,
      einkaeufe: p.einkaeufe
        .filter((e) => e.betrag != null)
        .map((e) => ({ jahr: e.jahr, betrag: e.betrag as number })),
    });
    const out = bvgBezug({
      saldoBeiBezug,
      bezugspraeferenz: p.bezugspraeferenz,
      umwandlungssatz: p.umwandlungssatzProzent / 100,
      kapitalanteilProzent: p.kapitalanteil,
    });
    return out.jahresrente; // 0 bei reinem Kapitalbezug
  };

  bvg += bvgPerson(state.bvg.p1, altP1, state.person1.geburtsdatum);
  if (fallart === "paar") {
    bvg += bvgPerson(state.bvg.p2, altP2, state.person2.geburtsdatum);
  }

  // ─── Mieteinnahmen Rendite ──────────────────────────────────
  // Mieteinnahmen nur bei "behalten" — sowohl Verkauf als auch Verschenken
  // (Erbvorbezug) beendet die Mieteinnahmen ab Übergabejahr; in der Pensions-
  // einkommens-Heuristik (zeitlos) wird vereinfacht jeder nicht-"behalten"
  // Plan als künftig weg behandelt.
  const mieten = state.immobilien.items
    .filter((i) => i.typ === "rendite" && i.plan === "behalten")
    .reduce((sum, i) => sum + (i.jaehrlicheMieteinnahmen ?? 0), 0);

  return {
    total: ahv + bvg + mieten,
    ahv,
    bvg,
    mieten,
  };
}
