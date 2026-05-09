/**
 * 3. Säule (3a + 3b) — Berechnungen.
 *
 * Eckwerte 2025 (für spätere Steuerlogik in Block 7+):
 *   - 3a-Maximalbeitrag Erwerbstätige mit PK:    CHF 7'258
 *   - 3a-Maximalbeitrag Selbständige ohne PK:    CHF 36'288 (max 20% Erwerbseinkommen)
 *
 * Modell Block 6 Etappe 1:
 *   - Pro Person beliebig viele 3.-Säule-Items
 *   - Item-Typ "konto" (Bank/Wertschriften): aktueller Wert, Auszahlungsjahr,
 *     Rendite-Annahme p.a. → Engine projiziert mit (1+r)^Jahre
 *   - Item-Typ "versicherung": Rückkaufswert heute + Ablaufjahr → Engine nimmt
 *     Rückkaufswert als Auszahlungsbetrag (vereinfacht; reale Erlebensfall-
 *     leistung mit Überschüssen folgt mit Versicherungs-Engine V2)
 *
 * Bezugsregeln 3a (frühestens 60, spätestens AHV-Rentenalter, Ausnahmen WEF /
 * Selbständigkeit / Auswanderung) werden in Etappe 2 als Validierung ergänzt —
 * für jetzt vertrauen wir der Eingabe des Users beim Auszahlungsjahr.
 */

export type SaeuleDreiItemTyp = "konto" | "versicherung";

export interface SaeuleDreiItem {
  id: string;
  type: SaeuleDreiItemTyp;
  beschreibung: string;
  // Konto-spezifisch:
  aktuellerWert: number | null;
  auszahlungsjahr: number;
  renditeProzent: number;
  // Versicherung-spezifisch:
  rueckkaufswert: number | null;
  ablaufswert: number | null; // Erlebensfallleistung (höher als Rückkaufswert wegen Überschüssen)
  ablaufjahr: number;
  // Einzahlungen:
  jaehrlicheEinzahlung: number | null;
  einzahlungAb: number;
  einzahlungBis: number;
}

export interface SaeuleDreiAuszahlung {
  jahr: number;
  betrag: number;
}

/**
 * Berechnet die Auszahlung eines 3.-Säule-Items im Auszahlungs- bzw. Ablaufjahr.
 * Liefert null, wenn Pflichtwerte fehlen.
 */
export function saeuleDreiAuszahlung(
  item: SaeuleDreiItem,
  jetztJahr: number = new Date().getFullYear()
): SaeuleDreiAuszahlung | null {
  if (item.type === "konto") {
    if (item.aktuellerWert == null) return null;
    const r = item.renditeProzent / 100;
    let saldo = item.aktuellerWert;
    // Jahr für Jahr: ggf. Einzahlung addieren, dann verzinsen.
    // Damit ist auch die Sparphase korrekt modelliert.
    for (let y = jetztJahr + 1; y <= item.auszahlungsjahr; y++) {
      if (
        item.jaehrlicheEinzahlung != null &&
        y >= item.einzahlungAb &&
        (item.einzahlungBis === 0 || y <= item.einzahlungBis)
      ) {
        saldo += item.jaehrlicheEinzahlung;
      }
      saldo *= 1 + r;
    }
    return { jahr: item.auszahlungsjahr, betrag: Math.round(saldo) };
  }
  // Versicherung: Ablaufwert hat Vorrang (Erlebensfallleistung), sonst Rückkaufswert
  const betrag = item.ablaufswert ?? item.rueckkaufswert;
  if (betrag == null) return null;
  return { jahr: item.ablaufjahr, betrag };
}

/**
 * Total über alle 3.-Säule-Items einer Person — entspricht der Summe aller
 * voraussichtlichen Auszahlungen über alle Auszahlungs-/Ablaufjahre hinweg.
 */
export function saeuleDreiTotal(
  items: SaeuleDreiItem[],
  jetztJahr: number = new Date().getFullYear()
): number {
  let total = 0;
  for (const item of items) {
    const a = saeuleDreiAuszahlung(item, jetztJahr);
    if (a) total += a.betrag;
  }
  return total;
}

/**
 * Liefert für jedes Item die einzelne Auszahlung (für Cashflow-Charts).
 */
export function saeuleDreiAuszahlungen(
  items: SaeuleDreiItem[],
  jetztJahr: number = new Date().getFullYear()
): SaeuleDreiAuszahlung[] {
  return items
    .map((it) => saeuleDreiAuszahlung(it, jetztJahr))
    .filter((a): a is SaeuleDreiAuszahlung => a != null);
}
