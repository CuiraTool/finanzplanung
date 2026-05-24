/**
 * Validierungs-Vergleich — Doko Astrit+Fitnete (Ausgangslage).
 * Mission 13 GmbH, 24.03.2026.
 *
 * Spezifika:
 *  - Paar verheiratet, SH Schaffhausen (neuer Kanton!)
 *  - Astrit geb 08.01.1979 (m, andere) → 47 in 2026
 *  - Fitnete geb 04.02.1979 (w, andere) → 47 in 2026
 *  - Beide Pension 65 = 2044 (Astrit Jan, Fitnete Feb)
 *  - AHV-Ehepaarrente 49'140 (Max heutige Werte, inkl 13.AHV)
 *  - PK Astrit Swiss 100% Rente 22'889 + Fitnete Galenica 100% Rente 19'603
 *  - BVG heute: Astrit 143'946, Fitnete 75'604
 *  - 3a heute je 32'000 (gestaffelte Bezüge 2042-2044)
 *  - Eigenheim 755'000, Hypothek 531'000 (Zins 1.10%, Refi 2.0% ab 2036)
 *  - Mandat 10'000 p.a. (Verwaltungsrat / Nebenmandat)
 *  - Inflation 0.75%, Rendite 1.5%
 *  - Stichtage Pension 65/70/75/80 = 2044/2049/2054/2059
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2026-03-24T12:00:00Z").getTime();
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

describe("Vergleich Doko Astrit+Fitnete (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Doko 65/70/75/80", () => {
    const state: CashflowInput = {
      fallart: "paar",
      zivilstand: "verheiratet",
      person1: {
        vorname: "Astrit",
        nachname: "Doko",
        geburtsdatum: "1979-01-08",
        geschlecht: "m",
        telefon: "",
        email: "",
      },
      person2: {
        vorname: "Fitnete",
        nachname: "Doko",
        geburtsdatum: "1979-02-04",
        geschlecht: "w",
        telefon: "",
        email: "",
      },
      kinder: [],
      adresse: {
        strasse: "Felsenaustrasse 34",
        plz: "8200",
        ort: "Schaffhausen",
        kanton: "SH",
        gemeindeBfsId: null,
        gemeindeName: "Schaffhausen",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 79600,
        einkommenP2: 60000,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        // PDF AHV-Ehepaarrente 49'140 inkl 13.AHV → 12-Mt-Basis 45'360.
        ahvRenteJahrEffektivP1: 22680,
        ahvRenteJahrEffektivP2: 22680,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 143946,
          // PK-Saldo bei Bezug 2044 (linear hochlaufend in Engine).
          // PDF Tabelle zeigt PK-Saldo 2043 = ~432'000 bei Renten-Start.
          // Renten 22'889 — Engine berechnet UWS bei Bezug.
          altersguthabenBeiBezug: 432000,
          umwandlungssatzProzent: 5.3,
          bezugspraeferenz: "rente",
          kapitalanteil: 0,
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
        p2: {
          aktiverAnschluss: true,
          altersguthabenHeute: 75604,
          altersguthabenBeiBezug: 370000,
          umwandlungssatzProzent: 5.3,
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
            id: "3a-astrit",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Astrit",
            aktuellerWert: 32000,
            auszahlungsjahr: 2044,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2044,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2026,
            einzahlungBis: 2044,
          },
        ],
        p2: [
          {
            id: "3a-fitnete-swisslife",
            type: "versicherung",
            saeule: "3a",
            beschreibung: "3a Police Swiss Life",
            aktuellerWert: 11543,
            auszahlungsjahr: 2042,
            renditeProzent: 0,
            rueckkaufswert: 11543,
            ablaufswert: 36238,
            ablaufjahr: 2042,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2026,
            einzahlungBis: 2042,
          },
          {
            id: "3a-fitnete-everon",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Depot Everon Fitnete",
            aktuellerWert: 20457, // approx
            auszahlungsjahr: 2043,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2043,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2026,
            einzahlungBis: 2032,
          },
          {
            id: "3a-fitnete-neu",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a NEU Fitnete",
            aktuellerWert: 0,
            auszahlungsjahr: 2044,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2044,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2033,
            einzahlungBis: 2044,
          },
        ],
      },
      vermoegen: {
        items: [
          {
            id: "hk",
            typ: "konto",
            beschreibung: "Liquidität",
            saldoHeute: 126523,
            renditeProzent: 0,
            istHauptkonto: true,
          },
          {
            id: "privat-konto",
            typ: "konto",
            beschreibung: "Privatkonto",
            saldoHeute: 10000,
            renditeProzent: 0,
            istHauptkonto: false,
          },
        ],
      },
      immobilien: {
        items: [
          {
            id: "eh-schaffhausen",
            beschreibung: "EFH Schaffhausen",
            typ: "selbstbewohnt",
            verkehrswert: 755000,
            eigenmietwertProzent: 1.53, // 11'560 / 755'000
            hypotheken: [
              {
                id: "hypo",
                beschreibung: "Hypothek",
                hoehe: 531000,
                zinssatzProzent: 1.10, // 5'819 / 531'000
                ablaufjahr: 2036,
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
            id: "lohn-astrit",
            beschreibung: "Erwerb Astrit",
            personIdx: 1,
            betragMonatlich: 79600 / 12,
            von: "2025-01",
            bis: "2044-01",
          },
          {
            id: "lohn-fitnete",
            beschreibung: "Erwerb Fitnete",
            personIdx: 2,
            betragMonatlich: 60000 / 12,
            von: "2025-01",
            bis: "2044-02",
          },
          {
            id: "mandat",
            beschreibung: "Mandat (Diverses)",
            personIdx: 1,
            betragMonatlich: 10000 / 12,
            von: "2025-01",
            bis: "2050-12",
          },
        ],
        ausgabenModus: "total",
        // PDF 2026 Total 113'077 − Steuern 14'400 − 3a 7'258 − Schuldz 5'819
        //   − Amortisation 2'000 = 83'600.
        // Leben 29'400 + Wohnen-Eig 8'200 + Mob 7'200 + Versich 16'800 + Div 22'000 = 83'600 ✓
        ausgabenTotal: 83600 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 83600 / 12,
        steuernHeute: 14400,
        einkommenHeute: 149600, // 79600 + 60000 + 10000
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

    const reihe = cashflowReihe(state, 2026, 2065);

    const taxware: Record<
      number,
      { saldo: number; vermNetto: number; stTotal: number; einnT: number; ausgT: number }
    > = {
      2044: { saldo: -20423, vermNetto: 1133713, stTotal: 19447, einnT: 99297, ausgT: 119720 },
      2049: { saldo: -15478, vermNetto: 1062781, stTotal: 9136, einnT: 91632, ausgT: 107110 },
      2054: { saldo: -18542, vermNetto: 976230, stTotal: 8826, einnT: 91632, ausgT: 110174 },
      2059: { saldo: -21050, vermNetto: 895802, stTotal: 8582, einnT: 91632, ausgT: 112682 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Doko Astrit+Fitnete ==========");
    for (const jahr of [2044, 2049, 2054, 2059]) {
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
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} Hypozins=${Math.round(z.ausgabenHypozins)} KapAusz=${Math.round(z.kapAuszahlungen)} EMW=${Math.round(z.eigenmietwertJahr)}`
      );
    }
  });
});
