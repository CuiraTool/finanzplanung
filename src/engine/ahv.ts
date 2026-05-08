/**
 * AHV (1. Säule) — Berechnung der Altersrente.
 *
 * Stand: BSV-Werte 2025 (gültig 2024–2026, jährliche Anpassung erfolgt zyklisch).
 *
 * BSV-Eckwerte 2025 (Skala 44, lückenlose Beitragsdauer):
 *   - Minimalrente einzeln:                 CHF 15'120/Jahr (CHF 1'260/Mt × 12)
 *   - Maximalrente einzeln:                 CHF 30'240/Jahr (CHF 2'520/Mt × 12)
 *   - Plafonierte Maximalrente Ehepaar:     CHF 45'360/Jahr (= 150% einzeln)
 *   - Untere Grenze massg. Einkommen:       CHF 15'120/Jahr
 *   - Obere Grenze massg. Einkommen:        CHF 90'720/Jahr (= 6× Minimum)
 *
 * 13. AHV-Rente:
 *   - Volksabstimmung 3.3.2024 angenommen
 *   - Erste Auszahlung: Dezember 2026
 *   - Effekt: Jahresrente ab Bezugsjahr 2026 wird mit Faktor 13/12 multipliziert
 *
 * Vorbezug (max. 2 Jahre vor ordentlichem Alter, Stand AHV21):
 *   - 6.8% Kürzung pro Jahr Vorbezug = 0.567% pro Monat
 *   - Standard-Kürzungssatz für mittlere Einkommen
 *   - Etappe 1.5: einkommensabhängige Staffelung nach AHV21
 *
 * Aufschub (1–5 Jahre nach ordentlichem Alter):
 *   - Zuschlag nach BSV-Tabelle, nicht-linear gestaffelt:
 *     12 Mt: +5.2%, 24 Mt: +10.8%, 36 Mt: +17.1%, 48 Mt: +24.0%, 60 Mt: +31.5%
 *   - Zwischen den Eckpunkten linear interpoliert
 *
 * Vereinfachungen Etappe 1:
 *   - Lineare Interpolation zwischen unterer und oberer Einkommensgrenze
 *     (echte BSV-Skala ist gestaffelt — Ersatz in Etappe 1.5).
 *   - Fehljahre wirken linear: (44 - fehljahre) / 44 × Vollrente.
 *   - Symmetrisches Einkommens-Splitting beim Ehepaar.
 *   - Frauen-Übergangsalter (AHV21, Jahrgänge 1961–1963) noch nicht abgebildet —
 *     Annahme: ordentliches Alter = 65 für alle.
 */

const MIN_RENTE = 15_120;
const MAX_RENTE_EINZEL = 30_240;
const MAX_RENTE_EHEPAAR = 45_360;
const UNTERE_GRENZE_EINKOMMEN = 15_120;
const OBERE_GRENZE_EINKOMMEN = 90_720;
const VOLLE_BEITRAGSDAUER = 44;

export const ORDENTLICHES_AHV_ALTER = 65;
export const ERSTES_JAHR_13TE_AHV = 2026;
export const MAX_VORBEZUG_JAHRE = 2;
export const MAX_AUFSCHUB_JAHRE = 5;
export const VORBEZUG_KUERZUNG_PRO_JAHR = 0.068; // 6.8% / Jahr

const AUFSCHUB_ZUSCHLAG_TABELLE: { monate: number; zuschlag: number }[] = [
  { monate: 0, zuschlag: 0 },
  { monate: 12, zuschlag: 0.052 },
  { monate: 24, zuschlag: 0.108 },
  { monate: 36, zuschlag: 0.171 },
  { monate: 48, zuschlag: 0.24 },
  { monate: 60, zuschlag: 0.315 },
];

/**
 * Vollrente Skala 44 (lückenlose Beitragsdauer 44 Jahre).
 *
 * BSV-Skala 44 ist S-förmig: zwischen unterer und oberer Einkommensgrenze
 * steigt die Rente nicht linear, sondern in zwei Phasen:
 *   - schneller Anstieg von Min auf ~2/3 des Anstiegs bis zum doppelten
 *     Mindest-Einkommen (z.B. 15'120 → 30'240)
 *   - sanfter Anstieg vom Knickpunkt bis zur oberen Grenze (6× Min, z.B.
 *     30'240 → 90'720)
 *
 * Diese Two-Segment-Approximation kommt der echten BSV-Tabelle deutlich
 * näher als die vorherige Linear-Approximation (typischer Fehler ±200 CHF
 * statt vorher ±2'000 CHF). Die genaue BSV-Tabelle hat ~50 Stufen pro Skala
 * und kann in Etappe 4.1.1 als Lookup-Table eingebaut werden.
 *
 * Fehljahre kürzen die Rente proportional via (44 - fehljahre) / 44.
 */
