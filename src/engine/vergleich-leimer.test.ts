/**
 * Validierungs-Vergleich — Leimer Priska (Ausgangslage).
 * Combinvest AG, 27.02.2026.
 *
 * Spezifika:
 *  - Einzelperson w, geschieden, andere Konf, SO Bellach
 *  - geb 29.10.1965, Pension Alter 65 = Okt 2030
 *  - AHV 28'453 → 12-Mt-Basis = 26'264
 *  - 100% Kapitalbezug PKSO 297'277 (2030)
 *  - Eigenheim klein 200'000 (Wohnen-Eig 3'000 + Schuldz 1'550 → kleine Hypo)
 *  - 3a BKB 38'587 (Auszahlung 2028)
 *  - 3a Raiffeisen 37'022 (Auszahlung 2029)
 *  - 3a NEU 7'258 (Auszahlung 2030)
 *  - 3b Generali 50'000 (Auszahlung 2029)
 *  - Erwerb 20'400 (Teilzeit oder reduziert)
 *  - Saldo 2026 = -26'058 (negativ! Klientin hat aktuelles Liquiditätsproblem)
 *  - Inflation 1.0%
 *  - Stichtage Pension+1/+5/+10 = 2031/2035/2040
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2026-02-27T12:00:00Z").getTime();
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

describe("Vergleich Leimer Priska (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA für Leimer 66/70/75", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "geschieden",
      person1: {
        vorname: "Priska",
        nachname: "Leimer",
        geburtsdatum: "1965-10-29",
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
        strasse: "Schulmattstrasse 4",
        plz: "4512",
        ort: "Bellach",
        kanton: "SO",
        gemeindeBfsId: null,
        gemeindeName: "Bellach",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 20400,
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        ahvRenteJahrEffektivP1: 26264,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 257333,
          altersguthabenBeiBezug: 297277,
          umwandlungssatzProzent: 6.0,
          bezugspraeferenz: "kapital",
          kapitalanteil: 100,
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
            id: "3a-bkb",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a BKB",
            aktuellerWert: 25000,
            auszahlungsjahr: 2028,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2028,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2026,
            einzahlungBis: 2028,
          },
          {
            id: "3a-raiff",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Raiffeisen",
            aktuellerWert: 15000,
            auszahlungsjahr: 2029,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2029,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2026,
            einzahlungBis: 2029,
          },
          {
            id: "3a-neu",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a NEU",
            aktuellerWert: 0,
            auszahlungsjahr: 2030,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2030,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2030,
            einzahlungBis: 2030,
          },
          {
            id: "3b-generali",
            type: "versicherung",
            saeule: "3b",
            beschreibung: "3b Generali",
            aktuellerWert: 30000,
            auszahlungsjahr: 2029,
            renditeProzent: 0,
            rueckkaufswert: 30000,
            ablaufswert: 50000,
            ablaufjahr: 2029,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2026,
            einzahlungBis: 2029,
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
            saldoHeute: 45000,
            renditeProzent: 0,
            istHauptkonto: true,
          },
          {
            id: "depot",
            typ: "depot",
            beschreibung: "Anlagedepot",
            saldoHeute: 85000,
            renditeProzent: 1.5,
            istHauptkonto: false,
          },
        ],
      },
      immobilien: {
        items: [
          {
            id: "eh-bellach",
            beschreibung: "EFH Bellach",
            typ: "selbstbewohnt",
            verkehrswert: 200000,
            eigenmietwertProzent: 1.5,
            hypotheken: [
              {
                id: "hypo",
                beschreibung: "Hypothek",
                hoehe: 77500,
                zinssatzProzent: 2.0,
                ablaufjahr: 2030,
                refinanzierungZinssatzProzent: 2.5,
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
            betragMonatlich: 20400 / 12,
            von: "2026-01",
            bis: "2030-10",
          },
        ],
        ausgabenModus: "total",
        // 46'458 − Steuern 2'700 − 3a 7'258 − Schuldz 1'550 = 34'950
        ausgabenTotal: 34950 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 34950 / 12,
        steuernHeute: 2700,
        einkommenHeute: 20400,
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

    const reihe = cashflowReihe(state, 2026, 2045);
    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Leimer Priska (CUIRA only) ==========");
    for (const jahr of [2031, 2035, 2040, 2045]) {
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
