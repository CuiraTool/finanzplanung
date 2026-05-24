/**
 * Validierungs-Vergleich — Martin Frei (Ausgangslage).
 * Dein Finanzexperte GmbH, 24.11.2025.
 *
 * Spezifika:
 *  - Einzelperson m, ledig, röm-katholisch
 *  - geb. 08.01.1969 — Mann Jg 1969 → 57 in 2026
 *  - SG Widnau, Aegetholzstrasse 1
 *  - Frühpension Alter 56 per Ende Dez 2025 — KEIN Erwerb mehr ab 2026
 *  - AHV NE-Pflicht 2026-2034 (Nichterwerbstätige-Beiträge)
 *  - 100% Kap FZ Raiffeisen 168'951 in 2030 (Pflicht-Auszahlung Alter 70)
 *  - 3a Raiffeisen 64'280 → 68'235 Auszahlung 2031
 *  - AHV ord-Ref 65 = Februar 2034 → AHV 25'688 inkl 13.AHV (12-Mt: 23'712)
 *  - Liegenschafts-Verkauf 1.172M per 2026 (steckt bereits in Test-Input-Bilanz)
 *  - Liquid + "persönliche PK" gesamt 1'179'970 in 2026 (Bilanz)
 *  - Inflation 0.75%, Rendite 3.0%
 *  - Stichtage 57/62/65/69 = 2026/2031/2034/2038
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

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

describe("Vergleich Martin Frei (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Frei 57/62/65/69", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "ledig",
      person1: {
        vorname: "Martin",
        nachname: "Frei",
        geburtsdatum: "1969-01-08",
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
        strasse: "Aegetholzstrasse 1",
        plz: "9443",
        ort: "Widnau",
        kanton: "SG",
        gemeindeBfsId: null,
        gemeindeName: "Widnau",
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
        // AHV 25'688 inkl 13.AHV ab 2034. 12-Mt-Basis: 23'712.
        ahvRenteJahrEffektivP1: 23712,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: false, // kein aktiver PK-Anschluss mehr
          altersguthabenHeute: 0,
          altersguthabenBeiBezug: 0,
          umwandlungssatzProzent: 0,
          bezugspraeferenz: "kapital",
          kapitalanteil: 100,
          // Freizügigkeitskonto Raiffeisen → Pflicht-Auszahlung 2030
          freizuegigkeit: [
            {
              id: "fz-raiffeisen",
              beschreibung: "FZ Raiffeisen",
              saldoHeute: 168951,
              auszahlungsjahr: 2030,
              renditeProzent: 0,
            },
          ],
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
            id: "3a-raiffeisen",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Raiffeisen",
            aktuellerWert: 64280,
            auszahlungsjahr: 2031,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2031,
            jaehrlicheEinzahlung: 0, // keine Einzahlung mehr (kein Erwerb)
            einzahlungAb: 2026,
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
            saldoHeute: 160000,
            renditeProzent: 0,
            istHauptkonto: true,
          },
          {
            id: "depot-pk",
            typ: "depot",
            beschreibung: "Persönliche Pensionskasse",
            saldoHeute: 1020000, // 1.172M Verkaufserlös − 160k Liquid − 50k Auto
            renditeProzent: 3.0,
            istHauptkonto: false,
          },
        ],
      },
      immobilien: { items: [] }, // verkauft per Jan 2026
      firma: {
        vorhanden: false,
        firmenname: "",
        moeglicherVerkaufserloes: null,
        plan: "behalten",
        verkaufsjahr: 2035,
      },
      budget: {
        einkommen: [], // kein Erwerb ab 2026
        ausgabenModus: "total",
        // PDF 2026: 102'030 − Steuern 5'000 − AHV-NE 530 = 96'500.
        // Lebenshalt 57'500 + Wohnen 18'000 + Mob 6'000 + Vers 9'000 + Diverse 6'000 = 96'500.
        ausgabenTotal: 96500 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 96500 / 12,
        steuernHeute: 5000,
        einkommenHeute: 0,
        religion: "katholisch",
        alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
        inflationProzent: 0.75,
      },
      einmaligeAusgaben: [
        { id: "auto-2026", jahr: 2026, betrag: 50000, beschreibung: "Auto" },
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

    const taxware: Record<
      number,
      { saldo: number; vermNetto: number; stTotal: number; einnT: number; ausgT: number }
    > = {
      2026: { saldo: -102030, vermNetto: 1413844, stTotal: 5000, einnT: 0, ausgT: 102030 },
      2031: { saldo: -108497, vermNetto: 996188, stTotal: 6309, einnT: 0, ausgT: 108497 },
      2034: { saldo: -106308, vermNetto: 831867, stTotal: 2824, einnT: 0, ausgT: 106308 },
      2038: { saldo: -83880, vermNetto: 505938, stTotal: 4016, einnT: 25688, ausgT: 109568 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Frei ==========");
    for (const jahr of [2026, 2031, 2034, 2038]) {
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
