/**
 * Plan-Snapshot-Builder für KI-Analysen.
 *
 * Reduziert den vollen PlanState (5000+ JSON-Zeilen) auf die ~30 Eckwerte,
 * die für eine LLM-basierte Massnahmen-Analyse relevant sind.
 *
 * Privacy: enthält keine PII (Namen, Adressen, Geburtsdaten direkt) —
 * nur abgeleitete Werte (Alter aus Geburtsdatum, Kanton aus Adresse).
 * Geht trotzdem an Anthropic-API → User wird im UI darauf hingewiesen.
 */

import type { PlanState } from "./store";
import type { Massnahme } from "@/engine/massnahmen";
import type { VermoegensbilanzOutput } from "@/engine/vermoegensbilanz";

interface SnapshotInput {
  state: PlanState;
  bilanz: VermoegensbilanzOutput;
  bestehendeMassnahmen: Massnahme[];
}

export interface PlanSnapshot {
  fallart: "einzel" | "paar";
  alter: { p1: number | null; p2: number | null };
  pensionsalter: { p1: number; p2: number };
  kanton: string;
  einkommenJahr: number | null;
  ausgabenMonat: number | null;
  wunschPensionMonat: number | null;
  steuernHeute: number | null;
  vermoegenHeute: number | null;
  vermoegenPension: number | null;
  vermoegen20JahreSpaeter: number | null;
  pk: {
    altersguthabenHeuteP1: number | null;
    altersguthabenBeiBezugP1: number | null;
    bezugspraeferenzP1: string;
    altersguthabenHeuteP2: number | null;
    altersguthabenBeiBezugP2: number | null;
    bezugspraeferenzP2: string;
    einkaeufeGeplant: number;
  };
  saeule3aSaldoTotal: number;
  saeule3aEinzahlungJahr: number | null;
  immobilien: {
    anzahl: number;
    verkehrswertTotal: number;
    hypothekTotal: number;
    planVerkaufen: number;
  };
  firmaVorhanden: boolean;
  nachlass: {
    testament: boolean;
    vorsorgeauftrag: boolean;
    patientenverfuegung: boolean;
    ehevertrag: boolean;
  };
  bekannteMassnahmen: string[];
}

function alterAusGeburtsdatum(iso: string): number | null {
  if (!iso || iso.length < 4) return null;
  const j = parseInt(iso.slice(0, 4), 10);
  if (!Number.isFinite(j)) return null;
  return new Date().getFullYear() - j;
}

export function buildPlanSnapshot({
  state,
  bilanz,
  bestehendeMassnahmen,
}: SnapshotInput): PlanSnapshot {
  const isPaar = state.fallart === "paar";

  // 3a-Total + Jahres-Einzahlungen aufsummieren
  const saeule3aSaldo = [
    ...state.saeuleDrei.p1,
    ...state.saeuleDrei.p2,
  ].reduce(
    (sum, e) => sum + (e.aktuellerWert ?? 0) + (e.rueckkaufswert ?? 0),
    0
  );

  const saeule3aJahrEinz = [
    ...state.saeuleDrei.p1,
    ...state.saeuleDrei.p2,
  ].reduce((sum, e) => sum + (e.jaehrlicheEinzahlung ?? 0), 0);

  // Immobilien-Aggregation
  const immoVerkehr = state.immobilien.items.reduce(
    (a, im) => a + (im.verkehrswert ?? 0),
    0
  );
  const immoHypo = state.immobilien.items.reduce(
    (a, im) =>
      a + im.hypotheken.reduce((b, h) => b + (h.hoehe ?? 0), 0),
    0
  );
  const immoVerk = state.immobilien.items.filter(
    (im) => im.plan === "verkaufen"
  ).length;

  // PK-Einkäufe geplant
  const einkaeufeGeplant =
    state.bvg.p1.einkaeufe.reduce((a, e) => a + (e.betrag ?? 0), 0) +
    (isPaar
      ? state.bvg.p2.einkaeufe.reduce((a, e) => a + (e.betrag ?? 0), 0)
      : 0);

  return {
    fallart: state.fallart,
    alter: {
      p1: alterAusGeburtsdatum(state.person1.geburtsdatum),
      p2: isPaar ? alterAusGeburtsdatum(state.person2.geburtsdatum) : null,
    },
    pensionsalter: {
      p1: state.ziele.bezugsalterP1,
      p2: state.ziele.bezugsalterP2,
    },
    kanton: state.adresse.kanton || "?",
    einkommenJahr: state.budget.einkommenHeute,
    ausgabenMonat: state.budget.ausgabenTotal,
    wunschPensionMonat: state.budget.wunschverbrauchPension,
    steuernHeute: state.budget.steuernHeute,
    vermoegenHeute: bilanz.heute ?? null,
    vermoegenPension: bilanz.beiPensionierung ?? null,
    vermoegen20JahreSpaeter: bilanz.zwanzig20JahreSpaeter ?? null,
    pk: {
      altersguthabenHeuteP1: state.bvg.p1.altersguthabenHeute,
      altersguthabenBeiBezugP1: state.bvg.p1.altersguthabenBeiBezug,
      bezugspraeferenzP1: state.bvg.p1.bezugspraeferenz,
      altersguthabenHeuteP2: isPaar ? state.bvg.p2.altersguthabenHeute : null,
      altersguthabenBeiBezugP2: isPaar
        ? state.bvg.p2.altersguthabenBeiBezug
        : null,
      bezugspraeferenzP2: isPaar ? state.bvg.p2.bezugspraeferenz : "—",
      einkaeufeGeplant,
    },
    saeule3aSaldoTotal: saeule3aSaldo,
    saeule3aEinzahlungJahr: saeule3aJahrEinz > 0 ? saeule3aJahrEinz : null,
    immobilien: {
      anzahl: state.immobilien.items.length,
      verkehrswertTotal: immoVerkehr,
      hypothekTotal: immoHypo,
      planVerkaufen: immoVerk,
    },
    firmaVorhanden: state.firma.vorhanden,
    nachlass: {
      testament: state.nachlass.testament,
      vorsorgeauftrag: state.nachlass.vorsorgeauftrag,
      patientenverfuegung: state.nachlass.patientenverfuegung,
      ehevertrag: state.nachlass.ehevertrag,
    },
    bekannteMassnahmen: bestehendeMassnahmen.map((m) => m.titel),
  };
}
