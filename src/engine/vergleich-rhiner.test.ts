/**
 * Validierungs-Vergleich — Esther Rhiner (Ausgangslage).
 * Beyeler Consulting GmbH, 27.06.2025.
 *
 * Spezifika:
 *  - Frau geb 28.05.1964, andere Konf, verheiratet → 61 in 2025
 *  - ABER nur Esther im PDF — Ehemann scheinbar nicht AHV-pflichtig
 *    (vermutlich Ausländer / DE-Wohnsitz / sep. Vermögen) → modelliert als einzel.
 *  - ZH Maur, Fridlimattstrasse 36
 *  - Pension ord Mai 2029 (Alter 65, Frauen Jg 1964 AHV21 = 64.75)
 *  - AHV 33'410 inkl Rentenzuschlag + 13.AHV (12-Mt-Basis: 30'840)
 *  - 100% BVG-Rente Swisscanto 69'909
 *  - Eigenheim ZH 600k + 33.5k sonst, Hypothek 215k
 *  - Liquid 45k, BVG 1'201'372, 3a 155k (Pictet 124'872 + Postfinance 71'574)
 *  - 3a Pictet → Auszahlung 2028 (123'636)
 *  - 3a Postfinance → Auszahlung 2029 (64'245)
 *  - Erwerb 108'000 bis 2029-05
 *  - Inflation 1.0%
 *  - Stichtage Pension 65/70/75/80 = 2029/2034/2039/2044 nach PDF
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-06-27T12:00:00Z").getTime();
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

describe("Vergleich Rhiner Esther (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Rhiner 65/70/75/78", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "verheiratet",
      person1: {
        vorname: "Esther",
        nachname: "Rhiner",
        geburtsdatum: "1964-05-28",
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
        strasse: "Fridlimattstrasse 36",
        plz: "8122",
        ort: "Binz",
        kanton: "ZH",
        gemeindeBfsId: null,
        gemeindeName: "Maur",
      },
      // AHV21 Frauen Jg 1964 ord-Ref 64.75 = 64+9Mt.
      ziele: { bezugsalterP1: 64.75, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 108000,
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 64.75,
        ahvBezugsalterP2: 65,
        // 33'410 inkl 13.AHV + Rentenzuschlag → 12-Mt-Basis 30'840.
        ahvRenteJahrEffektivP1: 30840,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 1201372,
          // 100% Rente 69'909. UWS ≈ 5.31% (69909/1316000 approx).
          // BvgRente bei Bezug Mai 2029 — Saldo gewachsen vs heute.
          altersguthabenBeiBezug: 1316000,
          umwandlungssatzProzent: 5.31, // 69909 / 1316000
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
            id: "3a-pictet",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Pictet",
            aktuellerWert: 124872,
            auszahlungsjahr: 2028,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2028,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2025,
            einzahlungBis: 2028,
          },
          {
            id: "3a-postfinance",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Postfinance",
            aktuellerWert: 30128, // 71574 - 4×7258×... approx — vereinfacht
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
        ],
      },
      immobilien: {
        items: [
          {
            id: "eh-maur",
            beschreibung: "Eigenheim Maur",
            typ: "selbstbewohnt",
            verkehrswert: 633500,
            eigenmietwertProzent: 1.13,
            hypotheken: [
              {
                id: "hypo",
                beschreibung: "Hypothek",
                hoehe: 215000,
                zinssatzProzent: 1.5, // 3'225 / 215'000 ≈ 1.5%
                ablaufjahr: 2035,
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
            id: "lohn-esther",
            beschreibung: "Erwerb Esther",
            personIdx: 1,
            betragMonatlich: 108000 / 12,
            von: "2025-01",
            bis: "2029-05",
          },
        ],
        ausgabenModus: "total",
        // PDF 2025: 98'483 − Steuern 10'000 − 3a 7'258 − Schuldzins 3'225 = 78'000.
        ausgabenTotal: 78000 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 78000 / 12,
        steuernHeute: 10000,
        einkommenHeute: 108000,
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
      2029: { saldo: -329, vermNetto: 684551, stTotal: 13948, einnT: 105270, ausgT: 105598 },
      2034: { saldo: 1490, vermNetto: 711783, stTotal: 13297, einnT: 103319, ausgT: 101829 },
      2037: { saldo: -1124, vermNetto: 716945, stTotal: 13326, einnT: 103319, ausgT: 104444 },
      2044: { saldo: -7469, vermNetto: 698752, stTotal: 13331, einnT: 103319, ausgT: 110788 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Rhiner ==========");
    for (const jahr of [2029, 2034, 2037, 2044]) {
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
