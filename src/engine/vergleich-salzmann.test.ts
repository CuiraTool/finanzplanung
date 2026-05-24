/**
 * Validierungs-Vergleich Taxware ↔ Cuira-Engine — Fall: Salzmann Hans.
 * Quelle: "Def.FinancialPlanning.pdf" (SSM Partner AG, 26.12.2024).
 *
 * Spezifika:
 *  - Einzelperson, ledig, Mieter, ZH Rüti
 *  - geb. 24.11.1958, m — schon pensioniert seit Nov 2023!
 *  - AHV 28'615 (Annahme), kein BVG, kein 3a
 *  - Vermögen 117'600 Liquid (kein anderes Vermögen)
 *  - Inflation 0.5 %, Rendite 3.0 %
 *  - Stichtage: Alter 70/75/80/85 = 2028/2033/2038/2043 (65 = 2023 vor Plan)
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-01-15T12:00:00Z").getTime();
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

describe("Vergleich Salzmann (Ausgangslage) — Engine-Validierung", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Salzmann Alter 70/75/80/85", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "ledig",
      person1: {
        vorname: "Hans",
        nachname: "Salzmann",
        geburtsdatum: "1958-11-24",
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
        strasse: "Drei Eichen",
        plz: "8630",
        ort: "Rüti",
        kanton: "ZH",
        gemeindeBfsId: null,
        gemeindeName: "Rüti",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 60000, // Annahme — schon nicht mehr relevant (lang pensioniert)
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        // PDF AHV 28'615 inkl. 13. AHV. 12-Mt-Basis: 28'615 × 12/13 = 26'414.
        ahvRenteJahrEffektivP1: 26414,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: false,
          altersguthabenHeute: null,
          altersguthabenBeiBezug: null,
          umwandlungssatzProzent: 0,
          bezugspraeferenz: "kapital",
          kapitalanteil: 100,
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
        p2: {
          aktiverAnschluss: false,
          altersguthabenHeute: null,
          altersguthabenBeiBezug: null,
          umwandlungssatzProzent: 0,
          bezugspraeferenz: "kapital",
          kapitalanteil: 100,
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
      },
      saeuleDrei: { p1: [], p2: [] },
      vermoegen: {
        items: [
          {
            id: "hk",
            typ: "konto",
            beschreibung: "Liquidität",
            saldoHeute: 117600,
            renditeProzent: 3.0,
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
        einkommen: [], // schon pensioniert
        ausgabenModus: "total",
        // PDF S.14 Total 34'089 − Steuern 1'289 = 32'800. Ohne Hypo, ohne 3a.
        ausgabenTotal: 32800 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 32800 / 12,
        steuernHeute: 1289,
        einkommenHeute: 28615,
        religion: "andere",
        alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
        inflationProzent: 0.5,
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

    const reihe = cashflowReihe(state, 2025, 2050);

    const taxware: Record<
      number,
      {
        saldo: number;
        vermNetto: number;
        stTotal: number;
        einnT: number;
        ausgT: number;
      }
    > = {
      2025: { saldo: -5474, vermNetto: 112126, stTotal: 1289, einnT: 28615, ausgT: 34089 },
      2028: { saldo: -5990, vermNetto: 94637, stTotal: 1289, einnT: 28615, ausgT: 34605 },
      2033: { saldo: -6809, vermNetto: 62262, stTotal: 1289, einnT: 28615, ausgT: 35424 },
      2038: { saldo: -7671, vermNetto: 25639, stTotal: 1289, einnT: 28615, ausgT: 36286 },
      2043: { saldo: -8555, vermNetto: -15359, stTotal: 1289, einnT: 28615, ausgT: 37170 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT-VERGLEICH Salzmann ==========");
    for (const jahr of [2025, 2028, 2033, 2038, 2043]) {
      const z = reihe.find((r) => r.jahr === jahr)!;
      const t = taxware[jahr]!;
      const d = (cuira: number, tax: number) => {
        const diff = Math.round(cuira - tax);
        const pct = tax !== 0 ? ((diff / Math.abs(tax)) * 100).toFixed(1) + "%" : "–";
        return `${f(Math.round(cuira))} | ${f(tax)} | Δ ${f(diff)} (${pct})`;
      };
      console.log(`\n── ${jahr} (Alter P1 ${z.alterP1}) ──                  CUIRA |     TAXWARE | Δ`);
      console.log(`  Einnahmen total : ${d(z.einnahmenTotal, t.einnT)}`);
      console.log(`  Ausgaben total  : ${d(z.ausgabenTotal, t.ausgT)}`);
      console.log(`  Saldo           : ${d(z.saldo, t.saldo)}`);
      console.log(`  Vermögen netto  : ${d(z.vermoegenNetto, t.vermNetto)}`);
      console.log(`  Steuern total   : ${d(z.ausgabenSteuern, t.stTotal)}`);
      console.log(
        `    └ Eink-St=${Math.round(z.ausgabenSteuernEinkommen)} Verm-St=${Math.round(z.ausgabenSteuernVermoegen)} Kap-St=${Math.round(z.ausgabenSteuernKapital)} (KapBund=${Math.round(z.ausgabenSteuernKapitalBund)} KapKan=${Math.round(z.ausgabenSteuernKapitalKanton)})`
      );
      console.log(
        `  Detail: AHV=${Math.round(z.einnahmenAhv)} Haushalt=${Math.round(z.ausgabenHaushalt)} KapAusz=${Math.round(z.kapAuszahlungen)}`
      );
    }
  });
});
