/**
 * Validierungs-Vergleich — Mock Niklaus + Monika (Ausgangslage).
 * Finanzfreund GmbH, 18.05.2026.
 *
 * Spezifika:
 *  - Paar verheiratet, AI Steinegg (neuer Kanton!)
 *  - Niklaus geb 14.03.1967 (m, kath), Monika geb 10.02.1971 (w, kath)
 *  - Niklaus Pension Mar 2032 (Alter 65)
 *  - Monika Aufschub bis Alter 70 = Feb 2041
 *  - AHV-Ehepaar 49'140 (Max heutige Werte, inkl 13.AHV)
 *  - PK Niklaus: Energie 14'846 + Stadt Chur 31'791 (Renten)
 *  - PK Monika: Saldo bei Bezug 2041 berechnet
 *  - Eigenheim 900'000, Hypothek 450'000 (Zins 1.0%, Refi 2.0%)
 *  - Inflation 0.75%
 *  - Stichtage Pension Mt 2032/2037/2041 (Monika)/+10
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2026-05-18T12:00:00Z").getTime();
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

describe("Vergleich Mock Niklaus+Monika (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA für Mock 66/71/76", () => {
    const state: CashflowInput = {
      fallart: "paar",
      zivilstand: "verheiratet",
      person1: {
        vorname: "Niklaus",
        nachname: "Mock",
        geburtsdatum: "1967-03-14",
        geschlecht: "m",
        telefon: "",
        email: "",
      },
      person2: {
        vorname: "Monika",
        nachname: "Mock",
        geburtsdatum: "1971-02-10",
        geschlecht: "w",
        telefon: "",
        email: "",
      },
      kinder: [],
      adresse: {
        strasse: "Bäbelers 1",
        plz: "9050",
        ort: "Appenzell Steinegg",
        kanton: "AI",
        gemeindeBfsId: null,
        gemeindeName: "Schwende-Rüte",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 70 },
      ahv: {
        einkommenP1: 126000,
        einkommenP2: 25000,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        // BSV-Maxrente individual (Engine plafondiert)
        ahvRenteJahrEffektivP1: 30240,
        ahvRenteJahrEffektivP2: 30240,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 628676,
          altersguthabenBeiBezug: 760000,
          umwandlungssatzProzent: 6.13, // 46637/760000
          bezugspraeferenz: "rente",
          kapitalanteil: 0,
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
        p2: {
          aktiverAnschluss: true,
          altersguthabenHeute: 6310,
          altersguthabenBeiBezug: 130000,
          umwandlungssatzProzent: 6.0,
          bezugspraeferenz: "rente",
          kapitalanteil: 0,
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
      },
      saeuleDrei: {
        p1: [
          {
            id: "3a-n-1",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Niklaus 1",
            aktuellerWert: 100000,
            auszahlungsjahr: 2027,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2027,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2026,
            einzahlungBis: 2027,
          },
          {
            id: "3a-n-2",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Niklaus 2",
            aktuellerWert: 40000,
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
            id: "3a-n-3",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Niklaus 3",
            aktuellerWert: 40000,
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
            id: "3a-n-neu",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Niklaus NEU",
            aktuellerWert: 0,
            auszahlungsjahr: 2032,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2032,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2030,
            einzahlungBis: 2032,
          },
        ],
        p2: [
          {
            id: "3a-m-1",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Monika 1",
            aktuellerWert: 30000,
            auszahlungsjahr: 2035,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2035,
            jaehrlicheEinzahlung: 5000,
            einzahlungAb: 2026,
            einzahlungBis: 2031,
          },
          {
            id: "3a-m-2",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Monika 2 (Freizüg)",
            aktuellerWert: 0,
            auszahlungsjahr: 2036,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2036,
            jaehrlicheEinzahlung: 5000,
            einzahlungAb: 2032,
            einzahlungBis: 2036,
          },
          {
            id: "3a-m-neu",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Monika NEU",
            aktuellerWert: 0,
            auszahlungsjahr: 2041,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2041,
            jaehrlicheEinzahlung: 5000,
            einzahlungAb: 2032,
            einzahlungBis: 2041,
          },
        ],
      },
      vermoegen: {
        items: [
          {
            id: "hk",
            typ: "konto",
            beschreibung: "Liquidität",
            saldoHeute: 50000,
            renditeProzent: 0,
            istHauptkonto: true,
          },
        ],
      },
      immobilien: {
        items: [
          {
            id: "eh-steinegg",
            beschreibung: "EFH Steinegg",
            typ: "selbstbewohnt",
            verkehrswert: 900000,
            eigenmietwertProzent: 1.13,
            hypotheken: [
              {
                id: "hypo",
                beschreibung: "Hypothek",
                hoehe: 450000,
                zinssatzProzent: 1.0, // 4500/450000
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
            id: "lohn-n",
            beschreibung: "Erwerb Niklaus",
            personIdx: 1,
            betragMonatlich: 126000 / 12,
            von: "2025-01",
            bis: "2032-03",
          },
          {
            id: "lohn-m",
            beschreibung: "Erwerb Monika",
            personIdx: 2,
            betragMonatlich: 25000 / 12,
            von: "2025-01",
            bis: "2041-02",
          },
        ],
        ausgabenModus: "total",
        // 122'758 − Steuern 19'000 − 3a 12'258 − Schuldz 4'500 = 87'000
        // Leben 29'000 + Wohnen-Eig 5'000 + Mob 9'000 + Versich 13'000 + Div 31'000 = 87'000 ✓
        ausgabenTotal: 87000 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 87000 / 12,
        steuernHeute: 19000,
        einkommenHeute: 151000,
        religion: "katholisch",
        alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
        inflationProzent: 0.75,
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
    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Mock Niklaus+Monika (CUIRA only) ==========");
    for (const jahr of [2033, 2038, 2042, 2048]) {
      const z = reihe.find((r) => r.jahr === jahr);
      if (!z) continue;
      console.log(`\n── ${jahr} (Alter P1 ${z.alterP1}/P2 ${z.alterP2}) ──`);
      console.log(`  Einnahmen total : ${f(Math.round(z.einnahmenTotal))}`);
      console.log(`  Ausgaben total  : ${f(Math.round(z.ausgabenTotal))}`);
      console.log(`  Saldo           : ${f(Math.round(z.saldo))}`);
      console.log(`  Vermögen netto  : ${f(Math.round(z.vermoegenNetto))}`);
      console.log(`  Steuern total   : ${f(Math.round(z.ausgabenSteuern))}`);
      console.log(
        `    └ Eink-St=${Math.round(z.ausgabenSteuernEinkommen)} Verm-St=${Math.round(z.ausgabenSteuernVermoegen)} Kap-St=${Math.round(z.ausgabenSteuernKapital)}`
      );
      console.log(
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} Hypozins=${Math.round(z.ausgabenHypozins)} KapAusz=${Math.round(z.kapAuszahlungen)} EMW=${Math.round(z.eigenmietwertJahr)}`
      );
    }
  });
});
