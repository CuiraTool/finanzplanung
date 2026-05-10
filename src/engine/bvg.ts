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

// ─── WEF-Vorbezug Validierung (BVG Art. 30a–g) ──────────────────────

export const WEF_MINDESTBETRAG = 20_000;
export const WEF_INTERVALL_JAHRE = 5;
export const WEF_SPERRFRIST_VOR_BEZUG_JAHRE = 3;
export const WEF_HALBIERUNGSALTER = 50;

export interface WefWarnung {
  entryId: string;
  schwere: "fehler" | "warnung";
  text: string;
}

export interface WefValidiereInput {
  vorbezuege: { id: string; jahr: number; betrag: number | null }[];
  altersguthabenHeute: number | null;
  geburtsjahr: number;
  pkBezugsjahr: number | null;
}

/**
 * Prüft die gesetzlichen Limiten für WEF-Vorbezüge:
 *  • Mindestbetrag CHF 20'000 (BVG Art. 30c Abs. 1)
 *  • 5-Jahres-Intervall zwischen Bezügen (BVG Art. 30c Abs. 4)
 *  • Sperrfrist 3 Jahre vor PK-Kapitalbezug (Art. 30d Abs. 3 lit. a)
 *  • Ab Alter 50: max 50 % des Altersguthabens (Art. 30c Abs. 2)
 *    Vereinfachung: aktueller Saldo statt Saldo mit 50.
 *
 * Liefert Warnungen pro Eintrag — blockiert nichts, der User wird
 * im UI auf den Verstoss hingewiesen.
 */
export function wefValidiere(input: WefValidiereInput): WefWarnung[] {
  const out: WefWarnung[] = [];
  const sorted = input.vorbezuege
    .filter((e) => e.betrag != null && e.betrag > 0 && e.jahr > 0)
    .slice()
    .sort((a, b) => a.jahr - b.jahr);

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]!;
    const betrag = e.betrag as number;

    if (betrag < WEF_MINDESTBETRAG) {
      out.push({
        entryId: e.id,
        schwere: "fehler",
        text: `Mindestbetrag CHF ${WEF_MINDESTBETRAG.toLocaleString(
          "de-CH"
        )} nicht erreicht (BVG Art. 30c Abs. 1).`,
      });
    }

    if (i > 0) {
      const vorher = sorted[i - 1]!;
      if (e.jahr - vorher.jahr < WEF_INTERVALL_JAHRE) {
        out.push({
          entryId: e.id,
          schwere: "fehler",
          text: `Mind. ${WEF_INTERVALL_JAHRE} Jahre Abstand zum vorherigen Bezug (${vorher.jahr}) verlangt.`,
        });
      }
    }

    if (
      input.pkBezugsjahr != null &&
      input.pkBezugsjahr - e.jahr < WEF_SPERRFRIST_VOR_BEZUG_JAHRE
    ) {
      out.push({
        entryId: e.id,
        schwere: "warnung",
        text: `Liegt < ${WEF_SPERRFRIST_VOR_BEZUG_JAHRE} Jahre vor PK-Bezug (${input.pkBezugsjahr}) — Rückzahlungsfrist verletzt.`,
      });
    }

    const alterImBezugsjahr = e.jahr - input.geburtsjahr;
    if (
      alterImBezugsjahr >= WEF_HALBIERUNGSALTER &&
      input.altersguthabenHeute != null &&
      input.altersguthabenHeute > 0
    ) {
      const maxBetrag = Math.round(input.altersguthabenHeute / 2);
      if (betrag > maxBetrag) {
        out.push({
          entryId: e.id,
          schwere: "warnung",
          text: `Ab Alter 50 max ~50 % des Altersguthabens (≈ CHF ${maxBetrag.toLocaleString(
            "de-CH"
          )}) — Vereinfachung: aktueller Saldo statt Stand mit 50.`,
        });
      }
    }
  }

  return out;
}
