/**
 * Validierungs-Vergleich — Vogel Michel + Carmen (Ausgangslage).
 * Finwiwo AG (Marcel Bielefeldt), 20.08.2025.
 *
 * Spezifika:
 *  - Paar verheiratet, BS Basel (neuer Kanton!)
 *  - Michel geb 01.05.1965 (m, andere), Carmen geb 16.09.1966 (w, andere)
 *  - Michel Pension Mai 2030 (Alter 65)
 *  - Carmen Pension Sep 2031 (Alter 65)
 *  - AHV-Ehepaar 49'667 inkl Rentenzuschlag + 13.AHV (Carmen Jg 1966 → Zuschlag)
 *  - 100% Renten PKBS Michel 39'565 + Carmen 30'010 = 69'575
 *  - Eigenheim Basel (Wohnen-Eig 47'827 + Schuldz 8'390 → ~ Hypothek 280k zu 3%)
 *  - 3a Police Zürich Michel 78'549 (Auszahlung 2030)
 *  - 3a Police Zürich Carmen 50'842 (Auszahlung 2030)
 *  - Erwerb Michel 69'501, Carmen 87'760
 *  - Inflation 1.0%
 *  - Stichtage Pension+1/+5/+10/+15 = 2032/2036/2041/2046
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-08-20T12:00:00Z").getTime();
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

describe("Vergleich Vogel Michel+Carmen (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA für Vogel 67/71/76/81", () => {
    const state: CashflowInput = {
      fallart: "paar",
      zivilstand: "verheiratet",
      person1: {
        vorname: "Michel",
        nachname: "Vogel-Steiner",
        geburtsdatum: "1965-05-01",
        geschlecht: "m",
        telefon: "",
        email: "",
      },
      person2: {
        vorname: "Carmen",
        nachname: "Vogel-Steiner",
        geburtsdatum: "1966-09-16",
        geschlecht: "w",
        telefon: "",
        email: "",
      },
      kinder: [],
      adresse: {
        strasse: "Rennweg 17",
        plz: "4052",
        ort: "Basel",
        kanton: "BS",
        gemeindeBfsId: null,
        gemeindeName: "Basel",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 69501,
        einkommenP2: 87760,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        ahvRenteJahrEffektivP1: 30240,
        ahvRenteJahrEffektivP2: 30240,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 695000,
          altersguthabenBeiBezug: 720000,
          umwandlungssatzProzent: 5.5, // 39565/720000
          bezugspraeferenz: "rente",
          kapitalanteil: 0,
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
        p2: {
          aktiverAnschluss: true,
          altersguthabenHeute: 530000,
          altersguthabenBeiBezug: 560000,
          umwandlungssatzProzent: 5.36, // 30010/560000
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
            id: "3a-zur-m",
            type: "versicherung",
            saeule: "3a",
            beschreibung: "3a Police Zürich Michel",
            aktuellerWert: 60000,
            auszahlungsjahr: 2030,
            renditeProzent: 0,
            rueckkaufswert: 60000,
            ablaufswert: 78549,
            ablaufjahr: 2030,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2025,
            einzahlungBis: 2030,
          },
        ],
        p2: [
          {
            id: "3a-zur-c",
            type: "versicherung",
            saeule: "3a",
            beschreibung: "3a Police Zürich Carmen",
            aktuellerWert: 38000,
            auszahlungsjahr: 2031,
            renditeProzent: 0,
            rueckkaufswert: 38000,
            ablaufswert: 50842,
            ablaufjahr: 2031,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2025,
            einzahlungBis: 2031,
          },
          {
            id: "3a-neu-c",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a NEU Carmen",
            aktuellerWert: 0,
            auszahlungsjahr: 2031,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2031,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2031,
            einzahlungBis: 2031,
          },
        ],
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
            id: "eh-basel",
            beschreibung: "EFH Basel",
            typ: "selbstbewohnt",
            verkehrswert: 1100000,
            eigenmietwertProzent: 4.35, // 47'827 / 1.1M
            hypotheken: [
              {
                id: "hypo",
                beschreibung: "Hypothek",
                hoehe: 280000,
                zinssatzProzent: 3.0, // 8'390 / 280k
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
            id: "lohn-m",
            beschreibung: "Erwerb Michel",
            personIdx: 1,
            betragMonatlich: 69501 / 12,
            von: "2025-01",
            bis: "2030-05",
          },
          {
            id: "lohn-c",
            beschreibung: "Erwerb Carmen",
            personIdx: 2,
            betragMonatlich: 87760 / 12,
            von: "2025-01",
            bis: "2031-09",
          },
        ],
        ausgabenModus: "total",
        // 140'740 − Steuern 23'092 − 3a 14'516 − Schuldz 8'390 = 94'742
        ausgabenTotal: 94742 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 94742 / 12,
        steuernHeute: 23092,
        einkommenHeute: 157261,
        religion: "andere",
        alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
        inflationProzent: 1.0,
      },
      einmaligeAusgaben: [
        { id: "lieg-2028", jahr: 2028, betrag: 30000, beschreibung: "Liegenschaft" },
        { id: "lieg-2029", jahr: 2029, betrag: 30000, beschreibung: "Liegenschaft" },
      ],
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

    console.log("\n========== CHECKPOINT Vogel Michel+Carmen (CUIRA only) ==========");
    for (const jahr of [2032, 2036, 2041, 2046]) {
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
        `  Detail: AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} Hypozins=${Math.round(z.ausgabenHypozins)} KapAusz=${Math.round(z.kapAuszahlungen)} EMW=${Math.round(z.eigenmietwertJahr)}`
      );
    }
  });
});
