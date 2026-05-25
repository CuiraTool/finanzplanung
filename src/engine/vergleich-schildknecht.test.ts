/**
 * Validierungs-Vergleich — Schildknecht Robert + Nguyen (Ausgangslage).
 * Combinvest AG, 19.05.2026.
 *
 * Spezifika:
 *  - Paar verheiratet, AG Wettingen (neuer Kanton!)
 *  - Robert geb 25.03.1962 (m, kath), Nguyen Hoai Ngoc Dung geb 25.03.1981 (w, andere)
 *  - **19 Jahre Altersabstand**
 *  - Robert Pension März 2027 (Alter 65)
 *  - Nguyen Pension März 2046 (Alter 65)
 *  - AHV Robert 29'614 (single)
 *  - 100% Kapitalbezug PK Robert: Transparenta 139'092 + FZ Liberty 173'271 + UBS 23'887
 *  - PK Aargauische 3'509 Rente (klein)
 *  - 3a UBS 36'022 + Liberty 28'109 + UBS 22'009 + Generali 100'000 = 186k
 *  - Mieter (Wohnen 30'000)
 *  - Erwerb Robert 122'000 bis 2027-03, Nguyen 30'000 weiter
 *  - Saldo 2026 = -6'590 (negativ)
 *  - Inflation 1.0%
 *  - Stichtage Robert+1/+5/+10/+15 = 2028/2032/2037/2042
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2026-05-19T12:00:00Z").getTime();
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

describe("Vergleich Schildknecht Robert+Nguyen (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA für Schildknecht 66/70/75/80", () => {
    const state: CashflowInput = {
      fallart: "paar",
      zivilstand: "verheiratet",
      person1: {
        vorname: "Robert",
        nachname: "Schildknecht",
        geburtsdatum: "1962-03-25",
        geschlecht: "m",
        telefon: "",
        email: "",
      },
      person2: {
        vorname: "Hoai Ngoc Dung",
        nachname: "Nguyen",
        geburtsdatum: "1981-03-25",
        geschlecht: "w",
        telefon: "",
        email: "",
      },
      kinder: [],
      adresse: {
        strasse: "Aeschstrasse 23",
        plz: "5430",
        ort: "Wettingen",
        kanton: "AG",
        gemeindeBfsId: null,
        gemeindeName: "Wettingen",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 122000,
        einkommenP2: 30000,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        ahvRenteJahrEffektivP1: 27336, // 29614 × 12/13
        ahvRenteJahrEffektivP2: 30240,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 309224,
          // PK Saldo bei Bezug: Transparenta + FZ Liberty + UBS = ~336'250
          altersguthabenBeiBezug: 336250,
          umwandlungssatzProzent: 1.04, // PK Aarg 3'509 / 336'250
          bezugspraeferenz: "kapital",
          kapitalanteil: 100,
          freizuegigkeit: [
            {
              id: "fz-liberty",
              beschreibung: "FZ Liberty",
              saldoHeute: 170000,
              renditeProzent: 1.5,
              auszahlungsjahr: 2026,
            },
            {
              id: "fz-ubs",
              beschreibung: "FZ UBS",
              saldoHeute: 22000,
              renditeProzent: 1.5,
              auszahlungsjahr: 2026,
            },
          ],
          einkaeufe: [],
          wefVorbezuege: [],
        },
        p2: {
          aktiverAnschluss: true,
          altersguthabenHeute: 5000,
          altersguthabenBeiBezug: 90000,
          umwandlungssatzProzent: 6.0,
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
            id: "3a-ubs-r",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a UBS Robert",
            aktuellerWert: 30000,
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
            id: "3a-liberty",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Liberty Robert",
            aktuellerWert: 26000,
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
            id: "3a-ubs-2",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a UBS Robert 2",
            aktuellerWert: 14000,
            auszahlungsjahr: 2027,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2027,
            jaehrlicheEinzahlung: 7258,
            einzahlungAb: 2026,
            einzahlungBis: 2027,
          },
          {
            id: "3a-generali",
            type: "versicherung",
            saeule: "3a",
            beschreibung: "3a Generali Police",
            aktuellerWert: 80000,
            auszahlungsjahr: 2027,
            renditeProzent: 0,
            rueckkaufswert: 80000,
            ablaufswert: 100000,
            ablaufjahr: 2027,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2026,
            einzahlungBis: 2027,
          },
        ],
        p2: [
          {
            id: "3a-fz-pk-nguyen",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Frau Nguyen (PK-Anteil)",
            aktuellerWert: 0,
            auszahlungsjahr: 2046,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2046,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2026,
            einzahlungBis: 2046,
          },
        ],
      },
      vermoegen: {
        items: [
          {
            id: "hk",
            typ: "konto",
            beschreibung: "Liquidität",
            saldoHeute: 30000,
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
            id: "lohn-r",
            beschreibung: "Erwerb Robert",
            personIdx: 1,
            betragMonatlich: 122000 / 12,
            von: "2025-01",
            bis: "2027-03",
          },
          {
            id: "lohn-n",
            beschreibung: "Erwerb Nguyen",
            personIdx: 2,
            betragMonatlich: 30000 / 12,
            von: "2025-01",
            bis: "2046-03",
          },
        ],
        ausgabenModus: "total",
        // 162'099 − Steuern 36'353 − 3a 7'258 − Schuldz 3'488 − Amort 8'000 = 107'000
        ausgabenTotal: 107000 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 84000 / 12, // ~ 7'000/Mt laut PDF
        steuernHeute: 36353,
        einkommenHeute: 152000,
        religion: "katholisch",
        alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
        inflationProzent: 1.0,
      },
      einmaligeAusgaben: [
        { id: "auto-2028", jahr: 2028, betrag: 10000, beschreibung: "Auto" },
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

    const reihe = cashflowReihe(state, 2026, 2050);
    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    // PDF Werte aus Combinvest AG 19.05.2026 (Schildknecht Ausgangslage)
    const pdf: Record<number, any> = {
      2026: { einn: 155509, ausg: 162099, saldo: -6590, verm: 508060, steuern: 36353 },
      2027: { einn: 86220, ausg: 161017, saldo: -74797, verm: 463863, steuern: 35073 },
      2032: { einn: 63123, ausg: 84119, saldo: -20996, verm: 397744, steuern: 3975 },
      2037: { einn: 63123, ausg: 87089, saldo: -23966, verm: 337971, steuern: 3690 },
      2042: { einn: 63123, ausg: 91893, saldo: -28770, verm: 209871, steuern: 3363 },
    };

    console.log("\n========== CHECKPOINT Schildknecht ==========");
    for (const jahr of [2026, 2027, 2032, 2037, 2042]) {
      const z = reihe.find((r) => r.jahr === jahr);
      if (!z) continue;
      const p = pdf[jahr]!;
      const d = (cuira: number, tax: number) => {
        const diff = Math.round(cuira - tax);
        const pct = tax !== 0 ? ((diff / Math.abs(tax)) * 100).toFixed(1) + "%" : "–";
        return `${f(Math.round(cuira))} | ${f(tax)} | Δ ${f(diff)} (${pct})`;
      };
      console.log(`\n── ${jahr} (Alter P1 ${z.alterP1}/P2 ${z.alterP2}) ──`);
      console.log(`  Einnahmen total : ${d(z.einnahmenTotal, p.einn)}`);
      console.log(`  Ausgaben total  : ${d(z.ausgabenTotal, p.ausg)}`);
      console.log(`  Saldo           : ${d(z.saldo, p.saldo)}`);
      console.log(`  Vermögen netto  : ${d(z.vermoegenNetto, p.verm)}`);
      console.log(`  Steuern total   : ${d(z.ausgabenSteuern, p.steuern)}`);
      console.log(
        `    └ Eink-St=${Math.round(z.ausgabenSteuernEinkommen)} Verm-St=${Math.round(z.ausgabenSteuernVermoegen)} Kap-St=${Math.round(z.ausgabenSteuernKapital)}`
      );
      console.log(
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} KapAusz=${Math.round(z.kapAuszahlungen)}`
      );
    }
  });
});
