/**
 * BVG (2. Säule, Pensionskasse) — Berechnungen.
 *
 * Eckwerte 2025:
 *   - BVG-Mindestumwandlungssatz Alter 65:  6.8% (BVG21 abgelehnt 22.9.2024)
 *   - BVG-Mindestzinssatz 2024–2025:        1.25%
 *
 * Reale PKs haben meist tiefere Umwandlungssätze wegen überobligatorischem
 * Anteil — daher pro Person eingebbar (default 6.8% als gesetzliches Mindest).
 *
 * Modell-Annahme: Der User gibt das voraussichtliche Altersguthaben *bei Bezug*
 * direkt vom PK-Ausweis ein (also den Wert, der mit dem gewünschten Bezugsalter
 * korrespondiert). Wir projizieren das nicht selbst — der PK-Ausweis ist
 * präziser als unsere Annahme. Freizügigkeitsguthaben und freiwillige Einkäufe
 * werden separat addiert und mit Mindestzinssatz bis Bezugsjahr verzinst.
 *
 * 3-Jahres-Sperrfrist (Art. 79b Abs. 3 BVG): Einkäufe innerhalb 3 Jahren vor
 * einem Kapitalbezug dürfen nicht als Kapital bezogen werden — die Engine
 * markiert solche Einkäufe als "verletzt", die UI zeigt eine Warnung. Die
 * Berechnung selbst zählt aktuell beide Beträge zusammen — die Sperrfrist-
 * Logik mit Anteilsverteilung kommt mit der Steuer-Engine.
 */

export const BVG_UMWANDLUNGSSATZ_MIND_65 = 0.068;
export const BVG_MINDESTZINSSATZ_2025 = 0.0125;
export const SPERRFRIST_EINKAUF_JAHRE = 3;

/**
 * Compound-Verzinsung eines Saldos über n Jahre.
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

export interface FreizuegigkeitItem {
  saldoHeute: number;
  auszahlungsjahr: number;
  renditeProzent: number;
}

export interface EinkaufItem {
  jahr: number;
  betrag: number;
}

export interface GesamtkapitalInput {
  /** Voraussichtliches PK-Altersguthaben beim gewünschten Bezugsalter, vom PK-Ausweis. */
  altersguthabenBeiBezug: number;
  /** Bezugsjahr — wird aus geburtsdatum + bezugsalter berechnet. */
  bezugsjahr: number;
  einkaeufe?: EinkaufItem[];
  zinssatz?: number;
  jetztJahr?: number;
}

/**
 * Aggregiert PK-Altersguthaben + verzinste Einkäufe zum Gesamtkapital im Bezugsjahr.
 *  - altersguthabenBeiBezug: 1:1 (kommt schon vom PK-Ausweis)
 *  - Einkäufe: vom Einkaufsjahr bis Bezugsjahr mit BVG-Mindestzinssatz verzinst
 *
 * Freizügigkeit gehört NICHT mehr hier rein — sie wird in ihrem eigenen
 * Auszahlungsjahr mit eigener Rendite ausbezahlt (siehe freizuegigkeitAuszahlung).
 */
export function bvgGesamtkapitalBeiBezug(input: GesamtkapitalInput): number {
  const zinssatz = input.zinssatz ?? BVG_MINDESTZINSSATZ_2025;

  let total = input.altersguthabenBeiBezug;

  for (const ek of input.einkaeufe ?? []) {
    const jahre = Math.max(0, input.bezugsjahr - ek.jahr);
    total += ek.betrag * Math.pow(1 + zinssatz, jahre);
  }

  return Math.round(total);
}

/**
 * Auszahlung einer Freizügigkeit im jeweiligen Auszahlungsjahr —
 * Saldo verzinst mit Person-spezifischer Rendite.
 */
export function freizuegigkeitAuszahlung(
  fz: FreizuegigkeitItem,
  jetztJahr: number = new Date().getFullYear()
): { jahr: number; betrag: number } {
  const jahre = Math.max(0, fz.auszahlungsjahr - jetztJahr);
  const projiziert = fz.saldoHeute * Math.pow(1 + fz.renditeProzent / 100, jahre);
  return { jahr: fz.auszahlungsjahr, betrag: Math.round(projiziert) };
}

/**
 * Markiert Einkäufe, die innerhalb der 3-Jahres-Sperrfrist vor Kapitalbezug
 * liegen. Solche Einkäufe dürfen — bei (Teil-)Kapitalbezug — nicht als Kapital
 * bezogen werden.
 */
export function einkaufeMitSperrfristWarnung(
  einkaeufe: EinkaufItem[],
  bezugsjahr: number
): { item: EinkaufItem; verletzt: boolean }[] {
  return einkaeufe.map((e) => ({
    item: e,
    verletzt: bezugsjahr - e.jahr < SPERRFRIST_EINKAUF_JAHRE,
  }));
}

export interface BvgBezugInput {
  /** Bereits aggregiertes Gesamtkapital — siehe bvgGesamtkapitalBeiBezug. */
  saldoBeiBezug: number;
  bezugspraeferenz: BezugsPraeferenz;
  /** PK-spezifischer Umwandlungssatz (default Mindest-UWS Alter 65 = 6.8%). */
  umwandlungssatz?: number;
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
    kapitalanteilProzent: number;
  };
}

export function bvgBezug(input: BvgBezugInput): BvgBezugOutput {
  const umwandlungssatz = input.umwandlungssatz ?? BVG_UMWANDLUNGSSATZ_MIND_65;
  const saldo = input.saldoBeiBezug;

  if (input.bezugspraeferenz === "rente") {
    return {
      saldoBeiBezug: saldo,
      jahresrente: bvgRenteAusSaldo(saldo, umwandlungssatz),
      kapitalauszahlung: 0,
      details: { bezugspraeferenz: "rente", umwandlungssatz, kapitalanteilProzent: 0 },
    };
  }

  if (input.bezugspraeferenz === "kapital") {
    return {
      saldoBeiBezug: saldo,
      jahresrente: 0,
      kapitalauszahlung: saldo,
      details: { bezugspraeferenz: "kapital", umwandlungssatz, kapitalanteilProzent: 100 },
    };
  }

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
      kapitalanteilProzent: kapAnteil,
    },
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
