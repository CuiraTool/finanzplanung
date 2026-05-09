/**
 * Mock-Daten für die Berater-Cockpit-UI (Phase 6 / Etappe 4 Demo).
 *
 * Bis Supabase + Auth angeschlossen sind, zeigen wir Mandanten-Cockpit und
 * Mandant-Detail mit dieser Mock-Liste. Sobald die DB da ist, wird das durch
 * eine echte Query ersetzt — die Komponenten ändern sich nicht.
 */

export type MandantStatus = "aktiv" | "wartend" | "abgeschlossen" | "archiviert";
export type MandantQuelle = "direkt" | "affiliate" | "kunde-funnel";

export interface MockMandant {
  id: string;
  vorname: string;
  nachname: string;
  alter: number;
  zivilstand: "ledig" | "verheiratet" | "konkubinat" | "geschieden" | "verwitwet";
  kinder: number;
  kanton: string;
  status: MandantStatus;
  quelle: MandantQuelle;
  /** % wie weit der Plan ausgefüllt ist (0..100). */
  planVollstaendigkeit: number;
  /** Aktuelles Nettovermögen (CHF). */
  vermoegenHeute: number;
  /** Voraussichtliches Vermögen bei Pensionierung (CHF). */
  vermoegenPension: number;
  /** Δ Vermögen Pension - heute (CHF). */
  delta: number;
  /** ISO-Datum der nächsten Termine, oder null. */
  naechsterTermin: string | null;
  /** Letzter Aktivitäts-Zeitstempel. */
  letzteAktivitaet: string;
  /** Aktivitäts-Beschreibung. */
  letzteAktivitaetText: string;
}

export const MOCK_MANDANTEN: MockMandant[] = [
  {
    id: "mu-2026-001",
    vorname: "Ralph",
    nachname: "Muster",
    alter: 58,
    zivilstand: "verheiratet",
    kinder: 2,
    kanton: "ZH",
    status: "aktiv",
    quelle: "direkt",
    planVollstaendigkeit: 92,
    vermoegenHeute: 1_854_000,
    vermoegenPension: 2_412_000,
    delta: 558_000,
    naechsterTermin: dateInDays(2),
    letzteAktivitaet: dateInDays(-1),
    letzteAktivitaetText: "Plan A bearbeitet · PK-Bezug Mischlösung 50/50",
  },
  {
    id: "we-2026-002",
    vorname: "Stephanie",
    nachname: "Weber",
    alter: 53,
    zivilstand: "verheiratet",
    kinder: 1,
    kanton: "ZH",
    status: "aktiv",
    quelle: "kunde-funnel",
    planVollstaendigkeit: 76,
    vermoegenHeute: 940_000,
    vermoegenPension: 1_180_000,
    delta: 240_000,
    naechsterTermin: dateInDays(0), // heute
    letzteAktivitaet: dateInDays(-3),
    letzteAktivitaetText: "Erst-Erfassung via Kunde-Funnel",
  },
  {
    id: "sc-2026-003",
    vorname: "Markus",
    nachname: "Schmid",
    alter: 47,
    zivilstand: "verheiratet",
    kinder: 3,
    kanton: "ZG",
    status: "aktiv",
    quelle: "affiliate",
    planVollstaendigkeit: 100,
    vermoegenHeute: 2_750_000,
    vermoegenPension: 4_120_000,
    delta: 1_370_000,
    naechsterTermin: dateInDays(7),
    letzteAktivitaet: dateInDays(-2),
    letzteAktivitaetText: "Plan B (Frühpension 60) erstellt",
  },
  {
    id: "br-2026-004",
    vorname: "Anna",
    nachname: "Brunner",
    alter: 41,
    zivilstand: "ledig",
    kinder: 0,
    kanton: "BE",
    status: "wartend",
    quelle: "affiliate",
    planVollstaendigkeit: 38,
    vermoegenHeute: 285_000,
    vermoegenPension: 612_000,
    delta: 327_000,
    naechsterTermin: dateInDays(5),
    letzteAktivitaet: dateInDays(-7),
    letzteAktivitaetText: "Affiliate-Erfassung übergeben",
  },
  {
    id: "ho-2026-005",
    vorname: "Peter",
    nachname: "Hofmann",
    alter: 62,
    zivilstand: "konkubinat",
    kinder: 0,
    kanton: "SZ",
    status: "aktiv",
    quelle: "direkt",
    planVollstaendigkeit: 88,
    vermoegenHeute: 1_240_000,
    vermoegenPension: 1_350_000,
    delta: 110_000,
    naechsterTermin: dateInDays(14),
    letzteAktivitaet: dateInDays(-4),
    letzteAktivitaetText: "PDF an Kunde gesendet",
  },
  {
    id: "ke-2026-006",
    vorname: "Elisa",
    nachname: "Keller",
    alter: 55,
    zivilstand: "geschieden",
    kinder: 2,
    kanton: "AG",
    status: "abgeschlossen",
    quelle: "direkt",
    planVollstaendigkeit: 100,
    vermoegenHeute: 680_000,
    vermoegenPension: 890_000,
    delta: 210_000,
    naechsterTermin: null,
    letzteAktivitaet: dateInDays(-30),
    letzteAktivitaetText: "Plan abgeschlossen, Kunde zufrieden",
  },
  {
    id: "ge-2026-007",
    vorname: "Daniel",
    nachname: "Gerber",
    alter: 38,
    zivilstand: "verheiratet",
    kinder: 2,
    kanton: "VD",
    status: "aktiv",
    quelle: "kunde-funnel",
    planVollstaendigkeit: 22,
    vermoegenHeute: 145_000,
    vermoegenPension: 760_000,
    delta: 615_000,
    naechsterTermin: dateInDays(3),
    letzteAktivitaet: dateInDays(-1),
    letzteAktivitaetText: "Funnel abgeschlossen, Termin gebucht",
  },
];

