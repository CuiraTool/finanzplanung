/**
 * Validierungs-Vergleich Taxware ↔ Cuira-Engine — Fall: Rohrbach Roland.
 * Quelle: "Def.FinancialPlanning.pdf" (Combinvest AG, 28.01.2025).
 *
 * Spezifika:
 *  - Einzelperson, ledig, Mieter, BE Brügg
 *  - geb. 26.08.1961, m
 *  - Pension Aug 2026 (Alter 65)
 *  - 100% Rentenbezug PK Profond (Rente 7'620 p.a.)
 *  - FZ-Auszahlung Swiss Life 2025: 37'067
 *  - FZ-Auszahlung UVZH 2026: 73'447
 *  - AHV 24'432 (Annahme — niedrig)
 *  - BVG-Saldo 210'885 heute
 *  - Inflation 0.75 %, Rendite 2.0 %
 *  - Stichtage: Alter 65/70/75/80 = 2026/2031/2036/2041
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

describe("Vergleich Rohrbach (Ausgangslage) — Engine-Validierung", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Roland Alter 65/70/75/80", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "ledig",
      person1: {
        vorname: "Roland",
        nachname: "Rohrbach",
        geburtsdatum: "1961-08-26",
        geschlecht: "m",
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
        strasse: "Erlenstrasse 4",
        plz: "2555",
        ort: "Brügg",
        kanton: "BE",
        gemeindeBfsId: null,
        gemeindeName: "Brügg",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 65000,
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        // PDF AHV 24'432 inkl. 13. AHV. 12-Mt-Basis: 24'432 × 12/13 = 22'553.
        ahvRenteJahrEffektivP1: 22553,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 210885,
          // PDF zeigt BVG 210'885 heute → 100% Rentenbezug → Rente 7'620.
          // Rückrechnung Saldo bei Bezug: 7'620 / 0.0627 = 121'531 (Profond UWS).
          // Aber Total BVG 210'885 inkl. FZ UVZH 73'447 (Auszahlung 2026).
          // Real-PK-Saldo bei Bezug (vom 210k bleiben nach FZ-Ausz): 210k − 73k ≈ 137k.
          // Engine: setze altersguthabenBeiBezug ≈ 121'531 (genau Rentenbasis).
          altersguthabenBeiBezug: 121531,
          umwandlungssatzProzent: 6.27,
          bezugspraeferenz: "rente",
          kapitalanteil: 0,
          freizuegigkeit: [
            // FZG Swiss Life 2025 → 37'067
            {
              id: "fzg-swiss-life",
              beschreibung: "FZG Swiss Life",
              saldoHeute: 37067,
              auszahlungsjahr: 2025,
              renditeProzent: 0,
            },
            // FZG UVZH 2026 → 73'447
            {
              id: "fzg-uvzh",
              beschreibung: "FZG UVZH",
              saldoHeute: 72363, // 73'447 / 1.015 (rückrechnen 1 Jahr Rendite)
              auszahlungsjahr: 2026,
              renditeProzent: 1.5,
            },
          ],
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
      saeuleDrei: { p1: [], p2: [] },
      vermoegen: {
        items: [
          {
            id: "hk",
            typ: "konto",
            beschreibung: "Liquidität",
            saldoHeute: 0,
            renditeProzent: 2.0,
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
            id: "lohn-roland",
            beschreibung: "Erwerb Roland",
            personIdx: 1,
            betragMonatlich: 65000 / 12,
            von: "2025-01",
            bis: "2026-08", // Pension Ende Aug 2026
          },
        ],
        ausgabenModus: "total",
        // PDF Total 62'233 − Steuern 9'949 = 52'284.
        ausgabenTotal: 52284 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 32000 / 12, // PDF Ausgangslage nach Pension ~32k
        steuernHeute: 9949,
        einkommenHeute: 65000,
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

    const reihe = cashflowReihe(state, 2025, 2050);

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
      2026: { saldo: -11537, vermNetto: 101744, stTotal: 0, einnT: 54696, ausgT: 66233 },
      2031: { saldo: -7758, vermNetto: 66343, stTotal: 0, einnT: 34088, ausgT: 41846 },
      2036: { saldo: -9142, vermNetto: 26935, stTotal: 0, einnT: 34088, ausgT: 43230 },
      2041: { saldo: -10561, vermNetto: -22397, stTotal: 0, einnT: 34088, ausgT: 44649 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT-VERGLEICH Rohrbach ==========");
    for (const jahr of [2026, 2031, 2036, 2041]) {
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
