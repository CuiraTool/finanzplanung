/**
 * Validierungs-Vergleich — Krähenbühl Daniel (Ausgangslage).
 * Combinvest AG, 24.07.2025.
 *
 * Spezifika:
 *  - Einzelperson m, ledig, evang-reformiert, BE Studen
 *  - geb 26.05.1962, Pension Alter 65 = Mai 2027
 *  - AHV 27'547 inkl 13.AHV → 12-Mt-Basis = 25'428
 *  - 100% Rente PK Pax 14'111
 *  - Mieter (Wohnen 18'000)
 *  - Erwerb 38'400 (Teilzeit) bis Mai 2027
 *  - FAR 21'600 (Branchenrente Bau, bis Pension) — modelliert als
 *    Erwerb-Eintrag, ist aber nicht AHV-pflichtig. Drift möglich bei Steuern.
 *  - 3a Konto 37'319 (Auszahlung Mai 2027)
 *  - Inflation 1.0%, Rendite 2.0%
 *  - Stichtage Pension+0/+5/+10/+15 = 2027/2032/2037/2042 (Alter 65/70/75/80)
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-07-24T12:00:00Z").getTime();
const _RealDate = Date;
class _FakeDate extends _RealDate {
  constructor(...args: any[]) {
    if (args.length === 0) super(FIXED_NOW);
    // @ts-ignore
    else super(...args);
  }
  static now() {
    return FIXED_NOW;
  }
}

describe("Vergleich Krähenbühl Daniel (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs PDF für Krähenbühl Heute/65/70/75/80", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "ledig",
      person1: {
        vorname: "Daniel",
        nachname: "Krähenbühl",
        geburtsdatum: "1962-05-26",
        geschlecht: "m",
        telefon: "",
        email: "",
      },
      person2: {
        vorname: "",
        nachname: "",
        geburtsdatum: "",
        geschlecht: "m",
        telefon: "",
        email: "",
      },
      kinder: [],
      adresse: {
        strasse: "Jensstrasse 6",
        plz: "2557",
        ort: "Studen",
        kanton: "BE",
        gemeindeBfsId: null,
        gemeindeName: "Studen",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 38400,
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        ahvRenteJahrEffektivP1: 25428,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 226306,
          altersguthabenBeiBezug: 240517,
          umwandlungssatzProzent: 5.87, // 14111/240517
          bezugspraeferenz: "rente",
          kapitalanteil: 0,
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
        p2: {
          aktiverAnschluss: false,
          altersguthabenHeute: 0,
          altersguthabenBeiBezug: 0,
          umwandlungssatzProzent: 0,
          bezugspraeferenz: "kapital",
          kapitalanteil: 100,
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
      },
      saeuleDrei: {
        p1: [
          {
            id: "3a-konto",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Konto",
            aktuellerWert: 30061,
            auszahlungsjahr: 2027,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2027,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2025,
            einzahlungBis: 2027,
          },
        ],
        p2: [],
      },
      vermoegen: {
        items: [
          {
            id: "hk",
            typ: "konto",
            beschreibung: "Liquidität",
            saldoHeute: 65024,
            renditeProzent: 0,
            istHauptkonto: true,
          },
        ],
      },
      immobilien: { items: [] },
      firma: {
        vorhanden: false,
        firmenname: "",
        moeglicherVerkaufserloes: null,
        plan: "behalten",
        verkaufsjahr: 2035,
      },
      budget: {
        einkommen: [
          {
            id: "lohn",
            beschreibung: "Erwerb",
            personIdx: 1,
            betragMonatlich: 38400 / 12,
            von: "2025-01",
            bis: "2027-05",
          },
          {
            id: "far",
            beschreibung: "FAR Branchenrente",
            personIdx: 1,
            betragMonatlich: 21600 / 12,
            von: "2025-01",
            bis: "2027-05",
          },
        ],
        ausgabenModus: "total",
        // 54'976 − Steuern 8'718 − 3a 7'258 = 39'000
        ausgabenTotal: 39000 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 39000 / 12,
        steuernHeute: 8718,
        einkommenHeute: 60000,
        religion: "reformiert",
        alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
        inflationProzent: 1.0,
      },
      einmaligeAusgaben: [],
      laufendeAusgaben: [],
      erbschaft: {
        erwartet: "nein",
        groessenordnung: null,
        erwartetBetrag: null,
        erwartetJahr: null,
        erwartetBeruecksichtigen: false,
        erwartetVerwandtschaft: "nachkomme",
        schenkungenStatus: "nein",
        schenkungenBetrag: null,
        schenkungenJahr: null,
        schenkungenBeruecksichtigen: false,
        schenkungenDetails: "",
        gueterstand: "errungenschaft",
      },
    };

    const reihe = cashflowReihe(state, 2025, 2045);
    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    // PDF Werte aus Combinvest 24.07.2025 (Krähenbühl Ausgangslage)
    const pdf: Record<number, any> = {
      2025: { einn: 60000, ausg: 54976, saldo: 5024, verm: 291330, steuern: 8718 },
      2027: { einn: 49300, ausg: 55212, saldo: -5912, verm: 102737, steuern: 8563 },
      2032: { einn: 41658, ausg: 45931, saldo: -4273, verm: 83753, steuern: 5545 },
      2037: { einn: 41658, ausg: 46951, saldo: -5293, verm: 59340, steuern: 5545 },
      2042: { einn: 41658, ausg: 47996, saldo: -6338, verm: 29751, steuern: 5545 },
    };

    console.log("\n========== CHECKPOINT Krähenbühl Daniel ==========");
    for (const jahr of [2025, 2027, 2032, 2037, 2042]) {
      const z = reihe.find((r) => r.jahr === jahr);
      if (!z) continue;
      const p = pdf[jahr]!;
      const d = (cuira: number, tax: number) => {
        const diff = Math.round(cuira - tax);
        const pct = tax !== 0 ? ((diff / Math.abs(tax)) * 100).toFixed(1) + "%" : "–";
        return `${f(Math.round(cuira))} | ${f(tax)} | Δ ${f(diff)} (${pct})`;
      };
      console.log(`\n── ${jahr} (Alter P1 ${z.alterP1}) ──`);
      console.log(`  Einnahmen total : ${d(z.einnahmenTotal, p.einn)}`);
      console.log(`  Ausgaben total  : ${d(z.ausgabenTotal, p.ausg)}`);
      console.log(`  Saldo           : ${d(z.saldo, p.saldo)}`);
      console.log(`  Vermögen netto  : ${d(z.vermoegenNetto, p.verm)}`);
      console.log(`  Steuern total   : ${d(z.ausgabenSteuern, p.steuern)}`);
      console.log(
        `    └ Eink-St=${Math.round(z.ausgabenSteuernEinkommen)} Verm-St=${Math.round(z.ausgabenSteuernVermoegen)} Kap-St=${Math.round(z.ausgabenSteuernKapital)}`
      );
      console.log(
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} KapAusz=${Math.round(z.kapAuszahlungen)}`
      );
    }
  });
});
