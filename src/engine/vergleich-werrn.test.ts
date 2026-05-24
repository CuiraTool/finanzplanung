/**
 * Validierungs-Vergleich — Werrn Franziska (Ausgangslage).
 * SSM Partner AG, 05.05.2026.
 *
 * Spezifika:
 *  - Einzelperson w, geschieden, römisch katholisch (ZH-Kirchensteuer)
 *  - geb. 26.07.1970 — Jg 1970 → KEIN AHV21-Zuschlag (nur Jg 1961-69)
 *  - Eigenheim Niederglatt ZH 1'900'000, Hypothek 772'548
 *  - Pension Alter 65 Ende Juli 2035 (lang in der Zukunft)
 *  - 100% Rentenbezug PK NEU — Rente 9'613 p.a.
 *  - 3a ZKB Auszahlung 2035 → 93'846 (Einz 2026-2035)
 *  - Inflation 0.5 %, Rendite 1.5 %, Hypozins 2.0 % ab 2029
 *  - Stichtage: 65/70/75/80 = 2035/2040/2045/2050
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2026-05-05T12:00:00Z").getTime();
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

describe("Vergleich Werrn Franziska (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Franziska 65/70/75/80", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "geschieden",
      person1: {
        vorname: "Franziska",
        nachname: "Werrn",
        geburtsdatum: "1970-07-26",
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
        strasse: "Grafschaftsstrasse 19b",
        plz: "8172",
        ort: "Niederglatt",
        kanton: "ZH",
        gemeindeBfsId: null,
        gemeindeName: "Niederglatt",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 62000,
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        // PDF AHV 21'804 inkl. 13. AHV. 12-Mt-Basis: 21'804 × 12/13 = 20'127.
        ahvRenteJahrEffektivP1: 20127,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 104638,
          // Rückrechnung 9'613 / 0.0627 ≈ 153'315 Saldo bei Bezug
          altersguthabenBeiBezug: 153315,
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
            id: "3a-zkb",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a ZKB",
            aktuellerWert: 18304,
            auszahlungsjahr: 2035,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2035,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2026,
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
            saldoHeute: 15000,
            renditeProzent: 0,
            istHauptkonto: true,
          },
          {
            id: "depot",
            typ: "depot",
            beschreibung: "Übrige Anlagen",
            saldoHeute: 80000,
            renditeProzent: 1.5,
            istHauptkonto: false,
          },
        ],
      },
      immobilien: {
        items: [
          {
            id: "eh-niederglatt",
            beschreibung: "Eigenheim Niederglatt",
            typ: "selbstbewohnt",
            verkehrswert: 1900000,
            eigenmietwertProzent: 1.13,
            hypotheken: [
              {
                id: "hypo",
                beschreibung: "Hypothek",
                hoehe: 772548,
                zinssatzProzent: 1.4, // 10'821 / 772'548 ≈ 1.4%
                ablaufjahr: 2029,
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
            id: "lohn-franziska",
            beschreibung: "Erwerb Franziska",
            personIdx: 1,
            betragMonatlich: 62000 / 12,
            von: "2026-01",
            bis: "2035-07",
          },
        ],
        ausgabenModus: "total",
        // PDF Total 60'283 − Steuern 5'900 − 3a 7'258 − Hypozins 10'821 − Wohnen-Eigentum 3'650 = 32'654
        // (Wohnen-Eigentum wird via Immobilien-Modul nicht modelliert — bleibt im Haushalt)
        // Lebenshaltung 24'250 + Versicherungen 8'404 = 32'654.
        ausgabenTotal: 32654 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 32654 / 12,
        steuernHeute: 5900,
        einkommenHeute: 62000,
        religion: "katholisch",
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

    const reihe = cashflowReihe(state, 2026, 2050);

    const taxware: Record<
      number,
      { saldo: number; vermNetto: number; stTotal: number; einnT: number; ausgT: number }
    > = {
      2035: { saldo: -20059, vermNetto: 1285635, stTotal: 0, einnT: 50014, ausgT: 70073 },
      2040: { saldo: -23091, vermNetto: 1170981, stTotal: 0, einnT: 33234, ausgT: 56325 },
      2045: { saldo: -24074, vermNetto: 1052588, stTotal: 0, einnT: 33234, ausgT: 57308 },
      2050: { saldo: -25082, vermNetto: 929205, stTotal: 0, einnT: 33234, ausgT: 58316 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Werrn ==========");
    for (const jahr of [2035, 2040, 2045, 2050]) {
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
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} KapAusz=${Math.round(z.kapAuszahlungen)} EMW=${Math.round(z.eigenmietwertJahr)}`
      );
    }
  });
});
