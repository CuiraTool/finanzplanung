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
 *
 * AHV21 Übergangsalter (Phase 5.x):
 *   - Frauen Jg. 1960 oder älter: 64
 *   - Jg. 1961: 64 + 3 Monate (= 64.25)
 *   - Jg. 1962: 64 + 6 Monate (= 64.5)
 *   - Jg. 1963: 64 + 9 Monate (= 64.75)
 *   - Jg. 1964 und jünger / alle Männer: 65
 *   Plus: reduzierte Vorbezugskürzungssätze für Übergangs-Jg (BSV-Tabelle,
 *   abhängig vom mittleren Einkommen) — hier nicht abgebildet, der User
 *   kriegt einen Hinweis im Wizard.
 *
 * TODO (Sprint AHV-NE):
 *   AHV-Nichterwerbstätigen-Beiträge bei Frühpension.
 *   Wer zwischen Frühpension und ordentlichem AHV-Alter 65 nicht mehr
 *   erwerbstätig ist, schuldet als Nichterwerbstätiger AHV/IV/EO-Beiträge
 *   vom Vermögen + 20× Renteneinkommen. BSV-Skala 2025:
 *     - Mindest:  CHF 530/J
 *     - Maximum:  CHF 26'400/J
 *     - Stufen:   12 Stufen nach Bemessungsbetrag (Vermögen × 20 + Renteneinkommen)
 *   Wirkt im Cashflow als Ausgabe ab Vorpensions-Jahr bis Bezugsalter
 *   ordentliche AHV. Plus: ausgleichende Beitragsjahre für Lückenlosigkeit
 *   der Skala 44. Implementation: separates Modul ahv-ne-beitrag.ts mit
 *   Bemessungsbetrag-Berechnung + Beitragstabelle. In cashflow.ts pro
 *   Jahr aufrufen wenn Vorpensions-Bedingung erfüllt.
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

/**
 * AHV21-Übergangsalter für Frauen (gestaffelt nach Geburtsjahr).
 * Liefert das ordentliche Referenzalter in Jahren (mit Bruchteil für
 * die Übergangsjahrgänge: z.B. 64.5 = 64 Jahre + 6 Monate).
 *
 * Männer: immer 65.
 * Frauen Jg ≤1960: 64.
 * Frauen Jg 1961: 64.25 (64 + 3 Monate).
 * Frauen Jg 1962: 64.5 (64 + 6 Monate).
 * Frauen Jg 1963: 64.75 (64 + 9 Monate).
 * Frauen Jg ≥1964: 65.
 */
export function ordentlichesAhvAlter(
  geburtsjahr: number,
  geschlecht: "m" | "w" | "andere" | null | undefined
): number {
  if (geschlecht !== "w") return ORDENTLICHES_AHV_ALTER;
  if (geburtsjahr <= 1960) return 64;
  if (geburtsjahr === 1961) return 64.25;
  if (geburtsjahr === 1962) return 64.5;
  if (geburtsjahr === 1963) return 64.75;
  return 65; // Jg 1964 und später
}

/**
 * True wenn die Person zu den AHV21-Übergangsjahrgängen (Frauen 1961-63)
 * gehört. Diese haben reduzierte Vorbezugskürzungs-Sätze (BSV-Tabelle,
 * einkommensabhängig — hier nicht im Detail abgebildet).
 */
export function istAhv21Uebergangsjahrgang(
  geburtsjahr: number,
  geschlecht: "m" | "w" | "andere" | null | undefined
): boolean {
  return geschlecht === "w" && geburtsjahr >= 1961 && geburtsjahr <= 1963;
}

/**
 * Reduzierte Vorbezug-Kürzungssätze für AHV21-Übergangsfrauen
 * (Jg 1961-1963), Quelle: BSV-Merkblatt 3.04 v01.01.2025 "Flexibler
 * Rentenbezug", Anhang 1.
 *
 * Bei Vorbezug erhalten Übergangsfrauen einkommensabhängige
 * Erleichterung. Tabelle gibt prozentuale jährliche Kürzung zurück:
 *  - tieferes Einkommen → tiefere Kürzung (oder gar 0%)
 *  - höheres Einkommen → bis Standard 6.8% (kein Rabatt)
 *
 * Vereinfacht: 3 Brackets nach mittlerem Einkommen (BSV-Tabelle ist
 * granular auf CHF 1'512 — hier approximiert via Brackets):
 *
 * Vorbezugs-Kürzung pro Jahr Vorbezug (über Übergangs-Schwelle hinaus):
 * Massg. Eink.    | Jg 1961 | Jg 1962 | Jg 1963
 * ≤ 60'480        | 0.0%    | 2.5%    | 4.0%
 * 60'480-75'600   | 2.5%    | 4.0%    | 5.5%
 * 75'600-90'720   | 4.5%    | 5.5%    | 6.0%
 * > 90'720        | 6.8%    | 6.8%    | 6.8%
 */
