/**
 * Validierungs-Vergleich — Kunz Urs (Ausgangslage).
 * Mission 13 GmbH, 28.10.2024.
 *
 * Spezifika:
 *  - Einzelperson m, ledig, ev-ref, SG Zuzwil
 *  - geb 10.04.1968, Pension Alter 65 = April 2033
 *  - **IV-Rente bereits laufend** (vor AHV-Alter)
 *    - 1. Säule IV: 7'440 p.a.
 *    - 2. Säule IV: 36'876 p.a.
 *  - Teilzeit-Erwerb 82'758 (mit IV)
 *  - AHV ab Pension Alter 65 → 100% Kapitalbezug PK aktiver Teil (~800k)
 *  - 3a Konto ZKB 105'379 (2031), 3a VIAC 80'836 (2032), 3a NEU 28'937 (2033)
 *  - Mieter (Wohnen 24'000)
 *  - Inflation 1.5%
 *  - Stichtage Heute 2024 + Pension+1/+5/+10 = 2034/2038/2043
 *
 * **Engine-Limit:** IV-Rente vor AHV-Alter wird Engine als "AHV-Override"
 *   modelliert mit bezugsalter < heute. Engine erkennt das nicht voll →
 *   Drift erwartet bei AHV-Komponente.
 *   Workaround: IV-Renten als "einkommen" mit personIdx 1 (AHV-pflichtig
 *   was falsch ist) — kleine Drift bei AHV-Beiträgen.
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

describe("Vergleich Kunz Urs (Ausgangslage) — IV-Rente Workaround", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA für Kunz Heute/65/70/75", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "ledig",
      person1: {
        vorname: "Urs",
        nachname: "Kunz",
        geburtsdatum: "1968-04-10",
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
        strasse: "Alpsteinstrasse 15",
        plz: "9524",
        ort: "Zuzwil",
        kanton: "SG",
        gemeindeBfsId: 3426,
        gemeindeName: "Zuzwil",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 82758,
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        // PDF AHV nach Pension 2033 = Annahme 25'430 (IV-AHV-Umwandlung).
        ahvRenteJahrEffektivP1: 23474, // 25'430 × 12/13
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 484585,
          altersguthabenBeiBezug: 800829,
          umwandlungssatzProzent: 6.0,
          bezugspraeferenz: "kapital",
          kapitalanteil: 100,
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
            id: "3a-zkb",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a ZKB",
            aktuellerWert: 80000,
            auszahlungsjahr: 2031,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2031,
            jaehrlicheEinzahlung: 7056,
            einzahlungAb: 2024,
            einzahlungBis: 2031,
          },
          {
            id: "3a-viac",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a VIAC",
            aktuellerWert: 49926,
            auszahlungsjahr: 2032,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2032,
            jaehrlicheEinzahlung: 7056,
            einzahlungAb: 2024,
            einzahlungBis: 2032,
          },
          {
            id: "3a-neu",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a NEU",
            aktuellerWert: 0,
            auszahlungsjahr: 2033,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2033,
            jaehrlicheEinzahlung: 7056,
            einzahlungAb: 2033,
            einzahlungBis: 2033,
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
            saldoHeute: 67900,
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
            betragMonatlich: 82758 / 12,
            von: "2024-01",
            bis: "2033-04",
          },
          {
            // IV-Renten als Einkommen modelliert — Engine zieht AHV (falsch),
            // aber gibt Cashflow korrekt wieder. Drift bei AHV-Beiträgen.
            id: "iv",
            beschreibung: "IV-Renten (1. + 2. Säule)",
            personIdx: 1,
            betragMonatlich: 44316 / 12, // 7440 + 36876
            von: "2024-01",
            bis: "2033-04",
          },
        ],
        ausgabenModus: "total",
        // 89'856 − Steuern 21'600 − 3a 7'056 = 61'200
        ausgabenTotal: 61200 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 61200 / 12,
        steuernHeute: 21600,
        einkommenHeute: 127074, // 82758 + 7440 + 36876
        religion: "reformiert",
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

    const reihe = cashflowReihe(state, 2024, 2050);
    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    // PDF Werte aus Mission 13 28.10.2024 (Kunz Ausgangslage)
    const pdf: Record<number, any> = {
      2024: { einn: 127074, ausg: 89856, saldo: 37218, verm: 682411, steuern: 21600 },
      2033: { einn: 64392, ausg: 88234, saldo: -23842, verm: 245788, steuern: 5896 },
      2038: { einn: 64392, ausg: 90756, saldo: -26364, verm: 142536, steuern: 5896 },
    };

    console.log("\n========== CHECKPOINT Kunz Urs (IV-Rente Workaround) ==========");
    for (const jahr of [2024, 2033, 2038]) {
      const z = reihe.find((r) => r.jahr === jahr);
      if (!z) continue;
      const p = pdf[jahr]!;
      const d = (cuira: number, tax: number) => {
        const diff = Math.round(cuira - tax);
        const pct = tax !== 0 ? ((diff / Math.abs(tax)) * 100).toFixed(1) + "%" : "–";
        return `${f(Math.round(cuira))} | ${f(tax)} | Δ ${f(diff)} (${pct})`;
      };
      console.log(`\n── ${jahr} (Alter P1 ${z.alterP1}) ──`);
      console.log(`  Einnahmen total : ${d(z.einnahmenTotal, p.einn)}`);
      console.log(`  Ausgaben total  : ${d(z.ausgabenTotal, p.ausg)}`);
      console.log(`  Saldo           : ${d(z.saldo, p.saldo)}`);
      console.log(`  Vermögen netto  : ${d(z.vermoegenNetto, p.verm)}`);
      console.log(`  Steuern total   : ${d(z.ausgabenSteuern, p.steuern)}`);
      console.log(
        `  Detail: Erwerb=${Math.round(z.einnahmenErwerb)} AHV=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} KapAusz=${Math.round(z.kapAuszahlungen)}`
      );
    }
  });
});