export interface MockBerater {
  id: string;
  name: string;
  initialen: string;
  email: string;
  rolle: string;
}

export const MOCK_BERATER: MockBerater = {
  id: "lf-001",
  name: "Lukas Fischer",
  initialen: "LF",
  email: "lukas.fischer@cuirapartners.ch",
  rolle: "Senior Pensionsplaner",
};

export interface MockKpi {
  label: string;
  value: string;
  delta: string;
  positiv: boolean;
}

export const MOCK_COCKPIT_KPIS: MockKpi[] = [
  {
    label: "Aktive Mandanten",
    value: "47",
    delta: "+3 in 30 T.",
    positiv: true,
  },
  {
    label: "Termine 7 Tage",
    value: "12",
    delta: "8 Erst- · 4 Folge",
    positiv: true,
  },
  {
    label: "AUM verwaltet",
    value: "CHF 41.2 Mio",
    delta: "+CHF 2.1 Mio",
    positiv: true,
  },
  {
    label: "Provision YTD",
    value: "CHF 18'400",
    delta: "+CHF 3'600 vs. Vorjahr",
    positiv: true,
  },
];

function dateInDays(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

/**
 * Helper: relativer Zeitausdruck (heute / morgen / in N Tagen / vor N T.)
 */
export function relativDatum(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffTage = Math.round((d.getTime() - heute.getTime()) / 86_400_000);
  if (diffTage === 0) return "Heute";
  if (diffTage === 1) return "Morgen";
  if (diffTage === -1) return "Gestern";
  if (diffTage > 1 && diffTage < 30) return `in ${diffTage} T.`;
  if (diffTage < -1 && diffTage > -30) return `vor ${-diffTage} T.`;
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "short" });
}

export function findMandant(id: string): MockMandant | null {
  return MOCK_MANDANTEN.find((m) => m.id === id) ?? null;
}
