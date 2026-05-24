/**
 * Validierungs-Vergleich — Staub-Kappeler (Ausgangslage).
 * Anlageberatung Schweiz GmbH, 21.05.2026.
 *
 * Spezifika:
 *  - Paar verheiratet, beide schon LANGE pensioniert
 *  - Peter: 29.05.1944 (m, röm-kath, 82 in 2026, AHV-Bezug seit 2009)
 *  - Katharina: 13.03.1950 (w, evangelisch-reformiert, 76 in 2026)
 *  - Adresse Frauenfeld TG
 *  - Eigenheim Fliederstrasse 57 (1'400'000 selbstgenutzt)
 *  - Renditeliegenschaft MFH Zürcherstrasse 149 (1'600'000)
 *    Ausgangslage: Verkauf 2027 mit 1.5M Erlös + GGSt 140k
 *  - Mieteinnahmen 66'800 p.a. bis Verkauf
 *  - AHV-Ehepaarrente 47'775 (PDF: vermutlich inkl. 13. AHV)
 *  - BVG Peter Rente 87'041 p.a. (seit 2009)
 *  - Hypothek 200'000
 *  - Inflation 1.0 %, Rendite 1.5 %
 *  - Stichtage angepasst (Peter zu alt): heute 82, dann 85/90/95
 *    = 2026/2029/2034/2039
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2026-05-21T12:00:00Z").getTime();
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

describe("Vergleich Staub-Kappeler (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE Stichtage 82/85/90/95", () => {
    const state: CashflowInput = {
      fallart: "paar",
      zivilstand: "verheiratet",
      person1: {
        vorname: "Peter",
        nachname: "Staub-Kappeler",
        geburtsdatum: "1944-05-29",
        geschlecht: "m",
        telefon: "",
        email: "",
      },
      person2: {
        vorname: "Katharina",
        nachname: "Staub-Kappeler",
        geburtsdatum: "1950-03-13",
        geschlecht: "w",
        telefon: "",
        email: "",
      },
      kinder: [],
      adresse: {
        strasse: "Fliederstrasse 57",
        plz: "8500",
        ort: "Frauenfeld",
        kanton: "TG",
        gemeindeBfsId: null,
        gemeindeName: "Frauenfeld",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 64 },
      ahv: {
        einkommenP1: 90000, // historisch nicht relevant (lang pensioniert)
        einkommenP2: 40000,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 64,
        // PDF AHV Ehepaarrente 47'775 inkl. 13. AHV. 12-Mt-Basis: 44'100.
        // Hälftig je 22'050 (Standard Paar-Splitting).
        ahvRenteJahrEffektivP1: 22050,
        ahvRenteJahrEffektivP2: 22050,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 0, // schon ausbezahlt als Rente
          // Rückrechnung: 87'041 / 0.0627 ≈ 1'388'214 Saldo bei Bezug 2009
          altersguthabenBeiBezug: 1388214,
          umwandlungssatzProzent: 6.27,
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
            saldoHeute: 217420,
            renditeProzent: 0,
            istHauptkonto: true,
          },
          {
            id: "depot",
            typ: "depot",
            beschreibung: "Übrige Anlagen",
            saldoHeute: 240580,
            renditeProzent: 1.5,
            istHauptkonto: false,
          },
        ],
      },
      immobilien: {
        items: [
          {
            id: "eh-fliederstr",
            beschreibung: "EFH Fliederstrasse 57",
            typ: "selbstbewohnt",
            verkehrswert: 1400000,
            eigenmietwertProzent: 1.13,
            hypotheken: [
              {
                id: "hypo",
                beschreibung: "Hypothek",
                hoehe: 200000,
                zinssatzProzent: 1.22, // 2'440 / 200'000 ≈ 1.22%
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
            id: "mfh-zuercherstr",
            beschreibung: "MFH Zürcherstrasse 149",
            typ: "rendite",
            verkehrswert: 1600000,
            hypotheken: [],
            plan: "verkaufen",
            verkaufsjahr: 2027, // PDF: Verkauf 1.5M Erlös + GGSt 140k
            jaehrlicheMieteinnahmen: 66800,
            kaufjahr: 1990, // alt → Engine nimmt Default-Anlagekosten
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
        // PDF Total 161'000 − Steuern 41'226 − Hypozins 2'440 = 117'334.
        ausgabenTotal: 117334 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 117334 / 12,
        steuernHeute: 41226,
        einkommenHeute: 0,
        religion: "katholisch",
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

    const reihe = cashflowReihe(state, 2026, 2050);

    const taxware: Record<
      number,
      { saldo: number; vermNetto: number; stTotal: number; einnT: number; ausgT: number }
    > = {
      2026: { saldo: 40616, vermNetto: 3302225, stTotal: 41226, einnT: 201616, ausgT: 161000 },
      2029: { saldo: -27943, vermNetto: 3102480, stTotal: 0, einnT: 134816, ausgT: 162759 },
      2034: { saldo: -34356, vermNetto: 3044495, stTotal: 0, einnT: 134816, ausgT: 169172 },
      2039: { saldo: -39668, vermNetto: 2980117, stTotal: 0, einnT: 134816, ausgT: 174484 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Staub-Kappeler ==========");
    for (const jahr of [2026, 2029, 2034, 2039]) {
      const z = reihe.find((r) => r.jahr === jahr)!;
      const t = taxware[jahr]!;
      const d = (cuira: number, tax: number) => {
        const diff = Math.round(cuira - tax);
        const pct = tax !== 0 ? ((diff / Math.abs(tax)) * 100).toFixed(1) + "%" : "–";
        return `${f(Math.round(cuira))} | ${f(tax)} | Δ ${f(diff)} (${pct})`;
      };
      console.log(`\n── ${jahr} (Alter P1 ${z.alterP1} / P2 ${z.alterP2}) ──     CUIRA |     TAXWARE | Δ`);
      console.log(`  Einnahmen total : ${d(z.einnahmenTotal, t.einnT)}`);
      console.log(`  Ausgaben total  : ${d(z.ausgabenTotal, t.ausgT)}`);
      console.log(`  Saldo           : ${d(z.saldo, t.saldo)}`);
      console.log(`  Vermögen netto  : ${d(z.vermoegenNetto, t.vermNetto)}`);
      console.log(`  Steuern total   : ${d(z.ausgabenSteuern, t.stTotal)}`);
      console.log(
        `  Detail: AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Miet=${Math.round(z.einnahmenMieten)} Haushalt=${Math.round(z.ausgabenHaushalt)} Hypozins=${Math.round(z.ausgabenHypozins)} KapAusz=${Math.round(z.kapAuszahlungen)} EMW=${Math.round(z.eigenmietwertJahr)}`
      );
    }
  });
});
