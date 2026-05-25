/**
 * Validierungs-Vergleich — Brüesch Martin + Schneider Brüesch Sandra.
 * Cuira Partners GmbH, 17.01.2025.
 *
 * Spezifika:
 *  - Paar verheiratet, ZH Männedorf, hoher Lifestyle
 *  - Martin geb 21.12.1960 (m, andere) → Pension Dez 2025 (Alter 65)
 *  - Sandra geb 17.10.1970 (w, andere) → Pension Okt 2035 (Alter 65)
 *  - AHV Brüesch 30'240 single → 12-Mt-Basis = 27'914
 *  - PK Brüesch BVK 100% Rente 45'189 + VLSS 100% Kap 704'756 (Mischbezug)
 *    AGB gesamt = 1'552'163 + 704'756 = 2'256'919, kapAnteil = 31%
 *  - Sandra weiter Erwerb 35'000 bis 2035
 *  - Eigenheim 3'000'000 (Verkehrswert), Hypothek 1'700'000
 *  - Steuern 2025: 123'599 (sehr hoch wegen hohem Lohn + grosse Immo)
 *  - Inflation 0.75%, Rendite 1.5%
 *  - Stichtage Pension+0/+5/+10/+15 = 2026/2031/2036/2041 (Alter Martin 66/71/76/81)
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-01-17T12:00:00Z").getTime();
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

describe("Vergleich Brüesch Martin+Sandra (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA für Brüesch Heute/65/70/75/80", () => {
    const state: CashflowInput = {
      fallart: "paar",
      zivilstand: "verheiratet",
      person1: {
        vorname: "Martin",
        nachname: "Brüesch",
        geburtsdatum: "1960-12-21",
        geschlecht: "m",
        telefon: "",
        email: "",
      },
      person2: {
        vorname: "Sandra",
        nachname: "Schneider Brüesch",
        geburtsdatum: "1970-10-17",
        geschlecht: "w",
        telefon: "",
        email: "",
      },
      kinder: [],
      adresse: {
        strasse: "Grünweg 9",
        plz: "8708",
        ort: "Männedorf",
        kanton: "ZH",
        gemeindeBfsId: 156, // Männedorf ZH
        gemeindeName: "Männedorf",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 453000, // letzter Lohn Martin (vor Pension)
        einkommenP2: 35000,
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
          altersguthabenHeute: 1552163,
          // BVK 1'552'163 Rente + VLSS 704'756 Kap = 2'256'919 gesamt
          altersguthabenBeiBezug: 2256919,
          umwandlungssatzProzent: 2.91, // 45189 / 1552163 (nur Rente-Anteil)
          bezugspraeferenz: "mischung",
          kapitalanteil: 31, // VLSS-Anteil = 704756/2256919 = 31.2%
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
        p2: {
          aktiverAnschluss: true,
          altersguthabenHeute: 0, // PDF zeigt keine PK Sandra
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
            id: "3a-swiss-life",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Swiss Life",
            aktuellerWert: 177949,
            auszahlungsjahr: 2025,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2025,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2025,
            einzahlungBis: 2025,
          },
        ],
        p2: [
          {
            id: "3a-swiss-life-s",
            type: "versicherung",
            saeule: "3a",
            beschreibung: "3a Swiss Life Sandra",
            aktuellerWert: 80000,
            auszahlungsjahr: 2034,
            renditeProzent: 0,
            rueckkaufswert: 80000,
            ablaufswert: 114464,
            ablaufjahr: 2034,
            jaehrlicheEinzahlung: 4222,
            einzahlungAb: 2025,
            einzahlungBis: 2033,
          },
          {
            id: "3b-generali",
            type: "versicherung",
            saeule: "3b",
            beschreibung: "3b Generali Sandra",
            aktuellerWert: 65000,
            auszahlungsjahr: 2034,
            renditeProzent: 0,
            rueckkaufswert: 65000,
            ablaufswert: 92743,
            ablaufjahr: 2034,
            jaehrlicheEinzahlung: 3416,
            einzahlungAb: 2025,
            einzahlungBis: 2033,
          },
        ],
      },
      vermoegen: {
        items: [
          {
            id: "hk",
            typ: "konto",
            beschreibung: "Liquidität",
            saldoHeute: 200000,
            renditeProzent: 0,
            istHauptkonto: true,
          },
        ],
      },
      immobilien: {
        items: [
          {
            id: "eh-maennedorf",
            beschreibung: "EFH Männedorf",
            typ: "selbstbewohnt",
            verkehrswert: 3000000,
            eigenmietwertProzent: 1.0, // EMW geringer wegen alten Eigenheims
            hypotheken: [
              {
                id: "hypo",
                beschreibung: "Hypothek",
                hoehe: 1700000,
                zinssatzProzent: 0.79, // 13'430 / 1.7M
                ablaufjahr: 2030,
                refinanzierungZinssatzProzent: 1.5,
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
            beschreibung: "Erwerb Martin",
            personIdx: 1,
            betragMonatlich: 453000 / 12,
            von: "2025-01",
            bis: "2025-12",
          },
          {
            id: "lohn-s",
            beschreibung: "Erwerb Sandra",
            personIdx: 2,
            betragMonatlich: 35000 / 12,
            von: "2025-01",
            bis: "2035-10",
          },
        ],
        ausgabenModus: "total",
        // PDF 2025 Total 463'767 − Steuern 123'599 − 3a 6'538 − Schuldz 13'430 − Amort 0 = 320'200
        // Lebenshaltung 140'100 + Wohnen-Eig 30'000 + Mob 28'100 + Versich 33'500 + Div 88'500 = 320'200 ✓
        ausgabenTotal: 320200 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 145000 / 12, // PDF Annahme nach Pension
        steuernHeute: 123599,
        einkommenHeute: 488000,
        religion: "andere",
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

    const reihe = cashflowReihe(state, 2025, 2045);
    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Brüesch Martin+Sandra ==========");
    for (const jahr of [2025, 2026, 2031, 2036, 2041]) {
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
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} Hypozins=${Math.round(z.ausgabenHypozins)} KapAusz=${Math.round(z.kapAuszahlungen)}`
      );
    }
  });
});
