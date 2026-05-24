/**
 * Validierungs-Vergleich — Gabriel Peter (Ausgangslage).
 * Mission 13 GmbH, 12.07.2024.
 *
 * Spezifika:
 *  - Mann geb 27.12.1959, andere Konf, geschieden → 65 in Dez 2024
 *  - SCHON PENSIONIERT seit Jan 2025
 *  - TG Bottighofen, Mittlere Mühlestrasse 1
 *  - AHV 19'380 (Annahme — vermutlich IK-Lücken / Auslandsjahre)
 *  - 100% BVG-Rente VSAO 86'304
 *  - Eigenheim TG 700k + Renditeliegenschaft MFH Uri 300k
 *  - Hypothek 350k
 *  - Mieteinnahmen Uri 22'800 brutto (15'000 netto nach 7'800 Rückstellung)
 *  - Liquid 130k, BVG bei Bezug bereits ausbezahlt als Rente
 *  - Inflation 1.0%, Rendite 2.5%
 *  - Stichtage 66/71/76/81 = 2025/2030/2035/2040
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-07-12T12:00:00Z").getTime();
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

describe("Vergleich Gabriel Peter (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Gabriel 66/71/76/81", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "geschieden",
      person1: {
        vorname: "Gabriel",
        nachname: "Peter",
        geburtsdatum: "1959-12-27",
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
        strasse: "Mittlere Mühlestrasse 1",
        plz: "8598",
        ort: "Bottighofen",
        kanton: "TG",
        gemeindeBfsId: null,
        gemeindeName: "Bottighofen",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 0,
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        // AHV 19'380 (Berater-Annahme, niedrig wg IK-Lücken).
        // 19380 ist Jahresrente inkl 13.AHV → 12-Mt-Basis 17'889.
        ahvRenteJahrEffektivP1: 17889,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          // BVG bereits ausbezahlt 2025 → AGB-Saldo bei Bezug-Anker
          // 86'304 / 0.0595 = 1'450'490 (= PDF-Anker)
          altersguthabenHeute: 1450490,
          altersguthabenBeiBezug: 1450490,
          umwandlungssatzProzent: 5.95,
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
      saeuleDrei: { p1: [], p2: [] },
      vermoegen: {
        items: [
          {
            id: "hk",
            typ: "konto",
            beschreibung: "Liquidität",
            saldoHeute: 130000,
            renditeProzent: 0,
            istHauptkonto: true,
          },
        ],
      },
      immobilien: {
        items: [
          {
            id: "eh-bottighofen",
            beschreibung: "EFH Bottighofen",
            typ: "selbstbewohnt",
            verkehrswert: 700000,
            eigenmietwertProzent: 1.13,
            hypotheken: [
              {
                id: "hypo1",
                beschreibung: "Hypo EFH",
                hoehe: 350000,
                zinssatzProzent: 1.57, // 5'500 / 350'000 ≈ 1.57%
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
          {
            id: "mfh-uri",
            beschreibung: "MFH Uri",
            typ: "rendite",
            verkehrswert: 300000,
            hypotheken: [],
            plan: "behalten",
            verkaufsjahr: 2099,
            jaehrlicheMieteinnahmen: 22800,
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
        einkommen: [], // schon pensioniert
        ausgabenModus: "total",
        // PDF 2025 Total 117'056 − Steuern 33'256 − Schuldzins 5'500
        //   − Reserve MFH 7'800 = 70'500.
        // Lebenshaltung 35'500 + Wohnen-Eig 5'000 + Mob 10'000 + Vers 8'000
        //   + Diverse 12'000 = 70'500.
        ausgabenTotal: 70500 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 70500 / 12,
        steuernHeute: 33256,
        einkommenHeute: 0,
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
      2025: { saldo: 11428, vermNetto: 1141509, stTotal: 33256, einnT: 128484, ausgT: 117056 },
      2030: { saldo: 17708, vermNetto: 1275325, stTotal: 13168, einnT: 128484, ausgT: 110776 },
      2035: { saldo: 13077, vermNetto: 1264283, stTotal: 9975, einnT: 128484, ausgT: 115407 },
      2040: { saldo: -22271, vermNetto: 716124, stTotal: 8518, einnT: 89504, ausgT: 111775 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Gabriel ==========");
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
      console.log(
        `  Detail: AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Miet=${Math.round(z.einnahmenMieten)} Haushalt=${Math.round(z.ausgabenHaushalt)} Hypozins=${Math.round(z.ausgabenHypozins)} EMW=${Math.round(z.eigenmietwertJahr)}`
      );
    }
  });
});
