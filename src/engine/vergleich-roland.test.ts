/**
 * Validierungs-Vergleich Taxware ↔ Cuira-Engine — Fall 3: Peter Roland + Elisabeth.
 * Quelle: "Def.FinancialPlanning 66% Bezug.pdf" (Mission 13, 09.12.2024).
 * Verglichen wird das Szenario "Ausgangslage" (200k Kapital + Rest Rente).
 *
 * Spezifika:
 *  - Mieter (kein Eigenheim, keine Hypothek, keine EMW/GGSt)
 *  - Roland Mischbezug 200'000 Kapital + Rest Rentenbezug PK SGPK
 *    Rente 50'142 p.a. (in PDF inkl 13. AHV? wahrscheinlich BVG-Rente einfach)
 *  - Elisabeth 100% Kapitalbezug PK SGPK CHF 221'690
 *  - Roland bereits 65 im Plan-Startjahr (Pension Ende Juli 2025)
 *  - Elisabeth 64 in 2025, Pension Juli 2025 → AHV21 Ref-Alter Frauen
 *    Jg 1961 = 64.25 (Wechsel mit AHV21)
 *  - Wohnmobil 150'000 Einmal-Ausgabe in 2026
 *  - Steuerkanton SG Untereggen, 0 Kinder, "Andere" → keine Kirchensteuer
 *  - Inflation 1.0 %, Rendite 1.5 %
 *
 * Stichtage: Roland 65/70/75/80 = 2025/2030/2035/2040
 *
 * Mapping:
 *  - AHV Override 49'296 / 13×12 = 45'504 (12-Mt-Basis), Engine multipliziert
 *    ab 2026 × 13/12. Split 60/40 nach Einkommens-Verhältnis.
 *  - Roland PK: altersguthabenBeiBezug 1'000'000 (vereinfacht), uws 6.27 %,
 *    Mischung 20% Kapital. Daraus: Kapital 200k + Rente (1M − 200k) × 6.27% = 50'160.
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-01-15T12:00:00Z").getTime();
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

describe("Vergleich Peter Roland (Ausgangslage) — Engine-Validierung", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Roland Alter 65/70/75/80", () => {
    const state: CashflowInput = {
      fallart: "paar",
      zivilstand: "verheiratet",
      person1: {
        vorname: "Roland",
        nachname: "Peter",
        geburtsdatum: "1960-02-07",
        geschlecht: "m",
        telefon: "",
        email: "",
      },
      person2: {
        vorname: "Elisabeth",
        nachname: "Peter",
        geburtsdatum: "1961-03-21",
        geschlecht: "w",
        telefon: "",
        email: "",
      },
      kinder: [],
      adresse: {
        strasse: "Iltenriet 5",
        plz: "9033",
        ort: "Untereggen",
        kanton: "SG",
        gemeindeBfsId: null,
        gemeindeName: "Untereggen",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 64 },
      ahv: {
        einkommenP1: 77583,
        einkommenP2: 39083,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 64.25, // AHV21 Frauen Jg 1961
        // Taxware Ehepaar 49'296 inkl 13. AHV. 12-Mt-Basis: 49'296 × 12/13 = 45'504.
        // Plafond 45'360 — sehr knapp drüber → effektiv Plafond.
        // Split 60/40 nach Einkommen.
        ahvRenteJahrEffektivP1: 27915, // 0.6 × 45504 + 200 Rundung
        ahvRenteJahrEffektivP2: 17589,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 1158683,
          altersguthabenBeiBezug: 1000000,
          umwandlungssatzProzent: 6.27,
          bezugspraeferenz: "mischung",
          kapitalanteil: 20, // 200'000 / 1'000'000 = 20%
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
        p2: {
          aktiverAnschluss: true,
          altersguthabenHeute: 216134,
          altersguthabenBeiBezug: 221690,
          umwandlungssatzProzent: 5.5,
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
            beschreibung: "Privatkonto / Liquidität",
            saldoHeute: 0,
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
            id: "lohn-roland",
            beschreibung: "Erwerb Roland",
            personIdx: 1,
            betragMonatlich: 77583 / 12,
            von: "2025-01",
            bis: "2025-07",
          },
          {
            id: "lohn-elisabeth",
            beschreibung: "Erwerb Elisabeth",
            personIdx: 2,
            betragMonatlich: 39083 / 12,
            von: "2025-01",
            bis: "2025-07",
          },
        ],
        ausgabenModus: "total",
        // PDF S.14: Lebenshaltung 40'260 + Wohnen 26'880 + Diverse 18'000 = 85'140
        // (ohne Steuern). Wir setzen ausgabenTotal = 85'140 (Mieter, kein Hypozins, kein 3a).
        ausgabenTotal: 85140 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 85140 / 12,
        steuernHeute: 62346,
        einkommenHeute: 192900,
        religion: "andere",
        alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
        inflationProzent: 1.0,
      },
      einmaligeAusgaben: [
        {
          id: "wohnmobil",
          jahr: 2026,
          betrag: 150000,
          beschreibung: "Kauf Wohnmobil",
        },
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

    // Taxware-Referenz Roland Ausgangslage (Stichtage 65/70/75/80)
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
      2025: { saldo: 45414, vermNetto: 195104, stTotal: 62346, stEink: 35314, stVerm: 0, stKap: 27032, einnT: 192900, ausgT: 147486 },
      2030: { saldo: -1700, vermNetto: 221521, stTotal: 11656, stEink: 11378, stVerm: 278, stKap: 0, einnT: 99438, ausgT: 101138 },
      2035: { saldo: -6196, vermNetto: 199590, stTotal: 11588, stEink: 11378, stVerm: 210, stKap: 0, einnT: 99438, ausgT: 105635 },
      2040: { saldo: -10841, vermNetto: 154732, stTotal: 11435, stEink: 11378, stVerm: 57, stKap: 0, einnT: 99438, ausgT: 110279 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== VOLLE REIHE 2025–2050 (Cuira-Engine, Roland) ==========");
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

    console.log("\n========== CHECKPOINT-VERGLEICH Roland (Alter P1 65/70/75/80) ==========");
    for (const jahr of [2025, 2030, 2035, 2040]) {
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
      console.log(`    Eink-Steuer   : ${d(z.ausgabenSteuernEinkommen, t.stEink)}`);
      console.log(`    Verm-Steuer   : ${d(z.ausgabenSteuernVermoegen, t.stVerm)}`);
      console.log(`    Kap-Steuer    : ${d(z.ausgabenSteuernKapital, t.stKap)}`);
      console.log(
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} KapAusz=${Math.round(z.kapAuszahlungen)}`
      );
    }
  });
});
