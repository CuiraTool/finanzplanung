/**
 * Validierungs-Vergleich — Cosandier + Hintermann (Ausgangslage).
 * Combinvest AG, 10.09.2025.
 *
 * Spezifika:
 *  - KONKUBINAT (fallart="paar" + zivilstand="konkubinat")
 *  - Bernhard Cosandier (m, 10.12.1968) → 57 in 2025, ledig, andere Konf
 *  - Karin Hintermann (w, 11.06.1964) → 61 in 2025, ledig, andere Konf
 *  - Adresse BE Thun, Burgerstrasse 41
 *  - Pension Cosandier ord. Alter 65 = Dez 2033 → BVG Fenaco 24'317 p.a. (Rente)
 *  - Pension Hintermann ord. Alter 65 = Juni 2029 (AHV21 Jg 64 Ref-Alter 64+9Mt)
 *    → BVG Valora 15'794 p.a. (Rente)
 *  - AHV: kombiniert 56'992 ab beide pensioniert (Hintermann 29'328, Cosandier 27'664)
 *  - 3a Cosandier 29'492 → Auszahlung 2034, Einz 3'600 p.a. bis 2033
 *  - 3a Hintermann 22'000 → Auszahlung 2029, Einz 3'600 p.a. bis 2028
 *  - Kein Immobilien (Mieter), Wohnen 27'600 p.a. (Mietzins)
 *  - Liquidität 100'020 + Privatkonto 20'000 → kombiniert 120'020
 *  - Inflation 1.0%, Rendite 1.5%
 *  - Stichtage Hintermann 65 / Cosandier 65/Hintermann pensioniert seit 5J
 *    = 2029 / 2032 / 2034 / 2037
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-09-10T12:00:00Z").getTime();
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

describe("Vergleich Cosandier + Hintermann (Konkubinat)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Cosandier+Hintermann 2029/2032/2034/2037", () => {
    const state: CashflowInput = {
      fallart: "paar",
      zivilstand: "konkubinat",
      person1: {
        vorname: "Bernhard",
        nachname: "Cosandier",
        geburtsdatum: "1968-12-10",
        geschlecht: "m",
        telefon: "",
        email: "",
      },
      person2: {
        vorname: "Karin",
        nachname: "Hintermann",
        geburtsdatum: "1964-06-11",
        geschlecht: "w",
        telefon: "",
        email: "",
      },
      kinder: [],
      adresse: {
        strasse: "Burgerstrasse 41",
        plz: "3600",
        ort: "Thun",
        kanton: "BE",
        gemeindeBfsId: null,
        gemeindeName: "Thun",
      },
      // Cosandier (m, 1968) ord 65. Hintermann (w, 1964) AHV21 ord 64.75 = 64+9Mt.
      ziele: { bezugsalterP1: 65, bezugsalterP2: 64.75 },
      ahv: {
        einkommenP1: 58000,
        einkommenP2: 51000,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 64.75,
        // PDF kombiniert 56'992 inkl 13.AHV. Splittung: Cosandier 27'664,
        // Hintermann 29'328. Engine-Konvention: Override = 12-Mt-Basis.
        // 27'664 × 12/13 = 25'536. 29'328 × 12/13 = 27'072.
        ahvRenteJahrEffektivP1: 25536,
        ahvRenteJahrEffektivP2: 27072,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 294231,
          // 24'317 / 0.0627 ≈ 387'831
          altersguthabenBeiBezug: 387831,
          umwandlungssatzProzent: 6.27,
          bezugspraeferenz: "rente",
          kapitalanteil: 0,
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
        p2: {
          aktiverAnschluss: true,
          altersguthabenHeute: 173732,
          // 15'794 / 0.0627 ≈ 251'898
          altersguthabenBeiBezug: 251898,
          umwandlungssatzProzent: 6.27,
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
            id: "3a-cosandier",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Cosandier",
            aktuellerWert: 29492,
            auszahlungsjahr: 2034,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2034,
            jaehrlicheEinzahlung: 3600,
            einzahlungAb: 2025,
            einzahlungBis: 2033,
          },
        ],
        p2: [
          {
            id: "3a-hintermann",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Hintermann",
            aktuellerWert: 22000,
            auszahlungsjahr: 2029,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2029,
            jaehrlicheEinzahlung: 3600,
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
            beschreibung: "Liquidität + Privatkonto",
            saldoHeute: 120020,
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
            id: "lohn-cosandier",
            beschreibung: "Erwerb Cosandier",
            personIdx: 1,
            betragMonatlich: 58000 / 12,
            von: "2025-01",
            bis: "2033-12",
          },
          {
            id: "lohn-hintermann",
            beschreibung: "Erwerb Hintermann",
            personIdx: 2,
            betragMonatlich: 51000 / 12,
            von: "2025-01",
            // PDF zeigt Hintermann Halbjahr 2029 Erwerb 25'500 = 6 Mt.
            // Geb 11.06.1964 + 64.75 = März 2029 — Engine Bezug ab April.
            // PDF rechnete vermutlich pragmatisch Halbjahr-Modell.
            bis: "2029-06",
          },
        ],
        ausgabenModus: "total",
        // PDF 2025: 106'980 − Steuern 18'000 − 3a 7'200 = 81'780.
        // Lebenshaltung 32'400 + Wohnen 27'600 + Mobilität 4'180
        //   + Versicherung 11'100 + Diverse 6'500 = 81'780 ✓
        ausgabenTotal: 81780 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        // PDF S.4: "Budgetreduktion CHF 12'000 ab 2029. Total 95'000".
        // 95'000 − Steuer ~17k − 3a 0 = Haushalt ~78'000.
        wunschverbrauchPension: 78000 / 12,
        steuernHeute: 18000,
        einkommenHeute: 109000,
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
      2029: { saldo: -4335, vermNetto: 573127, stTotal: 18095, einnT: 106061, ausgT: 110396 },
      2032: { saldo: 5482, vermNetto: 649221, stTotal: 19227, einnT: 103122, ausgT: 97641 },
      2034: { saldo: -3348, vermNetto: 253795, stTotal: 20534, einnT: 97103, ausgT: 100451 },
      2037: { saldo: -2317, vermNetto: 249993, stTotal: 20790, einnT: 97103, ausgT: 99420 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Cosandier+Hintermann (Konkubinat) ==========");
    for (const jahr of [2029, 2032, 2034, 2037]) {
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
        `    └ Eink-St=${Math.round(z.ausgabenSteuernEinkommen)} Verm-St=${Math.round(z.ausgabenSteuernVermoegen)} Kap-St=${Math.round(z.ausgabenSteuernKapital)} (KapBund=${Math.round(z.ausgabenSteuernKapitalBund)} KapKan=${Math.round(z.ausgabenSteuernKapitalKanton)})`
      );
      console.log(
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} KapAusz=${Math.round(z.kapAuszahlungen)}`
      );
    }
  });
});
