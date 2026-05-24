/**
 * Validierungs-Vergleich Taxware ↔ Cuira-Engine — Fall: Bakiu Shemsi + Selime.
 * Quelle: "Def.FinancialPlanning - Angepasst.pdf" (Mission 13, 24.11.2025).
 * Verglichen wird das Szenario "Ausgangslage".
 *
 * Test ist KEIN Assert-Test — nur Reporting: druckt CUIRA vs TAXWARE
 * für Person-1-Alter 65/70/75/80. Drift-Analyse für Engine-Verbesserungen.
 *
 * Datenextraktion siehe scripts/vergleich-bakiu.ts (Stand der Diskussion).
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

// "Heute" auf 2025-11-24 pinnen (Taxware-Erstellung)
const FIXED_NOW = new Date("2025-11-24T12:00:00Z").getTime();
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

describe("Vergleich Bakiu (Ausgangslage) — Engine-Validierung gegen Taxware", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Alter 65/70/75/80", () => {
    const state: CashflowInput = {
      fallart: "paar",
      zivilstand: "verheiratet",
      person1: {
        vorname: "Shemsi",
        nachname: "Bakiu",
        geburtsdatum: "1960-05-25",
        geschlecht: "m",
        telefon: "",
        email: "",
      },
      person2: {
        vorname: "Selime",
        nachname: "Bakiu",
        geburtsdatum: "1963-08-20",
        geschlecht: "w",
        telefon: "",
        email: "",
      },
      kinder: [],
      adresse: {
        strasse: "Cholplatzweg 22a",
        plz: "7203",
        ort: "Trimmis",
        kanton: "GR",
        gemeindeBfsId: null,
        gemeindeName: "Trimmis",
      },
      ziele: { bezugsalterP1: 70, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 299000,
        einkommenP2: 36700,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 64.75, // AHV21 Frauen Jg 1963 ord-Alter

        ahvRenteJahrEffektivP1: 22680,
        ahvRenteJahrEffektivP2: 11791,
      },
      bvg: {
        p1: {
          aktiverAnschluss: false,
          altersguthabenHeute: null,
          altersguthabenBeiBezug: null,
          umwandlungssatzProzent: 0,
          bezugspraeferenz: "kapital",
          kapitalanteil: 100,
          freizuegigkeit: [
            {
              id: "fz-shemsi",
              beschreibung: "FZ Swiss Life",
              saldoHeute: 171087,
              auszahlungsjahr: 2029,
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
          freizuegigkeit: [
            {
              id: "fz-selime",
              beschreibung: "FZ Swiss Life",
              saldoHeute: 9350,
              auszahlungsjahr: 2027,
              renditeProzent: 1.5,
            },
          ],
          einkaeufe: [],
          wefVorbezuege: [],
        },
      },
      saeuleDrei: {
        // PDF S.15 zeigt 3a-Saldo 2025=74'692 → 2027=89'208 → 2028=0 (Auszahlung).
        // Annahme: Shemsi-Topf mit Saldo 67'434 heute + Einz 7'258 × 3 (2025-2027),
        // Auszahlung 2028. Selime in S.6 ohne 3a-Saldo → kein Konto im Test.
        p1: [
          {
            id: "3a-shemsi",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Shemsi",
            aktuellerWert: 67434,
            auszahlungsjahr: 2028,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2028,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2025,
            einzahlungBis: 2027,
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
            saldoHeute: 432000,
            renditeProzent: 0,
            istHauptkonto: true,
          },
          {
            id: "depot",
            typ: "depot",
            beschreibung: "Übrige Anlagen",
            saldoHeute: 100000,
            renditeProzent: 1.5,
            istHauptkonto: false,
          },
        ],
      },
      immobilien: {
        items: [
          {
            id: "eh-trimmis",
            beschreibung: "Eigenheim Trimmis",
            typ: "selbstbewohnt",
            verkehrswert: 1000000,
            // Amtlicher GR-Eigenmietwert aus PDF S.16: 33'300 = 3.33% von 1M
            eigenmietwertProzent: 3.33,
            hypotheken: [
              {
                id: "hypo-1",
                beschreibung: "Hypothek Trimmis",
                hoehe: 668000,
                zinssatzProzent: 1.64,
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
            id: "lohn-shemsi",
            beschreibung: "Erwerb Shemsi",
            personIdx: 1,
            betragMonatlich: 299000 / 12,
            von: "2025-01",
            bis: "2030-05",
          },
          {
            id: "lohn-selime",
            beschreibung: "Erwerb Selime",
            personIdx: 2,
            betragMonatlich: 36700 / 12,
            von: "2025-01",
            bis: "2028-05",
          },
        ],
        ausgabenModus: "total",
        // Engine-Konvention: ausgabenTotal = Haushalt OHNE Hypozins (Engine rechnet
        // via Immobilien-Modul) UND OHNE 3a-Einzahlung (Engine via Säule-3-Modul).
        // PDF Total Ausgaben ohne Steuern = 216'213 − Hypozins 10'955 − 3a 7'258 = 198'000.
        ausgabenTotal: 198000 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 92000 / 12,
        steuernHeute: 83000,
        einkommenHeute: 335700,
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
        stEink: number;
        stVerm: number;
        stKap: number;
        einnT: number;
        ausgT: number;
      }
    > = {
      2025: { saldo: 49717, vermNetto: 1172150, stTotal: 83000, stEink: 83000, stVerm: 0, stKap: 0, einnT: 348930, ausgT: 299213 },
      2030: { saldo: -147989, vermNetto: 1216415, stTotal: 91017, stEink: 87995, stVerm: 3022, stKap: 0, einnT: 161926, ausgT: 309915 },
      2035: { saldo: -77386, vermNetto: 813430, stTotal: 2231, stEink: 791, stVerm: 1440, stKap: 0, einnT: 37343, ausgT: 114729 },
      2040: { saldo: -79970, vermNetto: 428111, stTotal: 1041, stEink: 804, stVerm: 237, stKap: 0, einnT: 37343, ausgT: 117312 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== VOLLE REIHE 2025–2050 (Cuira-Engine, Bakiu) ==========");
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

    console.log("\n========== CHECKPOINT-VERGLEICH Bakiu (Alter P1 65/70/75/80) ==========");
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
      console.log(
        `    └ Eink-St=${Math.round(z.ausgabenSteuernEinkommen)} Verm-St=${Math.round(z.ausgabenSteuernVermoegen)} Kap-St=${Math.round(z.ausgabenSteuernKapital)} (KapBund=${Math.round(z.ausgabenSteuernKapitalBund)} KapKan=${Math.round(z.ausgabenSteuernKapitalKanton)})`
      );
      console.log(`    Eink-Steuer   : ${d(z.ausgabenSteuernEinkommen, t.stEink)}`);
      console.log(`    Verm-Steuer   : ${d(z.ausgabenSteuernVermoegen, t.stVerm)}`);
      console.log(`    Kap-Steuer    : ${d(z.ausgabenSteuernKapital, t.stKap)}`);
      console.log(
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} Hypozins=${Math.round(z.ausgabenHypozins)} EMW=${Math.round(z.eigenmietwertJahr)} KapAusz=${Math.round(z.kapAuszahlungen)}`
      );
    }
  });
});
