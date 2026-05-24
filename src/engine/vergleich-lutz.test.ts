/**
 * Validierungs-Vergleich — Lutz Philipp + Bernadette (Ausgangslage).
 * Mission 13 GmbH, 09.07.2025.
 *
 * Spezifika:
 *  - Paar verheiratet, SG Rorschach
 *  - Philipp geb 07.10.1960 (m, andere Konf) → 65 in Okt 2025
 *  - Bernadette geb 10.09.1969 (w, andere Konf) → 56 in 2025
 *  - Philipp Pension ord Alter 65 = Okt 2025
 *  - Bernadette AHV ord Alter 65 = Sep 2034, PK-Aufschub bis Alter 69 = Sep 2038
 *  - AHV-Ehepaarrente 45'840 inkl Rentenzuschlag + 13.AHV → 12-Mt-Basis = 42'314
 *  - PK Thurbo + Thurbo Plus Philipp Renten 19'851 + 1'570 = 21'421
 *  - Eigenheim 1'000'000 (vermietete Einheit 19'800 p.a.)
 *  - Hypothek 460'000 (Zins 1.15%, Refinanzierung 2027-2028 mit 1.5%)
 *  - Liquid 150'241, 3a Philipp 104'600, 3a Bernadette 2'300
 *  - Inflation 1.0%, Rendite 1.5%
 *  - Stichtage Pension+1/+6/+11/+16 = 2026/2031/2036/2041
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-07-09T12:00:00Z").getTime();
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

describe("Vergleich Lutz Philipp+Bernadette (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Lutz 66/71/76/81", () => {
    const state: CashflowInput = {
      fallart: "paar",
      zivilstand: "verheiratet",
      person1: {
        vorname: "Philipp",
        nachname: "Lutz",
        geburtsdatum: "1960-10-07",
        geschlecht: "m",
        telefon: "",
        email: "",
      },
      person2: {
        vorname: "Bernadette",
        nachname: "Lutz",
        geburtsdatum: "1969-09-10",
        geschlecht: "w",
        telefon: "",
        email: "",
      },
      kinder: [],
      adresse: {
        strasse: "Langmoosstrasse 25",
        plz: "9400",
        ort: "Rorschach",
        kanton: "SG",
        gemeindeBfsId: null,
        gemeindeName: "Rorschach",
      },
      // Bernadette Jg 1969 = ord 65, AHV ab Sep 2034. PK-Aufschub bis 69 = 2038.
      ziele: { bezugsalterP1: 65, bezugsalterP2: 69 },
      ahv: {
        einkommenP1: 77500,
        einkommenP2: 15000,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        // Engine-Konvention: Override = INDIVIDUELLE BSV-Vollrente, Engine
        // plafondiert auf 45'360 × 13/12 wenn beide bezogen. Vor P2-Pension
        // bekommt P1 die volle individuelle Rente (32'760 = 30'240 × 13/12).
        // PDF AHV-Ehepaarrente 45'840 wäre ohne Plafond 30'240 × 2 = 60'480.
        ahvRenteJahrEffektivP1: 30240,
        ahvRenteJahrEffektivP2: 30240,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 415517,
          altersguthabenBeiBezug: 415517,
          // Renten 21'421 total / 415'517 → UWS 5.16%.
          umwandlungssatzProzent: 5.16,
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
            id: "3a-raiffeisen-p",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Raiffeisen Philipp",
            aktuellerWert: 104600,
            auszahlungsjahr: 2025,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2025,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2025,
            einzahlungBis: 2025,
          },
        ],
        p2: [
          {
            id: "3a-raiffeisen-b",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Raiffeisen Bernadette",
            aktuellerWert: 2300,
            auszahlungsjahr: 2038,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2038,
            jaehrlicheEinzahlung: 2000,
            einzahlungAb: 2026,
            einzahlungBis: 2037,
          },
          {
            id: "3b-generali",
            type: "versicherung",
            saeule: "3b",
            beschreibung: "3b Generali Police",
            aktuellerWert: 10179,
            auszahlungsjahr: 2033,
            renditeProzent: 0,
            rueckkaufswert: 10179,
            ablaufswert: 21543,
            ablaufjahr: 2033,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2025,
            einzahlungBis: 2033,
          },
        ],
      },
      vermoegen: {
        items: [
          {
            id: "hk",
            typ: "konto",
            beschreibung: "Liquidität",
            saldoHeute: 150241,
            renditeProzent: 0,
            istHauptkonto: true,
          },
          {
            id: "depot",
            typ: "depot",
            beschreibung: "Anlagedepot",
            saldoHeute: 100000,
            renditeProzent: 1.5,
            istHauptkonto: false,
          },
        ],
      },
      immobilien: {
        items: [
          {
            id: "eh-rorschach",
            beschreibung: "EFH Rorschach",
            typ: "selbstbewohnt",
            verkehrswert: 1000000,
            eigenmietwertProzent: 2.16, // 21'600 / 1'000'000
            hypotheken: [
              {
                id: "hypo",
                beschreibung: "Hypothek",
                hoehe: 460000,
                zinssatzProzent: 1.15, // 5'286 / 460'000
                ablaufjahr: 2027,
                refinanzierungZinssatzProzent: 1.5,
                tilgungsplan: [],
              },
            ],
            plan: "behalten",
            verkaufsjahr: 2099,
            jaehrlicheMieteinnahmen: 19800, // vermietete Einheit
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
            id: "lohn-philipp",
            beschreibung: "Erwerb Philipp",
            personIdx: 1,
            betragMonatlich: 77500 / 9,
            von: "2025-01",
            bis: "2025-09",
          },
          {
            id: "lohn-bernadette",
            beschreibung: "Erwerb Bernadette (Selbst)",
            personIdx: 2,
            betragMonatlich: 15000 / 12,
            von: "2025-01",
            bis: "2037-12",
          },
        ],
        ausgabenModus: "total",
        // PDF 2025 Total 86'269 − Steuern 17'983 − 3a 2'400 − Schuldz 5'286 = 60'600.
        // Leben 22'800 + Wohnen-Eig 18'000 + Mob 3'600 + Versich 16'200 = 60'600 ✓
        ausgabenTotal: 60600 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 60600 / 12,
        steuernHeute: 17983,
        einkommenHeute: 92500, // 77500 + 15000
        religion: "andere",
        alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
        inflationProzent: 1.0,
      },
      einmaligeAusgaben: [
        // Heizung 2028 40'000, Auto 2030 20'000
        { id: "heizung", jahr: 2028, betrag: 40000, beschreibung: "Heizung" },
        { id: "auto", jahr: 2030, betrag: 20000, beschreibung: "Auto" },
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

    const taxware: Record<
      number,
      { saldo: number; vermNetto: number; stTotal: number; einnT: number; ausgT: number }
    > = {
      2026: { saldo: -8615, vermNetto: 801944, stTotal: 28704, einnT: 88981, ausgT: 97596 },
      2031: { saldo: -3809, vermNetto: 756428, stTotal: 19161, einnT: 88981, ausgT: 92789 },
      2036: { saldo: 2212, vermNetto: 776939, stTotal: 22940, einnT: 102061, ausgT: 99849 },
      2041: { saldo: -10200, vermNetto: 756879, stTotal: 19303, einnT: 87061, ausgT: 97261 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Lutz Philipp+Bernadette ==========");
    for (const jahr of [2026, 2031, 2036, 2041]) {
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
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Miet=${Math.round(z.einnahmenMieten)} Haushalt=${Math.round(z.ausgabenHaushalt)} Hypozins=${Math.round(z.ausgabenHypozins)} KapAusz=${Math.round(z.kapAuszahlungen)} EMW=${Math.round(z.eigenmietwertJahr)}`
      );
    }
  });
});
