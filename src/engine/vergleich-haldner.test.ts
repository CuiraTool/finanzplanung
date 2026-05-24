/**
 * Validierungs-Vergleich — Haldner Daniel + Monika (Ausgangslage).
 * Dein Finanzexperte GmbH, 02.12.2025.
 *
 * Spezifika:
 *  - Paar verheiratet, beide Jg 1964 (geb. Mai/Feb)
 *  - Daniel m, Monika w — Monika Jg 1964 → AHV21-Zuschlag berechtigt
 *  - Adresse Buchs SG, Eigenheim Churerstrasse 55 (700k)
 *  - Daniel Pension Mai 2029 (Alter 65) → 100% Kapitalbezug ASGA 468'511
 *  - Monika Pension Nov 2028 (Alter 64 Frühpensionierung) → 100% Kapitalbezug
 *    Swiss Life 159'920. Vorbezug AHV NICHT, sondern AHV-Bezug ab ord-Alter 65.
 *  - 3a in mehreren Tranchen 2025-2029 (gestaffelt — Driver-D-Test!)
 *  - Hypothek 305'000
 *  - Inflation 1.0 %, Rendite 1.5 %
 *  - Stichtage Daniel: 65/70/75/80 = 2029/2034/2039/2044
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-12-02T12:00:00Z").getTime();
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

describe("Vergleich Haldner (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE Daniel 65/70/75/80", () => {
    const state: CashflowInput = {
      fallart: "paar",
      zivilstand: "verheiratet",
      person1: {
        vorname: "Daniel",
        nachname: "Haldner",
        geburtsdatum: "1964-05-08",
        geschlecht: "m",
        telefon: "",
        email: "",
      },
      person2: {
        vorname: "Monika",
        nachname: "Haldner",
        geburtsdatum: "1964-02-06",
        geschlecht: "w",
        telefon: "",
        email: "",
      },
      kinder: [],
      adresse: {
        strasse: "Churerstrasse 55",
        plz: "9470",
        ort: "Buchs SG",
        kanton: "SG",
        gemeindeBfsId: null,
        gemeindeName: "Buchs",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 64 },
      ahv: {
        einkommenP1: 73300,
        einkommenP2: 47400,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65, // AHV-Bezug bei ord-Alter (kein Vorbezug AHV)
        // PDF: 51'220 inkl. Rentenzuschlag + 13. AHV.
        // Plafond × 13/12 = 49'140. Zuschlag Monika Jg 1964 (100/Mt × 12) × 1.0 = 1'200.
        // Mit 13/12: 1'300. Total 50'440 — PDF zeigt 51'220 ≈ 50'440 + 780 Rundung.
        // Override-Werte: setze unter Plafond, sodass Engine 13/12 + Zuschlag (Skala-44-
        // Pfad nur ohne Override). Hier Override → Engine wendet Zuschlag NICHT an.
        // Hälftig: 22'050 / 22'050 ergibt 47'775 (mit 13/12), zu tief vs 51'220.
        // Setze etwas höher um näher dran zu sein.
        ahvRenteJahrEffektivP1: 23631, // 51'220 × 12/13 / 2 ≈ 23'640
        ahvRenteJahrEffektivP2: 23631,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 377618,
          altersguthabenBeiBezug: 468511,
          umwandlungssatzProzent: 6.27,
          bezugspraeferenz: "kapital",
          kapitalanteil: 100,
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
        p2: {
          aktiverAnschluss: true,
          altersguthabenHeute: 140072,
          altersguthabenBeiBezug: 159920,
          umwandlungssatzProzent: 6.27,
          bezugspraeferenz: "kapital",
          kapitalanteil: 100,
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
      },
      saeuleDrei: {
        // PDF Ausgangslage Bezüge:
        //   2025 Monika 63'704 / 2026 Daniel 70'675 / 2027 Daniel 50'003 + Monika 56'974
        //   2028 Monika 7'258 (NEU) / 2029 Daniel 14'516 (NEU)
        // Vereinfacht modelliert als zwei Konten pro Person.
        p1: [
          {
            id: "3a-daniel-1",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Daniel A",
            aktuellerWert: 67000, // → 70'675 in 2026 mit Einz 0
            auszahlungsjahr: 2026,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2026,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2025,
            einzahlungBis: 2025,
          },
          {
            id: "3a-daniel-2",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Daniel B",
            aktuellerWert: 31904, // 98'904 - 67'000
            auszahlungsjahr: 2029,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2029,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2025,
            einzahlungBis: 2029,
          },
        ],
        p2: [
          {
            id: "3a-monika-1",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Monika A",
            aktuellerWert: 63704,
            auszahlungsjahr: 2025,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2025,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2025,
            einzahlungBis: 2025,
          },
          {
            id: "3a-monika-2",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Monika B",
            aktuellerWert: 35200,
            auszahlungsjahr: 2028,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2028,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2025,
            einzahlungBis: 2028,
          },
        ],
      },
      vermoegen: {
        items: [
          {
            id: "hk",
            typ: "konto",
            beschreibung: "Liquidität",
            saldoHeute: 124000,
            renditeProzent: 0,
            istHauptkonto: true,
          },
        ],
      },
      immobilien: {
        items: [
          {
            id: "eh-buchs",
            beschreibung: "Eigenheim Buchs",
            typ: "selbstbewohnt",
            verkehrswert: 700000,
            eigenmietwertProzent: 1.13,
            hypotheken: [
              {
                id: "hypo",
                beschreibung: "Hypothek",
                hoehe: 305000,
                zinssatzProzent: 1.88, // 5'734 / 305'000
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
            id: "lohn-daniel",
            beschreibung: "Erwerb Daniel",
            personIdx: 1,
            betragMonatlich: 73300 / 12,
            von: "2025-01",
            bis: "2029-05",
          },
          {
            id: "lohn-monika",
            beschreibung: "Erwerb Monika",
            personIdx: 2,
            betragMonatlich: 47400 / 12,
            von: "2025-01",
            bis: "2028-11",
          },
        ],
        ausgabenModus: "total",
        // PDF Total 110'285 − Steuern 14'435 − Hypozins 5'734 − Wohnen-Eigentum 7'000 − 3a 14'516 = 68'600
        // Hmm 41'600+12'734+4'000+13'000+10'000 (ohne 3a/Steuern/Hypo) = 81'334
        // Engine: Wohnen-Eigentum bleibt im Haushalt (kein automatic).
        // Setze ausgabenTotal = Lebenshaltung 41'600 + Mobilität 4'000 + Versicherungen 13'000 + Diverse 10'000 + Wohnen-Eigentum 7'000 = 75'600.
        ausgabenTotal: 75600 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 75600 / 12,
        steuernHeute: 14435,
        einkommenHeute: 120700,
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

    const taxware: Record<
      number,
      { saldo: number; vermNetto: number; stTotal: number; einnT: number; ausgT: number }
    > = {
      2029: { saldo: -69529, vermNetto: 1362589, stTotal: 0, einnT: 69130, ausgT: 138659 },
      2034: { saldo: -44532, vermNetto: 1182151, stTotal: 0, einnT: 51220, ausgT: 95752 },
      2039: { saldo: -46744, vermNetto: 990559, stTotal: 0, einnT: 51220, ausgT: 97964 },
      2044: { saldo: -48819, vermNetto: 774771, stTotal: 0, einnT: 51220, ausgT: 100039 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Haldner ==========");
    for (const jahr of [2029, 2034, 2039, 2044]) {
      const z = reihe.find((r) => r.jahr === jahr)!;
      const t = taxware[jahr]!;
      const d = (cuira: number, tax: number) => {
        const diff = Math.round(cuira - tax);
        const pct = tax !== 0 ? ((diff / Math.abs(tax)) * 100).toFixed(1) + "%" : "–";
        return `${f(Math.round(cuira))} | ${f(tax)} | Δ ${f(diff)} (${pct})`;
      };
      console.log(`\n── ${jahr} (Daniel ${z.alterP1} / Monika ${z.alterP2}) ──     CUIRA |     TAXWARE | Δ`);
      console.log(`  Einnahmen total : ${d(z.einnahmenTotal, t.einnT)}`);
      console.log(`  Ausgaben total  : ${d(z.ausgabenTotal, t.ausgT)}`);
      console.log(`  Saldo           : ${d(z.saldo, t.saldo)}`);
      console.log(`  Vermögen netto  : ${d(z.vermoegenNetto, t.vermNetto)}`);
      console.log(`  Steuern total   : ${d(z.ausgabenSteuern, t.stTotal)}`);
      console.log(
        `    └ Eink-St=${Math.round(z.ausgabenSteuernEinkommen)} Verm-St=${Math.round(z.ausgabenSteuernVermoegen)} Kap-St=${Math.round(z.ausgabenSteuernKapital)} (KapBund=${Math.round(z.ausgabenSteuernKapitalBund)} KapKan=${Math.round(z.ausgabenSteuernKapitalKanton)})`
      );
      console.log(
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} KapAusz=${Math.round(z.kapAuszahlungen)} EMW=${Math.round(z.eigenmietwertJahr)}`
      );
    }
  });
});
