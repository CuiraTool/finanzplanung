/**
 * Repartitions-/Steuerwert-Faktoren pro Kanton (E2-6 / Y-1c-Audit).
 *
 * Schweizer Vermögenssteuer nutzt nicht den Verkehrswert, sondern den
 * "Steuerwert" einer Liegenschaft. Dieser ist typischerweise tiefer als
 * der Verkehrswert (Kanton-spezifisch festgelegt, basiert auf
 * Schätzungs-Methode).
 *
 * Wenn der User keinen expliziten Steuerwert angibt, schätzt die Engine
 * den Steuerwert via Faktor × Verkehrswert.
 *
 * Quellen:
 *  - ZH: §39 StG ZH, Schätzung durch kantonale Schätzungs-Behörde, typ. 70-80%.
 *  - ZG: niedrigere Quoten typisch.
 *  - BE: Amtlicher Wert.
 *  - Werte sind Engine-Defaults — können via Immobilie.steuerwert übersteuert
 *    werden.
 */

export type KantonRepartition = {
  /** Faktor 0..1: Steuerwert / Verkehrswert. */
  steuerwertFaktor: number;
};

const REPARTITION_BY_KANTON: Record<string, KantonRepartition> = {
  ZH: { steuerwertFaktor: 0.7 },
  BE: { steuerwertFaktor: 0.7 },
  LU: { steuerwertFaktor: 0.75 },
  UR: { steuerwertFaktor: 0.75 },
  SZ: { steuerwertFaktor: 0.85 }, // sehr hoch
  OW: { steuerwertFaktor: 0.75 },
  NW: { steuerwertFaktor: 0.75 },
  GL: { steuerwertFaktor: 0.7 },
  ZG: { steuerwertFaktor: 0.85 },
  FR: { steuerwertFaktor: 0.75 },
  SO: { steuerwertFaktor: 0.75 },
  BS: { steuerwertFaktor: 0.7 },
  BL: { steuerwertFaktor: 0.7 },
  SH: { steuerwertFaktor: 0.7 },
  AR: { steuerwertFaktor: 0.7 },
  AI: { steuerwertFaktor: 0.7 },
  SG: { steuerwertFaktor: 0.7 },
  GR: { steuerwertFaktor: 0.7 },
  AG: { steuerwertFaktor: 0.7 },
  TG: { steuerwertFaktor: 0.7 },
  TI: { steuerwertFaktor: 0.7 },
  VD: { steuerwertFaktor: 0.75 },
  VS: { steuerwertFaktor: 0.7 },
  NE: { steuerwertFaktor: 0.7 },
  GE: { steuerwertFaktor: 0.7 },
  JU: { steuerwertFaktor: 0.7 },
};

const DEFAULT_FAKTOR = 0.7;

export function steuerwertFaktor(kanton: string | null | undefined): number {
  if (!kanton) return DEFAULT_FAKTOR;
  return REPARTITION_BY_KANTON[kanton]?.steuerwertFaktor ?? DEFAULT_FAKTOR;
}

/**
 * Liefert den effektiven Steuerwert einer Immobilie.
 * Wenn explizit erfasst → direkt. Sonst Verkehrswert × Kanton-Faktor.
 */
export function effektiverSteuerwert(
  verkehrswert: number,
  steuerwertOverride: number | null | undefined,
  kanton: string | null | undefined
): number {
  if (steuerwertOverride != null && steuerwertOverride > 0) {
    return steuerwertOverride;
  }
  return Math.round(verkehrswert * steuerwertFaktor(kanton));
}