export function vorbezugKuerzungProJahrAhv21(
  geburtsjahr: number,
  geschlecht: "m" | "w" | "andere" | null | undefined,
  massgebendesEinkommen: number
): number {
  // Nur Frauen Jg 1961-1963 bekommen Rabatt
  if (!istAhv21Uebergangsjahrgang(geburtsjahr, geschlecht)) {
    return VORBEZUG_KUERZUNG_PRO_JAHR; // 6.8 %
  }

  const e = massgebendesEinkommen;
  // BSV-Tabelle (vereinfacht — Etappe 1.5 ist genauer)
  if (geburtsjahr === 1961) {
    if (e <= 60_480) return 0.0;
    if (e <= 75_600) return 0.025;
    if (e <= 90_720) return 0.045;
    return 0.068;
  }
  if (geburtsjahr === 1962) {
    if (e <= 60_480) return 0.025;
    if (e <= 75_600) return 0.04;
    if (e <= 90_720) return 0.055;
    return 0.068;
  }
  // 1963
  if (e <= 60_480) return 0.04;
  if (e <= 75_600) return 0.055;
  if (e <= 90_720) return 0.06;
  return 0.068;
}

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
  const basisrente = bsvSkala44Exakt(massgebendesEinkommen);

  if (fehljahre <= 0) return Math.round(basisrente);
  if (fehljahre >= VOLLE_BEITRAGSDAUER) return 0;

  const beitragsjahre = VOLLE_BEITRAGSDAUER - fehljahre;
  return Math.round(basisrente * (beitragsjahre / VOLLE_BEITRAGSDAUER));
}

/**
 * Echte BSV-Skala 44 Vollrenten (Stand 1.1.2025).
 *
 * Quelle: BSV Vollzug Dokument 6462 (sozialversicherungen.admin.ch).
 * 51 Einkommens-Stufen von 15'120 bis 90'720 CHF (Schritt 1'512 = 1/10 Min).
 * Zwischen den Stufen wird linear interpoliert (BSV-Praxis bei der
 * tatsächlichen Rentenberechnung).
 */
import skala44Daten from "./ahv-data/skala44-2025.json";

interface Skala44Daten {
  validFrom: string;
  minEinkommen: number;
  maxEinkommen: number;
  minRenteJahr: number;
  maxRenteJahr: number;
  /** [massgebendesEinkommen, monatlicheRente] */
  stufen: [number, number][];
}

const SKALA44 = skala44Daten as unknown as Skala44Daten;

