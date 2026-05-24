/**
 * Validierungs-Vergleich — Schaffer Thorsten + Doris (Ausgangslage).
 * Mission 13 GmbH, 18.03.2026.
 *
 * Spezifika:
 *  - Paar verheiratet, TG Kreuzlingen
 *  - Thorsten geb 31.05.1963 (m, andere Konf) → 62/63 in 2025
 *  - Doris geb 05.09.1962 (w, andere Konf) → 63 in 2025 (AHV21 Jg 1962)
 *  - Pension Thorsten Mai 2028 (Alter 65)
 *  - Pension Doris Apr 2028 (Alter 64.5)
 *  - BVG VSAO Thorsten: 50% Rente 34'641 + 50% Kapital 1'226'119 (Mischbezug)
 *  - DRV Doris (Deutsche Rentenversicherung) 5'040 EUR ab 2029
 *  - BWVA Thorsten 4'536 EUR ab 2030
 *  - AHV-Ehepaarrente 36'900 (12-Mt-Basis: 34'062)
 *  - Mieter (Wohnen 33'600 p.a.)
 *  - 3a Heidelberger 94'000 → 2027 / TKB 56'935 → 2027 / NEU 7'258 → 2028
 *  - Liquidität 15'000, 3b Vers 94'000, BVG Thorsten 1'032'542, 3a 35'161
 *  - Inflation 1.0%
 *  - Stichtage Pension+0/+4/+9/+14 = 2028/2032/2037/2042
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2026-03-18T12:00:00Z").getTime();
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

describe("Vergleich Schaffer Thorsten+Doris (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Schaffer 65/69/74/79", () => {
    const state: CashflowInput = {
      fallart: "paar",
      zivilstand: "verheiratet",
      person1: {
        vorname: "Thorsten",
        nachname: "Schaffer",
        geburtsdatum: "1963-05-31",
        geschlecht: "m",
        telefon: "",
        email: "",
      },
      person2: {
        vorname: "Doris",
        nachname: "Schaffer",
        geburtsdatum: "1962-09-05",
        geschlecht: "w",
        telefon: "",
        email: "",
      },
      kinder: [],
      adresse: {
        strasse: "Besmerstrasse 50a",
        plz: "8280",
        ort: "Kreuzlingen",
        kanton: "TG",
        gemeindeBfsId: null,
        gemeindeName: "Kreuzlingen",
      },
      // Thorsten 65, Doris 64.5 (Frauen Jg 1962 AHV21).
      ziele: { bezugsalterP1: 65, bezugsalterP2: 64.5 },
      ahv: {
        einkommenP1: 155292,
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 64.5,
        // AHV-Ehepaar 36'900 inkl 13.AHV. 12-Mt-Basis: 34'062. Hälftig.
        ahvRenteJahrEffektivP1: 17031,
        ahvRenteJahrEffektivP2: 17031,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 1032542,
          // 50% Rente + 50% Kap. Bei Bezug 2028 Saldo ~2'452'238 (= 2×1'226'119).
          // 50% Rente UWS implizit: 34'641 / 1'226'119 = 2.825% (auf Halbierten).
          // Modelliert als bezugspraeferenz="mischung", kapitalanteil=50, UWS auf Halbiertem.
          // Vereinfachung: UWS auf vollem AGB = 34'641 / 2'452'238 = 1.41%.
          altersguthabenBeiBezug: 2452238,
          umwandlungssatzProzent: 2.83, // 34641 / (2452238 × 0.5)
          bezugspraeferenz: "mischung",
          kapitalanteil: 50,
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
            id: "3a-heidelberger",
            type: "konto",
            saeule: "3a",
            beschreibung: "Heidelberger Leben",
            aktuellerWert: 94000,
            auszahlungsjahr: 2027,
            renditeProzent: 0,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2027,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2025,
            einzahlungBis: 2027,
          },
          {
            id: "3a-tkb",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a TKB",
            aktuellerWert: 35161,
            auszahlungsjahr: 2027,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2027,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2025,
            einzahlungBis: 2027,
          },
          {
            id: "3a-neu",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a NEU",
            aktuellerWert: 0,
            auszahlungsjahr: 2028,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2028,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2028,
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
            saldoHeute: 15000,
            renditeProzent: 0,
            istHauptkonto: true,
          },
          {
            id: "3b-vers",
            typ: "depot",
            beschreibung: "3b Gem.Versicherung",
            saldoHeute: 94000,
            renditeProzent: 0,
            istHauptkonto: false,
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
            id: "lohn-thorsten",
            beschreibung: "Erwerb Thorsten",
            personIdx: 1,
            betragMonatlich: 155292 / 12,
            von: "2025-01",
            bis: "2028-05",
          },
        ],
        ausgabenModus: "total",
        // PDF 2025: 139'185 − Steuern 20'927 − 3a 7'258 = 111'000.
        ausgabenTotal: 111000 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 111000 / 12,
        steuernHeute: 20927,
        einkommenHeute: 155292,
        religion: "andere",
        alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
        inflationProzent: 1.0,
      },
      einmaligeAusgaben: [],
      laufendeAusgaben: [
        // DRV Doris ab 2029, 5040 EUR ≈ 5040 CHF
        // BWVA Thorsten ab 2030, 4536 EUR ≈ 4536 CHF
        // Modelliert als negative Ausgabe oder besser als Erwerb? Lassen wir
        // erstmal weg — Engine-Drift dokumentiert separat.
      ],
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
      2028: { saldo: -74623, vermNetto: 768551, stTotal: 68117, einnT: 113425, ausgT: 188048 },
      2032: { saldo: -32842, vermNetto: 661919, stTotal: 9371, einnT: 81117, ausgT: 113959 },
      2037: { saldo: -34986, vermNetto: 528922, stTotal: 8874, einnT: 81117, ausgT: 116103 },
      2042: { saldo: -36973, vermNetto: 375780, stTotal: 8153, einnT: 81117, ausgT: 118090 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Schaffer ==========");
    for (const jahr of [2028, 2032, 2037, 2042]) {
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
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} KapAusz=${Math.round(z.kapAuszahlungen)}`
      );
    }
  });
});
