/**
 * Validierungs-Vergleich — Sciarrino Patrizia (Ausgangslage).
 * Mission 13 GmbH, 28.10.2024.
 *
 * Spezifika:
 *  - Einzelperson w, geschieden, andere Konf, SG Zuzwil
 *  - geb 21.04.1962 → AHV21-Übergang Jg 1962 Frau, ord-Ref 64+6Mt = 64.5
 *  - Pension Okt 2026 (Alter 64.5)
 *  - AHV 24'948 → 12-Mt-Basis = 23'029
 *  - 100% Rente SGPK 24'402
 *  - Mieterin (Wohnen 9'600)
 *  - 3a SGKB 72'111 (Auszahlung 2026, Einz 2024-2026)
 *  - Erwerb 68'514 bis Okt 2026
 *  - Inflation 1.5%
 *  - Stichtage Pension+1/+5/+10/+15 = 2027/2031/2036/2041
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2024-10-28T12:00:00Z").getTime();
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

describe("Vergleich Sciarrino Patrizia (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA für Sciarrino 65/69/74/79", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "geschieden",
      person1: {
        vorname: "Patrizia",
        nachname: "Sciarrino",
        geburtsdatum: "1962-04-21",
        geschlecht: "w",
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
        strasse: "Alpsteinstrasse 15",
        plz: "9524",
        ort: "Zuzwil",
        kanton: "SG",
        gemeindeBfsId: null,
        gemeindeName: "Zuzwil",
      },
      ziele: { bezugsalterP1: 64.5, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 68514,
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 64.5,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 64.5,
        ahvBezugsalterP2: 65,
        ahvRenteJahrEffektivP1: 23029,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 430000,
          altersguthabenBeiBezug: 440000,
          umwandlungssatzProzent: 5.55, // 24402/440000
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
            id: "3a-sgkb",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a SGKB",
            aktuellerWert: 50000,
            auszahlungsjahr: 2026,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2026,
            jaehrlicheEinzahlung: 7056,
            einzahlungAb: 2024,
            einzahlungBis: 2026,
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
            saldoHeute: 10000,
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
            id: "lohn",
            beschreibung: "Erwerb",
            personIdx: 1,
            betragMonatlich: 68514 / 10,
            von: "2024-01",
            bis: "2026-10",
          },
        ],
        ausgabenModus: "total",
        // 61'056 − Steuern 8'400 − 3a 7'056 = 45'600
        ausgabenTotal: 45600 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 45600 / 12,
        steuernHeute: 8400,
        einkommenHeute: 68514,
        religion: "andere",
        alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
        inflationProzent: 1.5,
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

    const reihe = cashflowReihe(state, 2024, 2045);
    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Sciarrino Patrizia (CUIRA only) ==========");
    for (const jahr of [2027, 2031, 2036, 2041]) {
      const z = reihe.find((r) => r.jahr === jahr);
      if (!z) continue;
      console.log(`\n── ${jahr} (Alter P1 ${z.alterP1}) ──`);
      console.log(`  Einnahmen total : ${f(Math.round(z.einnahmenTotal))}`);
      console.log(`  Ausgaben total  : ${f(Math.round(z.ausgabenTotal))}`);
      console.log(`  Saldo           : ${f(Math.round(z.saldo))}`);
      console.log(`  Vermögen netto  : ${f(Math.round(z.vermoegenNetto))}`);
      console.log(`  Steuern total   : ${f(Math.round(z.ausgabenSteuern))}`);
      console.log(
        `    └ Eink-St=${Math.round(z.ausgabenSteuernEinkommen)} Verm-St=${Math.round(z.ausgabenSteuernVermoegen)} Kap-St=${Math.round(z.ausgabenSteuernKapital)}`
      );
      console.log(
        `  Detail: AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} KapAusz=${Math.round(z.kapAuszahlungen)}`
      );
    }
  });
});