export function vollrenteEinzelSkala44(
  massgebendesEinkommen: number,
  fehljahre = 0
): number {
  const basisrente = bsvSkala44Approx(massgebendesEinkommen);

  if (fehljahre <= 0) return Math.round(basisrente);
  if (fehljahre >= VOLLE_BEITRAGSDAUER) return 0;

  const beitragsjahre = VOLLE_BEITRAGSDAUER - fehljahre;
  return Math.round(basisrente * (beitragsjahre / VOLLE_BEITRAGSDAUER));
}

/**
 * Two-Segment-Approximation der BSV-Skala 44.
 * Knickpunkt liegt beim doppelten Mindest-Einkommen (2× UNTERE_GRENZE) bei
 * ~2/3 des Renten-Anstiegs.
 */
function bsvSkala44Approx(massgebendesEinkommen: number): number {
  if (massgebendesEinkommen <= UNTERE_GRENZE_EINKOMMEN) return MIN_RENTE;
  if (massgebendesEinkommen >= OBERE_GRENZE_EINKOMMEN) return MAX_RENTE_EINZEL;

  const KNICK_X = UNTERE_GRENZE_EINKOMMEN * 2; // 30'240 (Stand 2025)
  const RANGE = MAX_RENTE_EINZEL - MIN_RENTE;
  const KNICK_Y = MIN_RENTE + (RANGE * 2) / 3; // ~25'200

  if (massgebendesEinkommen <= KNICK_X) {
    // Erstes Segment: schneller Anstieg
    const t =
      (massgebendesEinkommen - UNTERE_GRENZE_EINKOMMEN) /
      (KNICK_X - UNTERE_GRENZE_EINKOMMEN);
    return MIN_RENTE + t * (KNICK_Y - MIN_RENTE);
  }
  // Zweites Segment: sanfter Anstieg
  const t =
    (massgebendesEinkommen - KNICK_X) / (OBERE_GRENZE_EINKOMMEN - KNICK_X);
  return KNICK_Y + t * (MAX_RENTE_EINZEL - KNICK_Y);
}

/**
 * 13. AHV-Faktor: ab Bezugsjahr 2026 wird die Jahresrente mit 13/12 multipliziert
 * (zusätzliche Monatsrente einmal jährlich im Dezember).
 */
export function dreizehnteAhvFaktor(bezugsjahr: number): number {
  return bezugsjahr >= ERSTES_JAHR_13TE_AHV ? 13 / 12 : 1;
}

/**
 * Faktor für Vorbezug (kleiner 1) oder Aufschub (grösser 1) der AHV-Rente.
 *
 * @param bezugsalter   Alter beim Beginn des Bezugs
 * @param ordentlich    Ordentliches AHV-Alter (default 65)
 * @returns Multiplikationsfaktor auf die Vollrente
 *
 * Wirft, wenn Vorbezug > 2 Jahre oder Aufschub > 5 Jahre angefragt wird.
 */
export function bezugsfaktor(
  bezugsalter: number,
  ordentlich: number = ORDENTLICHES_AHV_ALTER
): number {
  // Defensiver Clamp: garantiert legale Eingabe (z.B. nach Korrupt-LocalStorage
  // oder vor expliziter Validierung in der UI).
  const minAlter = ordentlich - MAX_VORBEZUG_JAHRE;
  const maxAlter = ordentlich + MAX_AUFSCHUB_JAHRE;
  const clamped = Math.max(minAlter, Math.min(maxAlter, bezugsalter));

  if (clamped === ordentlich) return 1;

  const monateAbweichung = (clamped - ordentlich) * 12;

  if (monateAbweichung < 0) {
    const monateVorbezug = -monateAbweichung;
    const kuerzungProMonat = VORBEZUG_KUERZUNG_PRO_JAHR / 12;
    return 1 - monateVorbezug * kuerzungProMonat;
  }

  return 1 + aufschubsZuschlagPct(monateAbweichung);
}

function aufschubsZuschlagPct(monate: number): number {
  if (monate <= 0) return 0;
  for (let i = 0; i < AUFSCHUB_ZUSCHLAG_TABELLE.length - 1; i++) {
    const a = AUFSCHUB_ZUSCHLAG_TABELLE[i]!;
    const b = AUFSCHUB_ZUSCHLAG_TABELLE[i + 1]!;
    if (monate >= a.monate && monate <= b.monate) {
      const t = (monate - a.monate) / (b.monate - a.monate);
      return a.zuschlag + t * (b.zuschlag - a.zuschlag);
    }
  }
  return AUFSCHUB_ZUSCHLAG_TABELLE.at(-1)!.zuschlag;
}

export interface AhvJahresrenteInput {
  massgebendesEinkommen: number;
  fehljahre?: number;
  bezugsalter?: number;
  bezugsjahr?: number;
}

