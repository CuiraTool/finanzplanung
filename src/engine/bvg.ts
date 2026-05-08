/**
 * BVG (2. Säule, Pensionskasse) — Berechnungen.
 *
 * Eckwerte 2025:
 *   - BVG-Mindestumwandlungssatz Alter 65:  6.8%
 *     (BVG21-Reform 6.0% wurde am 22.9.2024 abgelehnt → bleibt 6.8%)
 *   - BVG-Mindestzinssatz Stand 2024–2025:  1.25%
 *   - Eintrittsschwelle 2025:               CHF 22'680
 *   - Koordinationsabzug 2025:              CHF 26'460
 *   - Max. koordinierter Lohn 2025:         CHF 64'260
 *
 * Vereinfachungen Etappe 1:
 *   - Nur PK-Altersguthaben heute → Projektion mit Mindestzinssatz → Bezug.
 *   - Pauschaler Umwandlungssatz 6.8% bei Alter 65 (BVG-Mindest).
 *   - Reale PKs haben Reglements mit individuellen Sätzen, oft 5–6.5% wegen
 *     überobligatorischem Anteil — Pflicht-Override pro PK kommt in Etappe 2.
 *   - Frühbezug-/Aufschubs-Anpassung des Umwandlungssatzes ist Reglement-spezifisch
 *     und folgt mit der vollen PK-Modellierung (Freizügigkeit, WEF, Einkäufe).
 */

export const BVG_UMWANDLUNGSSATZ_MIND_65 = 0.068;
export const BVG_MINDESTZINSSATZ_2025 = 0.0125;

/**
 * Projektion eines bestehenden Altersguthabens auf das Bezugsjahr —
 * verzinst mit dem angegebenen Zinssatz (default Mindestzinssatz 2025).
 *
 * Vereinfachung: keine zusätzlichen Beiträge (Sparkapital pro Jahr) modelliert.
 * Die kommen mit der vollen BVG-Engine in Etappe 2 dazu.
 */
export function bvgProjektion(
  saldoHeute: number,
  jahreBisBezug: number,
  zinssatz: number = BVG_MINDESTZINSSATZ_2025
): number {
  if (jahreBisBezug <= 0) return Math.round(saldoHeute);
  return Math.round(saldoHeute * Math.pow(1 + zinssatz, jahreBisBezug));
}

/**
 * Jährliche Rente aus PK-Saldo: saldo × Umwandlungssatz.
 */
export function bvgRenteAusSaldo(
  saldo: number,
  umwandlungssatz: number = BVG_UMWANDLUNGSSATZ_MIND_65
): number {
  return Math.round(saldo * umwandlungssatz);
}

export type BezugsPraeferenz = "rente" | "kapital" | "mischung";

export interface BvgBezugInput {
  altersguthabenHeute: number;
  jahreBisBezug: number;
  zinssatz?: number;
  umwandlungssatz?: number;
  bezugspraeferenz: BezugsPraeferenz;
  /** Bei "mischung": Prozent des Kapitalbezugs (0–100). Default 50. */
  kapitalanteilProzent?: number;
}

export interface BvgBezugOutput {
  saldoBeiBezug: number;
  jahresrente: number; // 0 bei 100% Kapital
  kapitalauszahlung: number; // 0 bei 100% Rente
  details: {
    bezugspraeferenz: BezugsPraeferenz;
    umwandlungssatz: number;
    zinssatz: number;
    kapitalanteilProzent: number;
  };
}

/**
 * Liefert, was die Person beim Pensionsantritt bekommt — abhängig von
 * der Bezugspräferenz.
 */
export function bvgBezug(input: BvgBezugInput): BvgBezugOutput {
  const zinssatz = input.zinssatz ?? BVG_MINDESTZINSSATZ_2025;
  const umwandlungssatz = input.umwandlungssatz ?? BVG_UMWANDLUNGSSATZ_MIND_65;
  const saldo = bvgProjektion(input.altersguthabenHeute, input.jahreBisBezug, zinssatz);

  if (input.bezugspraeferenz === "rente") {
    return {
      saldoBeiBezug: saldo,
      jahresrente: bvgRenteAusSaldo(saldo, umwandlungssatz),
      kapitalauszahlung: 0,
      details: { bezugspraeferenz: "rente", umwandlungssatz, zinssatz, kapitalanteilProzent: 0 },
    };
  }

  if (input.bezugspraeferenz === "kapital") {
    return {
      saldoBeiBezug: saldo,
      jahresrente: 0,
      kapitalauszahlung: saldo,
      details: {
        bezugspraeferenz: "kapital",
        umwandlungssatz,
        zinssatz,
        kapitalanteilProzent: 100,
      },
    };
  }

  // mischung
  const kapAnteil = clamp(input.kapitalanteilProzent ?? 50, 0, 100);
  const kapital = Math.round((saldo * kapAnteil) / 100);
  const renteSaldo = saldo - kapital;

  return {
    saldoBeiBezug: saldo,
    jahresrente: bvgRenteAusSaldo(renteSaldo, umwandlungssatz),
    kapitalauszahlung: kapital,
    details: {
      bezugspraeferenz: "mischung",
      umwandlungssatz,
      zinssatz,
      kapitalanteilProzent: kapAnteil,
    },
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
