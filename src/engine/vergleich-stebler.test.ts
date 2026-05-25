/**
 * Validierungs-Vergleich — Stebler Dominique (Ausgangslage).
 * Beyeler Consulting GmbH, 14.04.2025.
 *
 * Spezifika:
 *  - Einzelperson w, ledig, andere Konf, ZH Bubikon
 *  - geb 30.09.1970, Pension Alter 65 = Sep 2035
 *  - AHV 28'093 → 12-Mt-Basis = 25'932
 *  - 100% Rente PK Züriwerk 33'390
 *  - Eigenheim Wolfhausen (Wohnen-Eig 4'800 + Schuldz 4'140)
 *  - 3a ZKB 66'194 (Auszahlung 2033)
 *  - 3a ZKB 21'942 (Auszahlung 2034)
 *  - 3a ZKB NEU 7'258 (Auszahlung 2035)
 *  - Erwerb 85'000 (2025-2035-09)
 *  - Inflation 1.0%
 *  - Stichtage Pension+1/+5/+10 = 2036/2040/2045
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-04-14T12:00:00Z").getTime();
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

describe("Vergleich Stebler Dominique (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA für Stebler 66/70/75", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "ledig",
      person1: {
        vorname: "Dominique",
        nachname: "Stebler",
        geburtsdatum: "1970-09-30",
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
        strasse: "Hüeblistrasse 21",
        plz: "8633",
        ort: "Wolfhausen",
        kanton: "ZH",
        gemeindeBfsId: 112, // Bubikon ZH
        gemeindeName: "Bubikon",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 85000,
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        ahvRenteJahrEffektivP1: 25932,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 530000,
          altersguthabenBeiBezug: 600000,
          umwandlungssatzProzent: 5.57, // 33390/600000
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
            id: "3a-zkb-1",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a ZKB 1",
            aktuellerWert: 50000,
            auszahlungsjahr: 2033,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2033,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2025,
            einzahlungBis: 2030,
          },
          {
            id: "3a-zkb-2",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a ZKB 2",
            aktuellerWert: 0,
            auszahlungsjahr: 2034,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2034,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2031,
            einzahlungBis: 2034,
          },
          {
            id: "3a-zkb-neu",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a ZKB NEU",
            aktuellerWert: 0,
            auszahlungsjahr: 2035,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2035,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2035,
            einzahlungBis: 2035,
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
            saldoHeute: 100000,
            renditeProzent: 0,
            istHauptkonto: true,
          },
        ],
      },
      immobilien: {
        items: [
          {
            id: "eh-wolfhausen",
            beschreibung: "EFH Wolfhausen",
            typ: "selbstbewohnt",
            verkehrswert: 800000,
            eigenmietwertProzent: 1.13,
            hypotheken: [
              {
                id: "hypo",
                beschreibung: "Hypothek",
                hoehe: 138000,
                zinssatzProzent: 3.0,
                ablaufjahr: 2030,
                refinanzierungZinssatzProzent: 2.0,
                tilgungsplan: [],
              },
            ],
            plan: "behalten",
            verkaufsjahr: 2099,
            jaehrlicheMieteinnahmen: null,
            kaufjahr: null,
          },
        ],
      },
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
            betragMonatlich: 85000 / 12,
            von: "2025-01",
            bis: "2035-09",
          },
        ],
        ausgabenModus: "total",
        // 60'738 − Steuern 10'000 − 3a 7'258 − Schuldz 4'140 = 39'340
        ausgabenTotal: 39340 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 39340 / 12,
        steuernHeute: 10000,
        einkommenHeute: 85000,
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

    const reihe = cashflowReihe(state, 2025, 2050);
    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Stebler Dominique (CUIRA only) ==========");
    for (const jahr of [2036, 2040, 2045, 2050]) {
      const z = reihe.find((r) => r.jahr === jahr);
      if (!z) continue;
      console.log(`\n── ${jahr} (Alter P1 ${z.alterP1}) ──`);
      console.log(`  Einnahmen total : ${f(Math.round(z.einnahmenTotal))}`);
      console.log(`  Ausgaben total  : ${f(Math.round(z.ausgabenTotal))}`);
      console.log(`  Saldo           : ${f(Math.round(z.saldo))}`);
      console.log(`  Vermögen netto  : ${f(Math.round(z.vermoegenNetto))}`);
      console.log(`  Steuern total   : ${f(Math.round(z.ausgabenSteuern))}`);
      console.log(
        `    └ Eink-St=${Math.round(z.ausgabenSteuernEinkommen)} Verm-St=${Math.round(z.ausgabenSteuernVermoegen)} Kap-St=${Math.round(z.ausgabenSteuernKapital)}`
      );
      console.log(
        `  Detail: AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} Hypozins=${Math.round(z.ausgabenHypozins)} KapAusz=${Math.round(z.kapAuszahlungen)} EMW=${Math.round(z.eigenmietwertJahr)}`
      );
    }
  });
});