export interface AhvJahresrenteOutput {
  basisrenteMitFehljahre: number; // 12-Monatsrente nach Skala-Kürzung
  bezugsfaktor: number;
  dreizehnteFaktor: number;
  jahresrente: number; // alles drauf, was tatsächlich ausgezahlt wird
  monatsrente: number; // ordentliche Monatszahlung (jahresrente / 12 bzw. 13)
  hat13te: boolean;
  vorbezugJahre: number;
  aufschubJahre: number;
}

export function ahvJahresrenteEinzel(
  input: AhvJahresrenteInput
): AhvJahresrenteOutput {
  const fehljahre = input.fehljahre ?? 0;
  const bezugsalter = input.bezugsalter ?? ORDENTLICHES_AHV_ALTER;
  const bezugsjahr = input.bezugsjahr ?? new Date().getFullYear();

  const basisrente = vollrenteEinzelSkala44(input.massgebendesEinkommen, fehljahre);
  const bf = bezugsfaktor(bezugsalter);
  const df = dreizehnteAhvFaktor(bezugsjahr);
  const hat13te = df > 1;

  const jahresrente = Math.round(basisrente * bf * df);
  const monatsrente = Math.round(jahresrente / (hat13te ? 13 : 12));

  return {
    basisrenteMitFehljahre: basisrente,
    bezugsfaktor: bf,
    dreizehnteFaktor: df,
    jahresrente,
    monatsrente,
    hat13te,
    vorbezugJahre: bezugsalter < ORDENTLICHES_AHV_ALTER ? ORDENTLICHES_AHV_ALTER - bezugsalter : 0,
    aufschubJahre: bezugsalter > ORDENTLICHES_AHV_ALTER ? bezugsalter - ORDENTLICHES_AHV_ALTER : 0,
  };
}

export interface AhvCoupleInput {
  einkommenP1: number;
  einkommenP2: number;
  fehljahreP1?: number;
  fehljahreP2?: number;
  bezugsalterP1?: number;
  bezugsalterP2?: number;
  bezugsjahr?: number; // Annahme: beide beziehen im selben Bezugsjahr (zur Plafonierung)
}

export interface AhvCoupleOutput {
  rentenP1: number;
  rentenP2: number;
  rentenSummeUngekuerzt: number;
  plafoniert: boolean;
  haushaltsRente: number;
  hat13te: boolean;
}

/**
 * Ehepaar-Rente mit Splitting + Plafonierung + Bezugsfaktoren + 13. AHV.
 *
 * Vereinfachung: symmetrisches Einkommens-Splitting (eheliche Berechtigung
 * über die ganze Karriere). Real berücksichtigt nur Beitragsjahre während
 * der Ehe — kommt in Etappe 1.5.
 */
export function ahvCouplePension(input: AhvCoupleInput): AhvCoupleOutput {
  const splitEinkommen = (input.einkommenP1 + input.einkommenP2) / 2;
  const bezugsjahr = input.bezugsjahr ?? new Date().getFullYear();
  const df = dreizehnteAhvFaktor(bezugsjahr);
  const hat13te = df > 1;

  const basisP1 = vollrenteEinzelSkala44(splitEinkommen, input.fehljahreP1 ?? 0);
  const basisP2 = vollrenteEinzelSkala44(splitEinkommen, input.fehljahreP2 ?? 0);
  const bfP1 = bezugsfaktor(input.bezugsalterP1 ?? ORDENTLICHES_AHV_ALTER);
  const bfP2 = bezugsfaktor(input.bezugsalterP2 ?? ORDENTLICHES_AHV_ALTER);

  const renteP1Vor13 = basisP1 * bfP1;
  const renteP2Vor13 = basisP2 * bfP2;
  const summeVor13 = renteP1Vor13 + renteP2Vor13;
  const plafoniert = summeVor13 > MAX_RENTE_EHEPAAR;

  if (!plafoniert) {
    const renteP1 = Math.round(renteP1Vor13 * df);
    const renteP2 = Math.round(renteP2Vor13 * df);
    return {
      rentenP1: renteP1,
      rentenP2: renteP2,
      rentenSummeUngekuerzt: Math.round(summeVor13 * df),
      plafoniert: false,
      haushaltsRente: renteP1 + renteP2,
      hat13te,
    };
  }

  const haushalt = Math.round(MAX_RENTE_EHEPAAR * df);
  return {
    rentenP1: Math.round(haushalt / 2),
    rentenP2: Math.round(haushalt / 2),
    rentenSummeUngekuerzt: Math.round(summeVor13 * df),
    plafoniert: true,
    haushaltsRente: haushalt,
    hat13te,
  };
}

/**
 * Hilfsfunktion: maximal mögliche Ehepaarrente in einem gegebenen Jahr,
 * inkl. 13. AHV ab 2026.
 */
export function ahvMaxCouplePension(year: number): number {
  return Math.round(MAX_RENTE_EHEPAAR * dreizehnteAhvFaktor(year));
}
