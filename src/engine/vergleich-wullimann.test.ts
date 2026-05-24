/**
 * Validierungs-Vergleich Taxware ↔ Cuira-Engine — Fall: Wullimann Mirjam.
 * Quelle: "Def.FinancialPlanning.pdf" (Combinvest AG, 18.06.2024).
 *
 * Spezifika:
 *  - Einzelperson, verwitwet, Mieterin, ZH Zürich
 *  - geb. 22.09.1966, w — **AHV21-Übergangsjahrgang!** (Driver-C-Test)
 *  - Pension Sept 2031 (Alter 65)
 *  - 100% Rentenbezug PK ASGA — Rente 12'606 p.a.
 *  - AHV 25'116 (Annahme — Berater-Wert)
 *  - Vermögen Heute (2024): 1'100k Liquid + 146'703 BVG + 71'051 3a
 *  - 3a in 2 Tranchen 2030: 47'631 + 44'978 (Generali-Policen)
 *  - Inflation 1.0 %, Rendite 1.5 %
 *  - Stichtage: Alter 65/70/75/80 = 2031/2036/2041/2046
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2024-06-18T12:00:00Z").getTime();
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

describe("Vergleich Wullimann (Ausgangslage) — Engine + AHV21-Zuschlag", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Mirjam Alter 65/70/75/80", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "verwitwet",
      person1: {
        vorname: "Mirjam",
        nachname: "Wullimann",
        geburtsdatum: "1966-09-22",
        geschlecht: "w",
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
        strasse: "Limmattalstrasse 117",
        plz: "8049",
        ort: "Zürich",
        kanton: "ZH",
        gemeindeBfsId: null,
        gemeindeName: "Zürich",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 60000,
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        // PDF Annahme 25'116 inkl. 13. AHV. 12-Mt-Basis: 25'116 × 12/13 = 23'184.
        // Anmerkung: PDF nimmt vermutlich Zuschlag NICHT mit ein. Engine wird
        // den AHV21-Zuschlag oben drauf addieren — leichter Drift möglich.
        ahvRenteJahrEffektivP1: 23184,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 146703,
          // Bei Bezug Saldo geschätzt (8 J. wachstum mit 1.25% Mindestzins):
          //   146'703 × 1.0125^7 = ~159'600
          // PK-Rente bei UWS gegeben: 12'606 / 0.0627 = 201'050 (ASGA UWS ≈ 6.27%)
          // → Sparphase im Bezugsjahr addiert weiter
          altersguthabenBeiBezug: 201050,
          umwandlungssatzProzent: 6.27,
          bezugspraeferenz: "rente",
          kapitalanteil: 0,
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
      saeuleDrei: {
        p1: [
          {
            id: "3a-generali-1",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Police Generali 1",
            aktuellerWert: 35525, // Hälfte 71'051
            auszahlungsjahr: 2030,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2030,
            jaehrlicheEinzahlung: 4064,
            einzahlungAb: 2024,
            einzahlungBis: 2030,
          },
          {
            id: "3a-generali-2",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Police Generali 2",
            aktuellerWert: 35526,
            auszahlungsjahr: 2030,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2030,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2024,
            einzahlungBis: 2030,
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
            saldoHeute: 1100000,
            renditeProzent: 1.5,
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
            id: "lohn-mirjam",
            beschreibung: "Erwerb Mirjam",
            personIdx: 1,
            betragMonatlich: 60000 / 12,
            von: "2024-01",
            bis: "2031-09", // Pension Ende Sept 2031
          },
        ],
        ausgabenModus: "total",
        // PDF S.14 Ausgaben 2024 = 59'264 − Steuern 6'000 − 3a 4'064 = 49'200.
        ausgabenTotal: 49200 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 49200 / 12,
        steuernHeute: 6000,
        einkommenHeute: 60000,
        religion: "andere",
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

    const reihe = cashflowReihe(state, 2024, 2050);

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
      2031: { saldo: -6440, vermNetto: 1223562, stTotal: 0, einnT: 54430, ausgT: 60870 },
      2036: { saldo: -21988, vermNetto: 1157140, stTotal: 0, einnT: 37722, ausgT: 59710 },
      2041: { saldo: -23896, vermNetto: 1087353, stTotal: 0, einnT: 37722, ausgT: 61618 },
      2046: { saldo: -25810, vermNetto: 1011025, stTotal: 0, einnT: 37722, ausgT: 63532 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT-VERGLEICH Wullimann (AHV21-Zuschlag-Test) ==========");
    for (const jahr of [2031, 2036, 2041, 2046]) {
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
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} KapAusz=${Math.round(z.kapAuszahlungen)}`
      );
    }
  });
});