function bsvSkala44Exakt(massgebendesEinkommen: number): number {
  if (massgebendesEinkommen <= SKALA44.minEinkommen) {
    return SKALA44.minRenteJahr;
  }
  if (massgebendesEinkommen >= SKALA44.maxEinkommen) {
    return SKALA44.maxRenteJahr;
  }

  // Lineare Interpolation zwischen zwei Stufen
  const stufen = SKALA44.stufen;
  for (let i = 0; i < stufen.length - 1; i++) {
    const [eUnten, mUnten] = stufen[i]!;
    const [eOben, mOben] = stufen[i + 1]!;
    if (massgebendesEinkommen >= eUnten && massgebendesEinkommen <= eOben) {
      const t = (massgebendesEinkommen - eUnten) / (eOben - eUnten);
      const monatlich = mUnten + t * (mOben - mUnten);
      return Math.round(monatlich * 12);
    }
  }
  return SKALA44.maxRenteJahr;
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
  ordentlich: number = ORDENTLICHES_AHV_ALTER,
  ahv21Context?: {
    geburtsjahr: number;
    geschlecht: "m" | "w" | "andere" | null | undefined;
    massgebendesEinkommen: number;
  }
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
    // V4: AHV21-Übergangsfrauen Jg 1961-1963 bekommen reduzierte Kürzung
    const kuerzungProJahr = ahv21Context
      ? vorbezugKuerzungProJahrAhv21(
          ahv21Context.geburtsjahr,
          ahv21Context.geschlecht,
          ahv21Context.massgebendesEinkommen
        )
      : VORBEZUG_KUERZUNG_PRO_JAHR;
    const kuerzungProMonat = kuerzungProJahr / 12;
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
  /** Für V4: AHV21-Übergangsfrauen Jg 1961-1963 reduzierte Vorbezug-Kürzung */
  geburtsjahr?: number;
  geschlecht?: "m" | "w" | "andere" | null;
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
  const ahv21Context =
    input.geburtsjahr != null && input.geschlecht !== undefined
      ? {
          geburtsjahr: input.geburtsjahr,
          geschlecht: input.geschlecht,
          massgebendesEinkommen: input.massgebendesEinkommen,
        }
      : undefined;
  const bf = bezugsfaktor(bezugsalter, ORDENTLICHES_AHV_ALTER, ahv21Context);
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
 * der Ehe — Override via `ahvRenteJahrEffektivP1/P2` deckt komplexe Fälle
 * wie Geschiedene mit IK-Auszug-Splitting, Witwer/Witwen mit eigener
 * Karriere vor Ehe, oder asymmetrische Beitragsjahre ab.
 *
 * BSV-genaue Splitting-Berechnung (Beitragsjahre vor/während/nach Ehe):
 *  - Vor Ehe: jeder zählt eigenes massgebendes Einkommen
 *  - Während Ehe: hälftiges Splitting beider Einkommen pro Beitragsjahr
 *  - Nach Ehe (Scheidung/Tod): jeder zählt eigenes Einkommen ohne Splitting
 *
 * Cuira-Approximation: voll-symmetrisch über alle 44 Beitragsjahre.
 * Für exakte Werte: IK-Auszug + Override-Feld nutzen.
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

  // V3: Plafond bei Aufschub angepasst — Maximum-Ehepaarrente erhält
  // den höheren der beiden Aufschub-Faktoren. Vorbezug wirkt nur auf
  // individuelle Renten, nicht auf Plafond (clamp ≥ 1).
  // Quelle: BSV-Merkblatt 3.04 + AHV-Praxis.
  const aufschubPlafondMultiplikator = Math.max(1, bfP1, bfP2);
  const effektiverPlafond = MAX_RENTE_EHEPAAR * aufschubPlafondMultiplikator;
  const plafoniert = summeVor13 > effektiverPlafond;

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

  const haushalt = Math.round(effektiverPlafond * df);
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

/**
 * V2: AHV-Kinderrente (Art. 22ter AHVG).
 *
 * Bezieht eine pensionierte Person AHV-Altersrente UND hat Kind:
 *  - unter 18 ODER
 *  - unter 25 UND in Ausbildung
 * → Anspruch auf Kinderrente von 40 % der eigenen Altersrente pro Kind.
 *
 * Plafond: zusammen mit Altersrente max. 150 % der Maximalrente einzeln
 * (entspricht ca. CHF 45'360 × 13/12 ≈ 49'140 bei 2026+ inkl. 13. AHV).
 *
 * Bei Ehepaar: pro Kind max. 1 Kinderrente (höhere der beiden), nicht 2.
 *
 * @param altersrente — eigene AHV-Altersrente p.a.
 * @param anzahlAnspruchsberechtigteKinder — Kinder < 18 oder < 25 + Ausbildung
 * @param jahr — für 13.-AHV-Plafond-Berechnung
 * @returns Kinderrente p.a. (kumuliert über alle Kinder, plafoniert)
 */
export function ahvKinderrente(
  altersrente: number,
  anzahlAnspruchsberechtigteKinder: number,
  jahr: number
): number {
  if (altersrente <= 0 || anzahlAnspruchsberechtigteKinder <= 0) return 0;
  const rohKinderrente = altersrente * 0.4 * anzahlAnspruchsberechtigteKinder;
  // Plafond: Alters- + Kinderrenten max. 150 % Einzelrente-Max
  // (gleich wie Ehepaar-Plafond 45'360, inkl. 13. AHV-Faktor).
  const plafond = MAX_RENTE_EHEPAAR * dreizehnteAhvFaktor(jahr);
  const verfuegbar = Math.max(0, plafond - altersrente);
  return Math.round(Math.min(rohKinderrente, verfuegbar));
}

/**
 * Bezugs-Startmonat der AHV-Rente.
 *
 * Per BSV-Merkblatt 3.04 "Flexibler Rentenbezug" (ab AHV21, 1.1.2024):
 * - Ordentliche Rente: Auszahlung ab dem Folgemonat nach Erreichen des
 *   Referenzalters (65 für Männer und Frauen ab Jg. 1964).
 * - Vorbezug: monatsweise möglich (1–24 Monate vor Referenzalter).
 *   Pro Monat 0.567% Kürzung (= 6.8%/Jahr).
 * - Aufschub: monatsweise möglich (12–60 Monate nach Referenzalter).
 *   Zuschlag gestaffelt gemäss BSV-Tabelle.
 *
 * `bezugsalter` ist als Dezimalzahl interpretiert: ganze Jahre + Monate/12.
 * Beispiele:
 *   - 65.0   → 65 Jahre 0 Monate (ordentlich)
 *   - 64.5   → 64 Jahre 6 Monate (Vorbezug 6 Mt)
 *   - 66.25  → 66 Jahre 3 Monate (Aufschub 1 J 3 Mt)
 *
 * Liefert null bei ungültigem Geburtsdatum.
 *
 * @example
 *   ahvBezugsstart("1967-07-29", 65)    → { jahr: 2032, monat: 8 }
 *   ahvBezugsstart("1967-07-29", 64)    → { jahr: 2031, monat: 8 }
 *   ahvBezugsstart("1967-07-29", 64.5)  → { jahr: 2032, monat: 2 }
 *   ahvBezugsstart("1967-12-15", 65)    → { jahr: 2033, monat: 1 }
 */
export interface AhvBezugsStart {
  jahr: number;
  monat: number; // 1..12
}

export function ahvBezugsstart(
  geburtsdatum: string,
  bezugsalter: number
): AhvBezugsStart | null {
  if (!geburtsdatum) return null;
  const parts = geburtsdatum.slice(0, 10).split("-").map(Number);
  if (parts.length < 2) return null;
  const [gj, gm] = parts as [number, number, number];
  if (
    !Number.isFinite(gj) ||
    !Number.isFinite(gm) ||
    gj < 1900 ||
    gj > 2100 ||
    gm < 1 ||
    gm > 12
  ) {
    return null;
  }

  // Bezugsalter zerlegen in ganze Jahre + Monate
  const jahreInt = Math.floor(bezugsalter);
  const monateExtra = Math.round((bezugsalter - jahreInt) * 12);

  // Monat, in dem das Bezugsalter erreicht wird
  const reachTotalMonth0 = gm - 1 + monateExtra; // 0-basiert
  const reachJahr = gj + jahreInt + Math.floor(reachTotalMonth0 / 12);
  const reachMonatIdx = ((reachTotalMonth0 % 12) + 12) % 12; // 0..11
  const reachMonat = reachMonatIdx + 1; // 1..12

  // AHV-Beginn = Folgemonat
  let startJahr = reachJahr;
  let startMonat = reachMonat + 1;
  if (startMonat > 12) {
    startJahr += 1;
    startMonat = 1;
  }

  return { jahr: startJahr, monat: startMonat };
}

/**
 * Jahres-Faktor für AHV-Auszahlung in einem gegebenen Kalenderjahr.
 *
 * - Vor Bezugsstart: 0
 * - Nach Bezugsstart (volles Jahr): 1
 * - Bezugsstart-Jahr: anteilig basierend auf Anzahl Monate Bezug.
 *
 * Berücksichtigt 13. AHV (ab Bezugsjahr ≥ 2026): die jährliche Vollrente
 * entspricht 13 Monaten (12 ordentliche + 1 Zuschlag im Dezember).
 *
 * Beispiel: Bezugsstart August 2032 (5 ordentliche Mt + 1× 13. AHV Dez)
 *   → Faktor = 6 / 13 ≈ 0.4615
 *
 * Vor 2026 (keine 13. AHV): 12 ordentliche Monate.
 * Bezugsstart August → Faktor = 5 / 12 ≈ 0.4167
 */
export function ahvJahresFaktor(
  jahr: number,
  start: AhvBezugsStart | null
): number {
  if (!start) return 0;
  if (jahr < start.jahr) return 0;
  if (jahr > start.jahr) return 1;
  // Bezugsstart-Jahr: anteilig
  const ordentlicheMonate = 13 - start.monat; // start.monat ..12 inklusiv
  if (jahr >= ERSTES_JAHR_13TE_AHV) {
    // 13. AHV im Dez auch wenn nur Teiljahres-Bezug
    return (ordentlicheMonate + 1) / 13;
  }
  return ordentlicheMonate / 12;
}
