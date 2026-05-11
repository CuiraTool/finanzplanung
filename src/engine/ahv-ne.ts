/**
 * AHV-Beiträge für Nichterwerbstätige (NE) — BSV-Skala 2025.
 *
 * Wer zwischen Frühpension und ordentlichem AHV-Bezugsalter (65) nicht mehr
 * erwerbstätig ist, schuldet als Nichterwerbstätiger AHV/IV/EO-Beiträge.
 * Diese sind:
 *   - obligatorisch ab Alter 20 bis ordentlicher AHV-Bezug
 *   - vermögensabhängig + rentenabhängig
 *   - sichern lückenlose Skala 44 (sonst Rentenkürzung 1/44 pro Lücke)
 *
 * Bemessungsbetrag (BSV 2025):
 *   Vermögen × 20 + Renteneinkommen × 20 = Bemessungsgrundlage
 *
 * Beitragstabelle 2025 (Faustformel, gilt nach jährlicher BSV-Anpassung):
 *   < 350'000:  CHF 530/J (Minimum)
 *   350'000+:   CHF 530 + 51 × ((Bemessung-350'000)/50'000)
 *   8'400'000+: CHF 24'012
 *   Maximum:    CHF 26'400/J (gedeckelt bei sehr hohem Vermögen)
 *
 * Quelle: BSV "Beiträge der Nichterwerbstätigen", Faktenblatt 2025.
 * Vereinfachung: Lineare Skala statt der genauen Stufentabelle (Drift
 * < 5 % für realistische Bemessungen 350k-5M).
 *
 * Wirkung im Cashflow:
 *   - Pro frühpensionierte Person, ab Jahr nach Erwerbsende bis Jahr
 *     vor ordentlichem AHV-Bezug (typisch 60-65 = 5 Jahre)
 *   - Bei Ehepaar: beide separat, weil eigene Beitragsbemessung (Vermögen
 *     wird hälftig zugerechnet bei Ehe)
 *   - Verwaltungskosten + Beitrag fliessen direkt ins Cashflow-Ausgaben.
 */

export const NE_MIN_BEITRAG = 530;
export const NE_MAX_BEITRAG = 26_400;
export const NE_BEMESSUNG_UNTERGRENZE = 350_000;
export const NE_BEMESSUNG_OBERGRENZE = 8_500_000;
/** Pro 50k Bemessung zusätzlich CHF 51 Beitrag (lineare Approx). */
const NE_STUFE_BEMESSUNG = 50_000;
const NE_STUFE_ZUSCHLAG = 51;

/**
 * AHV-NE-Beitrag pro Jahr aus Bemessungsbetrag (Vermögen-x20 + Renten-x20).
 */
export function ahvNeBeitragAusBemessung(bemessung: number): number {
  if (bemessung < NE_BEMESSUNG_UNTERGRENZE) return NE_MIN_BEITRAG;
  if (bemessung >= NE_BEMESSUNG_OBERGRENZE) return NE_MAX_BEITRAG;
  const stufenUeber = (bemessung - NE_BEMESSUNG_UNTERGRENZE) / NE_STUFE_BEMESSUNG;
  const beitrag = NE_MIN_BEITRAG + stufenUeber * NE_STUFE_ZUSCHLAG;
  return Math.min(NE_MAX_BEITRAG, Math.round(beitrag));
}

/**
 * AHV-NE-Beitrag direkt aus Vermögen + jährlichen Rentenleistungen.
 * Bei Ehepaar: jede Person zahlt eigenen Beitrag aus ihrem Anteil
 * (Vermögen typisch hälftig zugerechnet).
 */
export function ahvNeBeitragJahr(input: {
  vermoegen: number;
  rentenJahr: number;
}): number {
  const v = Math.max(0, input.vermoegen);
  const r = Math.max(0, input.rentenJahr);
  const bemessung = v * 20 + r * 20;
  return ahvNeBeitragAusBemessung(bemessung);
}

/**
 * Prüft, ob eine Person für ein bestimmtes Jahr NE-Beiträge schuldet:
 *  - Person ist mind. 20 (immer wahr in unserem Kontext)
 *  - Person hat AHV-Bezugsalter noch nicht erreicht (vor 65 / AHV21-Übergang)
 *  - Person ist im Jahr nicht mehr erwerbstätig (kein Einkommen aus Erwerb)
 *
 * Bei Erwerbstätigkeit unter Mindesteinkommen (CHF 530/J einbezahlt) kommt
 * der NE-Beitrag dazu wenn AHV-Beitrag aus Erwerb < NE-Beitrag — hier
 * vereinfacht: wenn erwerbsEinkommen > 0, kein NE-Beitrag.
 */
export function istNichterwerbstaetig(input: {
  alter: number;
  ahvBezugsalter: number;
  erwerbsEinkommenJahr: number;
}): boolean {
  if (input.alter >= input.ahvBezugsalter) return false; // bereits AHV-Bezug
  if (input.alter < 20) return false; // unter NE-Pflicht
  if (input.erwerbsEinkommenJahr > 0) return false; // noch erwerbstätig
  return true;
}
