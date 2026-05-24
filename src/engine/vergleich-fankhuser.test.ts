/**
 * Validierungs-Vergleich Taxware ↔ Cuira-Engine — Fall: Fankhauser Peter.
 * Quelle: "Def.FinancialPlanning (1).pdf" (Finwiwo AG, 22.04.2025).
 * Szenario "Ausgangslage" verglichen.
 *
 * Spezifika dieses Falls:
 *  - Einzelperson, geschieden, Mieter, AG-Lupfig
 *  - Konfession "Andere", 0 Kinder
 *  - Pension Alter 65 per Ende Feb 2030 (geb. 06.02.1965)
 *  - 100% Kapitalbezug PK Futura (421'864 in 2030)
 *  - 3a-Bezug in Etappen 2028/2029/2030 (vereinfacht: ein Konto 2030)
 *  - Jährlicher PK-Einkauf 10'000 in 2025-2030 (steuerlich abzugsfähig)
 *  - Inflation 1.0 %, Rendite Wertschriften 1.5 %
 *  - AHV ab 03.2030 mit CHF 27'261 inkl. 13. AHV
 *
 * Stichtage: Person 1 Alter 65/70/75/80 = 2030/2035/2040/2045
 *
 * Vereinfachungen / Mapping-Entscheide:
 *  - "Heute" auf 2025-04-22 gepinnt (Taxware-Erstellung)
 *  - 3a vereinfacht als ein Konto, Auszahlung 2030 — verglichen wird der
 *    aggregierte Effekt, nicht die Einzel-Tranchen.
 *  - AHV-Override 25'164 (27'261 × 12/13) — Engine multipliziert ab 2026.
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-04-22T12:00:00Z").getTime();
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

describe("Vergleich Fankhauser Peter (Ausgangslage) — Engine-Validierung", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Alter 65/70/75/80", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "geschieden",
      person1: {
        vorname: "Peter",
        nachname: "Fankhauser",
        geburtsdatum: "1965-02-06",
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
        strasse: "Ringweg 4",
        plz: "5242",
        ort: "Lupfig",
        kanton: "AG",
        gemeindeBfsId: null,
        gemeindeName: "Lupfig",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 82000,
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        // PDF: AHV 27'261 inkl. 13. AHV. 12-Mt-Basis ohne 13.: 27'261 × 12/13 = 25'164.
        ahvRenteJahrEffektivP1: 25164,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 269824,
          altersguthabenBeiBezug: 421864,
          umwandlungssatzProzent: 6.0,
          bezugspraeferenz: "kapital",
          kapitalanteil: 100,
          freizuegigkeit: [],
          einkaeufe: [
            {
              id: "ek-1",
              jahr: 2025,
              betrag: 10000,
              serie: true,
              bisJahr: 2030,
            },
          ],
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
      saeuleDrei: {
        // PDF S.4 Ausgangslage: 3a-Auszahlung in 3 Tranchen (2028: 25'433,
        // 2029: 60'146, 2030: 7'258). Aktueller 3a-Saldo 46'089 + Einz 7'258
        // jährlich 2025-2029. Vereinfacht modelliert als EIN Konto mit
        // Auszahlung 2030 (Total ~92'837 inkl. Einz. 2030).
        p1: [
          {
            id: "3a-akb",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a AKB",
            aktuellerWert: 46089,
            auszahlungsjahr: 2030,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2030,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2025,
            einzahlungBis: 2030,
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
            saldoHeute: 70000,
            renditeProzent: 0,
            istHauptkonto: true,
          },
        ],
      },
      immobilien: { items: [] }, // Mieter
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
            id: "lohn-peter",
            beschreibung: "Erwerb Peter",
            personIdx: 1,
            betragMonatlich: 82000 / 12,
            von: "2025-01",
            bis: "2030-02", // Pension Ende Feb 2030
          },
        ],
        ausgabenModus: "total",
        // PDF S.14 Total 2025 = 59'458 − Steuern 7'000 − 3a 7'258 = 45'200 (ohne PK-Einkauf).
        // PK-Einkauf wird via einkaeufe-Liste separat verrechnet.
        ausgabenTotal: 45200 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        // Pension keine Budget-Reduktion (PDF S.4). Gleicher Wert.
        wunschverbrauchPension: 45200 / 12,
        steuernHeute: 7000,
        einkommenHeute: 82000,
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

    // Taxware-Referenz Fankhauser Ausgangslage (Alter 65/70/75/80)
    const taxware: Record<
      number,
      {
        saldo: number;
        vermNetto: number;
        stTotal: number;
        stEink: number;
        stVerm: number;
        stKap: number;
        einnT: number;
        ausgT: number;
      }
    > = {
      2030: { saldo: -61836, vermNetto: 570252, stTotal: 43456, stEink: 7020, stVerm: 275, stKap: 36161, einnT: 36384, ausgT: 98220 },
      2035: { saldo: -25567, vermNetto: 471809, stTotal: 2899, stEink: 1759, stVerm: 1140, stKap: 0, einnT: 27261, ausgT: 52828 },
      2040: { saldo: -27530, vermNetto: 353362, stTotal: 2316, stEink: 1548, stVerm: 767, stKap: 0, einnT: 27261, ausgT: 54791 },
      2045: { saldo: -29662, vermNetto: 213625, stTotal: 1771, stEink: 1407, stVerm: 364, stKap: 0, einnT: 27261, ausgT: 56923 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== VOLLE REIHE 2025–2050 (Cuira-Engine, Fankhauser) ==========");
    console.log(
      ["Jahr", "AlP1", "einnT", "ausgT", "saldo", "stTot", "stEink", "stVerm", "stKap", "kapAusz", "vermNetto"]
        .map((s) => s.padStart(12))
        .join("")
    );
    for (const z of reihe) {
      console.log(
        [
          z.jahr,
          z.alterP1 ?? "",
          Math.round(z.einnahmenTotal),
          Math.round(z.ausgabenTotal),
          Math.round(z.saldo),
          Math.round(z.ausgabenSteuern),
          Math.round(z.ausgabenSteuernEinkommen),
          Math.round(z.ausgabenSteuernVermoegen),
          Math.round(z.ausgabenSteuernKapital),
          Math.round(z.kapAuszahlungen),
          Math.round(z.vermoegenNetto),
        ]
          .map((v) => String(v).padStart(12))
          .join("")
      );
    }

    console.log("\n========== CHECKPOINT-VERGLEICH Fankhauser (Alter P1 65/70/75/80) ==========");
    for (const jahr of [2030, 2035, 2040, 2045]) {
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
      console.log(`    Eink-Steuer   : ${d(z.ausgabenSteuernEinkommen, t.stEink)}`);
      console.log(`    Verm-Steuer   : ${d(z.ausgabenSteuernVermoegen, t.stVerm)}`);
      console.log(`    Kap-Steuer    : ${d(z.ausgabenSteuernKapital, t.stKap)}`);
      console.log(
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} PkEinkauf=${Math.round(z.ausgabenPkEinkauf)} 3a=${Math.round(z.ausgabenVorsorge3a)} KapAusz=${Math.round(z.kapAuszahlungen)}`
      );
    }
  });
});
