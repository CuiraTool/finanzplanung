/**
 * Validierungs-Vergleich — Näf Hansjörg + Ollyene (Ausgangslage).
 * Turicum Group AG, 28.01.2025.
 *
 * Spezifika:
 *  - Paar verheiratet, ZH Horgen
 *  - Hansjörg geb 14.07.1966 (m, evang-reformiert) → 59 in 2025
 *  - Ollyene Valadares geb 03.01.1982 (w, röm-katholisch) → 43 in 2025
 *  - Pension Hansjörg ord Juli 2031 (Alter 65)
 *  - Pension Ollyene ord Januar 2047 (Alter 65) — sehr weit weg
 *  - 100% Kapital PK Promea Hansjörg 299'884 in 2031
 *  - 100% Kapital PK Ollyene 124'000 in 2045
 *  - AHV Hansjörg 27'504 + AHV-Kinderrente 11'004 bis Aug 2034
 *  - AHV-Ehepaarrente 41'232 ab 2047
 *  - 3a Hansjörg 33'600 → 98'759 in 2032
 *  - 3a Ollyene 0 → 41'400 in 2045 (Einz 2025-2045)
 *  - 3b Police Hansjörg 75'000 → 82'419 in 2030
 *  - Eigenheim 1.1M + 100k anderes Wohneigentum
 *  - Hypothek 450k
 *  - Liquid 50k, BVG Hansjörg 198'105
 *  - Renovationen 20'000 in 2026 + 15'000 in 2030
 *  - Inflation 1.0%, Rendite 1.5%
 *  - Stichtage 2031 (Hansjörg 65) / 2035 / 2040 / 2045
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-01-28T12:00:00Z").getTime();
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

describe("Vergleich Näf Hansjörg+Ollyene (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Näf 2031/2034/2037/2045", () => {
    const state: CashflowInput = {
      fallart: "paar",
      zivilstand: "verheiratet",
      person1: {
        vorname: "Hansjörg",
        nachname: "Näf",
        geburtsdatum: "1966-07-14",
        geschlecht: "m",
        telefon: "",
        email: "",
      },
      person2: {
        vorname: "Ollyene",
        nachname: "Näf",
        geburtsdatum: "1982-01-03",
        geschlecht: "w",
        telefon: "",
        email: "",
      },
      kinder: [
        // AHV-Kinderrente bis Aug 2034 → Kind ist 18 in 2034.
        // Genaues Geburtsjahr nicht bekannt — Annahme 2016.
        {
          id: "k1",
          vorname: "Kind",
          geburtsdatum: "2016-08-01",
          zuordnung: "gemeinsam",
          ausbildungBisJahr: null,
        },
      ],
      adresse: {
        strasse: "Bühlweg 10",
        plz: "8810",
        ort: "Horgen",
        kanton: "ZH",
        gemeindeBfsId: null,
        gemeindeName: "Horgen",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 74000,
        einkommenP2: 62000,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        // Hansjörg AHV 27'504 inkl 13.AHV (12-Mt: 25'389).
        // Ollyene noch nicht in Bezug bis 2047.
        ahvRenteJahrEffektivP1: 25389,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 198105,
          // 100% Kap-Auszahlung 299'884 in Juli 2031.
          altersguthabenBeiBezug: 299884,
          umwandlungssatzProzent: 6.27,
          bezugspraeferenz: "kapital",
          kapitalanteil: 100,
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
        p2: {
          aktiverAnschluss: true,
          altersguthabenHeute: 0,
          altersguthabenBeiBezug: 124000,
          umwandlungssatzProzent: 6.27,
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
            id: "3a-swisslife-h",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Swiss Life Hansjörg",
            aktuellerWert: 33600,
            auszahlungsjahr: 2032,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2032,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2025,
            einzahlungBis: 2031,
          },
          {
            id: "3b-swisslife-h",
            type: "versicherung",
            saeule: "3b",
            beschreibung: "3b Swiss Life Hansjörg",
            aktuellerWert: 75000,
            auszahlungsjahr: 2030,
            renditeProzent: 0,
            rueckkaufswert: 75000,
            ablaufswert: 82419,
            ablaufjahr: 2030,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2025,
            einzahlungBis: 2030,
          },
        ],
        p2: [
          {
            id: "3a-swisslife-o",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Swiss Life Ollyene",
            aktuellerWert: 0,
            auszahlungsjahr: 2045,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2045,
            jaehrlicheEinzahlung: 1971, // 41400 / 21 Jahre approx
            einzahlungAb: 2025,
            einzahlungBis: 2045,
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
            id: "eh-horgen",
            beschreibung: "Eigenheim Horgen",
            typ: "selbstbewohnt",
            verkehrswert: 1100000,
            eigenmietwertProzent: 1.13,
            hypotheken: [
              {
                id: "hypo",
                beschreibung: "Hypothek",
                hoehe: 450000,
                zinssatzProzent: 1.19, // 5'355 / 450'000 ≈ 1.19%
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
            id: "lohn-h",
            beschreibung: "Erwerb Hansjörg",
            personIdx: 1,
            betragMonatlich: 74000 / 12,
            von: "2025-01",
            bis: "2031-07",
          },
          {
            id: "lohn-o",
            beschreibung: "Erwerb Ollyene",
            personIdx: 2,
            betragMonatlich: 62000 / 12,
            von: "2025-01",
            bis: "2046-12",
          },
        ],
        ausgabenModus: "total",
        // PDF 2025: 133'080 − Steuern 14'900 − 3a 6'825 − Schuldzins 5'355 = 106'000.
        ausgabenTotal: 106000 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 106000 / 12,
        steuernHeute: 14900,
        einkommenHeute: 136000,
        religion: "reformiert",
        alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
        inflationProzent: 1.0,
      },
      einmaligeAusgaben: [
        { id: "reno-2026", jahr: 2026, betrag: 20000, beschreibung: "Fenster" },
        { id: "reno-2030", jahr: 2030, betrag: 15000, beschreibung: "Badzimmer" },
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

    const taxware: Record<
      number,
      { saldo: number; vermNetto: number; stTotal: number; einnT: number; ausgT: number }
    > = {
      2031: { saldo: -27440, vermNetto: 1275806, stTotal: 27130, einnT: 121212, ausgT: 148651 },
      2034: { saldo: -12498, vermNetto: 1276186, stTotal: 10655, einnT: 96840, ausgT: 109338 },
      2037: { saldo: -20496, vermNetto: 1240453, stTotal: 8600, einnT: 89504, ausgT: 110000 },
      2045: { saldo: -35884, vermNetto: 1095053, stTotal: 16333, einnT: 89504, ausgT: 125388 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Näf ==========");
    for (const jahr of [2031, 2034, 2037, 2045]) {
      const z = reihe.find((r) => r.jahr === jahr)!;
      const t = taxware[jahr]!;
      const d = (cuira: number, tax: number) => {
        const diff = Math.round(cuira - tax);
        const pct = tax !== 0 ? ((diff / Math.abs(tax)) * 100).toFixed(1) + "%" : "–";
        return `${f(Math.round(cuira))} | ${f(tax)} | Δ ${f(diff)} (${pct})`;
      };
      console.log(
        `\n── ${jahr} (Alter P1 ${z.alterP1}/P2 ${z.alterP2}) ──     CUIRA |     TAXWARE | Δ`
      );
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
