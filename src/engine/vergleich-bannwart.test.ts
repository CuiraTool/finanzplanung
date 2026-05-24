/**
 * Validierungs-Vergleich — Bannwart Beatrice (Ausgangslage).
 * Mission 13 GmbH, 19.11.2025.
 *
 * Spezifika:
 *  - Einzelperson w, ledig, andere Konfession
 *  - geb. 19.05.1962 — Jg 1962 → AHV21-Übergang
 *  - Adresse SG St. Gallen, Oberzilstrasse 18 — MIETERIN
 *  - Pension Alter 64 + 6 Mt per Ende November 2026
 *  - 100% Rentenbezug PK Stadt St Gallen: 10'734 p.a. (UWS ≈ 5.44%)
 *  - AHV 26'195 inkl Überbrückungszuschlag + 13. AHV (Berater-Override)
 *  - BVG-Saldo Heute 180'538 → bei Bezug 197'166 (verzinst mit Min-Zins)
 *  - 3a Helvetia 20'424 → Auszahlung 2026
 *  - 3b Helvetia 32'036 RKW / 32'591 Ablauf → Auszahlung 2026
 *  - Liquidität 30'000
 *  - Inflation 0.75%, Rendite 1.5%
 *  - Stichtage 64/65/70/75 = 2026/2027/2032/2037
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-11-19T12:00:00Z").getTime();
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

describe("Vergleich Bannwart Beatrice (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Bannwart 64/65/70/75", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "ledig",
      person1: {
        vorname: "Beatrice",
        nachname: "Bannwart",
        geburtsdatum: "1962-05-19",
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
        strasse: "Oberzilstrasse 18",
        plz: "9016",
        ort: "St. Gallen",
        kanton: "SG",
        gemeindeBfsId: null,
        gemeindeName: "St. Gallen",
      },
      // Frauen Jg 1962 AHV21: ord-Ref-Alter 64+6Mt = 64.5. Pension Nov 2026.
      ziele: { bezugsalterP1: 64.5, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 75400,
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 64.5,
        ahvBezugsalterP2: 65,
        // PDF AHV 26'195 inkl Überbrückungszuschlag + 13. AHV.
        // Engine-Konvention: Override = 12-Mt-Basis. 26'195 × 12/13 = 24'180.
        ahvRenteJahrEffektivP1: 24180,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 180538,
          // Bei Bezug 197'166 → Rente 10'734 → UWS 5.44%
          altersguthabenBeiBezug: 197166,
          umwandlungssatzProzent: 5.44,
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
            id: "3a-helvetia",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Helvetia",
            aktuellerWert: 20424,
            auszahlungsjahr: 2026,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2026,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2025,
            einzahlungBis: 2026,
          },
          {
            id: "3b-helvetia",
            type: "versicherung",
            saeule: "3b",
            beschreibung: "3b Helvetia",
            aktuellerWert: 32036,
            auszahlungsjahr: 2026,
            renditeProzent: 0,
            rueckkaufswert: 32036,
            ablaufswert: 32591,
            ablaufjahr: 2026,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2025,
            einzahlungBis: 2026,
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
            saldoHeute: 30000,
            renditeProzent: 0,
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
            id: "lohn-beatrice",
            beschreibung: "Erwerb Beatrice",
            personIdx: 1,
            betragMonatlich: 75400 / 12,
            von: "2025-01",
            bis: "2026-11",
          },
        ],
        ausgabenModus: "total",
        // PDF Total 2025: 70'560 − Steuern 10'000 = 60'560.
        // Lebenshaltung 27'000 + Wohnen 18'000 + Mobilität 960
        //   + Versicherungen 9'600 + Diverse 5'000 = 60'560 ✓
        ausgabenTotal: 60560 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        // PDF S.4: "Budgetreduktion CHF 48'000 Totalausgaben ab Pensionierung".
        // Davon Steuer ~3k → Haushalt ohne Steuer = 45'000.
        wunschverbrauchPension: 45000 / 12,
        steuernHeute: 10000,
        einkommenHeute: 75400,
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
      { saldo: number; vermNetto: number; stTotal: number; einnT: number; ausgT: number }
    > = {
      2026: { saldo: -1193, vermNetto: 86662, stTotal: 12373, einnT: 72194, ausgT: 73387 },
      2027: { saldo: -19200, vermNetto: 67462, stTotal: 10492, einnT: 36929, ausgT: 56129 },
      2032: { saldo: -13509, vermNetto: 3418, stTotal: 3063, einnT: 36929, ausgT: 50438 },
      2037: { saldo: -15312, vermNetto: -69509, stTotal: 3063, einnT: 36929, ausgT: 52241 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Bannwart Beatrice ==========");
    for (const jahr of [2026, 2027, 2032, 2037]) {
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
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} KapAusz=${Math.round(z.kapAuszahlungen)}`
      );
    }
  });
});
