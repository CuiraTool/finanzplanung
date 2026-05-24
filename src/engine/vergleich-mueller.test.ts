/**
 * Validierungs-Vergleich — Müller Stephan (Ausgangslage).
 * Mission 13 GmbH, 29.05.2025.
 *
 * Spezifika:
 *  - Einzelperson m, verwitwet, evang-reformiert
 *  - geb. 02.02.1964 → Alter 61 in 2025
 *  - Pension Alter 65 = Feb 2029
 *  - AHV 30'394 inkl 13.AHV → 12-Mt-Basis = 28'056
 *  - 100% Rente PK SGPK 33'215
 *  - SG St. Gallen — Mieter (Wohnen 19'200 p.a.)
 *  - 3a Swiss Life 72'555 → Auszahlung 12.2025
 *  - 3a Swiss Life 100'050 → Auszahlung 01.2026
 *  - 3a Migros Bank → Einzahlung 7'258 p.a. 2026-2028, Auszahlung 01.2029 = 86'261
 *  - Liquidität 151'368, Anlagedepot 0 (Aufbau 2026 mit 100k Umschichtung)
 *  - Inflation 1.0%, Rendite 1.5%
 *  - Stichtage Pension+1/+6/+11/+16 = 2030/2035/2040/2045 (Alter 66/71/76/81)
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-05-29T12:00:00Z").getTime();
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

describe("Vergleich Müller Stephan (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Müller 66/71/76/81", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "verwitwet",
      person1: {
        vorname: "Stephan",
        nachname: "Müller",
        geburtsdatum: "1964-02-02",
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
        strasse: "Kesselhaldenhof 3",
        plz: "9016",
        ort: "St. Gallen",
        kanton: "SG",
        gemeindeBfsId: null,
        gemeindeName: "St. Gallen",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 73200,
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        // PDF: 30'394 inkl 13.AHV → 12-Mt-Basis 28'056.
        ahvRenteJahrEffektivP1: 28056,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 496611,
          // PK-Saldo bei Bezug Feb 2029. PDF Tabelle zeigt 632'772 Ende 2028.
          // 100% Rente 33'215 / 632'772 → UWS 5.25%.
          altersguthabenBeiBezug: 632772,
          umwandlungssatzProzent: 5.25,
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
            id: "3a-swiss-life-1",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Swiss Life Police 1",
            aktuellerWert: 72555,
            auszahlungsjahr: 2025,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2025,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2025,
            einzahlungBis: 2025,
          },
          {
            id: "3a-swiss-life-2",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Swiss Life Police 2",
            aktuellerWert: 97525,
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
            id: "3a-migros",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Migros Bank",
            aktuellerWert: 63257, // 233'337 − 72'555 − 97'525 = 63'257
            auszahlungsjahr: 2029,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2029,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2026,
            einzahlungBis: 2028,
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
            saldoHeute: 151368,
            renditeProzent: 0,
            istHauptkonto: true,
          },
          {
            id: "depot",
            typ: "depot",
            beschreibung: "Anlagedepot",
            saldoHeute: 0,
            renditeProzent: 1.5,
            istHauptkonto: false,
            // PDF Müller: Umschichtung 100k von Liquid → Depot in 2026.
            // Aufbau persönliche Pensionskasse (Sparphase-Pattern).
            umschichtungen: [
              { id: "u1", jahr: 2026, betrag: 100000, richtung: "in" },
            ],
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
            id: "lohn-stephan",
            beschreibung: "Erwerb Stephan",
            personIdx: 1,
            betragMonatlich: 73200 / 12,
            von: "2025-01",
            bis: "2029-02",
          },
        ],
        ausgabenModus: "total",
        // PDF 2025 Total 78'087 − Steuern 13'487 − 3a 3'000 = 61'600.
        // Leben 21'204 + Wohnen 19'200 + Mob 12'520 + Versich 8'676 = 61'600 ✓
        ausgabenTotal: 61600 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 61600 / 12,
        steuernHeute: 13487,
        einkommenHeute: 73200,
        religion: "reformiert",
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
      2030: { saldo: -21027, vermNetto: 327330, stTotal: 9384, einnT: 63609, ausgT: 84636 },
      2035: { saldo: -4394, vermNetto: 319073, stTotal: 11148, einnT: 63609, ausgT: 68003 },
      2040: { saldo: -7242, vermNetto: 297365, stTotal: 6864, einnT: 63609, ausgT: 70851 },
      2045: { saldo: -10180, vermNetto: 261842, stTotal: 5054, einnT: 63609, ausgT: 73789 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Müller Stephan ==========");
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
      console.log(
        `  Detail: AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} KapAusz=${Math.round(z.kapAuszahlungen)}`
      );
    }
  });
});
