/**
 * Validierungs-Vergleich — Stomeo Bettina (Ausgangslage).
 * Mission 13 GmbH, 12.01.2026.
 *
 * Spezifika:
 *  - Einzelperson w, verwitwet, evang-reformiert
 *  - geb. 20.02.1962 — Jg 1962 → AHV21-Übergang (Frauen 1961-69)
 *  - Pension Alter 64 + 6 Mt per Ende August 2026
 *  - AHV 26'520 inkl. 13. AHV + Überbrückungszuschlag (Berater-Override)
 *  - Witwenrente 35'904 p.a. läuft schon vor + nach Pension
 *  - BVG ProPublic 100% Rentenbezug: 4'479 p.a. (UWS implizit ~5.92%)
 *  - Eigenheim Teufen AR 700'000, Hypothek 475'000 (Zins 0.49% → 2.0% ab 2030)
 *  - Liquidität 200'100, Depot 83'300 (1.5%), 3b Gem.Vers 54'326
 *  - 3a Police Basler 66'008 → Auszahlung Feb 2026
 *  - 3b Police Basler 1+2 je 30'151 → Auszahlung 2028 (kombiniert modelliert)
 *  - Inflation 1.0%, Rendite 1.5%
 *  - Stichtage Pension+1/+6/+11/+16 = 2027/2032/2037/2042 (Alter 65/70/75/80)
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2026-01-12T12:00:00Z").getTime();
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

describe("Vergleich Stomeo Bettina (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA vs TAXWARE für Stomeo 65/70/75/80", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "verwitwet",
      person1: {
        vorname: "Bettina",
        nachname: "Stomeo",
        geburtsdatum: "1962-02-20",
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
        strasse: "Bächlistrasse 32a",
        plz: "9053",
        ort: "Teufen",
        kanton: "AR",
        gemeindeBfsId: null,
        gemeindeName: "Teufen",
      },
      // Frauen Jg 1962 AHV21: ord-Ref-Alter 64+6Mt = 64.5. Pension Aug 2026.
      ziele: { bezugsalterP1: 64.5, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 20933, // letzter Lohn 2026 anteilig
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 64.5,
        ahvBezugsalterP2: 65,
        // PDF: AHV 26'520 inkl 13. AHV + Witwenrente 35'904 = 62'424 (inkl 13.AHV).
        // Engine-Konvention: Override = 12-Mt-Basis, Engine addiert 13.AHV.
        // 62'424 × 12/13 = 57'622.
        ahvRenteJahrEffektivP1: 57622,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          // BVG-Saldo bei Bezug ≈ 4'479 / 0.0592 ≈ 75'712 (= laut PDF-Bilanz)
          altersguthabenHeute: 75712,
          altersguthabenBeiBezug: 75712,
          umwandlungssatzProzent: 5.92, // 4479 / 75712
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
            id: "3a-basler",
            type: "konto",
            saeule: "3a",
            beschreibung: "3a Police Basler",
            aktuellerWert: 66008,
            auszahlungsjahr: 2026,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: 2026,
            jaehrlicheEinzahlung: 0,
            einzahlungAb: 2026,
            einzahlungBis: 2026,
          },
          {
            id: "3b-basler-kombi",
            type: "versicherung",
            saeule: "3b",
            beschreibung: "3b Police Basler 1+2",
            aktuellerWert: 54326,
            auszahlungsjahr: 2028,
            renditeProzent: 0,
            rueckkaufswert: 54326,
            ablaufswert: 60302, // 2x 30'151
            ablaufjahr: 2028,
            jaehrlicheEinzahlung: 0,
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
            saldoHeute: 200100,
            renditeProzent: 0, // Konto-Typ wird Engine ohnehin nicht verzinst
            istHauptkonto: true,
          },
          {
            id: "depot",
            typ: "depot",
            beschreibung: "Übrige Anlagen",
            saldoHeute: 83300,
            renditeProzent: 1.5,
            istHauptkonto: false,
          },
        ],
      },
      immobilien: {
        items: [
          {
            id: "eh-teufen",
            beschreibung: "Eigenheim Teufen",
            typ: "selbstbewohnt",
            verkehrswert: 700000,
            eigenmietwertProzent: 1.13,
            hypotheken: [
              {
                id: "hypo",
                beschreibung: "Hypothek",
                hoehe: 475000,
                zinssatzProzent: 0.49, // 2'328 / 475'000
                ablaufjahr: 2030,
                refinanzierungZinssatzProzent: 2.0,
                tilgungsplan: [
                  // PDF Ausgangslage: Rückzahlung 150'000 bei Ablauf (2030)
                  { id: "tilg-2030", jahr: 2030, betrag: 150000 },
                ],
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
            id: "lohn-bettina",
            beschreibung: "Erwerb Bettina",
            personIdx: 1,
            betragMonatlich: 20933 / 8, // Jan-Aug 2026
            von: "2026-01",
            bis: "2026-08",
          },
        ],
        ausgabenModus: "total",
        // PDF Total 2026: 60'304 − Steuern 16'361 − 3a 7'056 − Schuldzins 2'328 = 34'559.
        // Lebenshaltung 13'200 + Wohnen-Eigentum 6'000 + Mobilität 4'800
        //   + Versicherungen 10'560 = 34'560 ✓
        ausgabenTotal: 34560 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 34560 / 12,
        steuernHeute: 16361,
        einkommenHeute: 20933,
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

    const reihe = cashflowReihe(state, 2026, 2050);

    const taxware: Record<
      number,
      { saldo: number; vermNetto: number; stTotal: number; einnT: number; ausgT: number }
    > = {
      2027: { saldo: 14703, vermNetto: 673791, stTotal: 14966, einnT: 66903, ausgT: 52199 },
      2032: { saldo: 11321, vermNetto: 742180, stTotal: 12396, einnT: 66903, ausgT: 55582 },
      2037: { saldo: 9223, vermNetto: 799637, stTotal: 12622, einnT: 66903, ausgT: 57679 },
      2042: { saldo: 7062, vermNetto: 846990, stTotal: 12817, einnT: 66903, ausgT: 59841 },
    };

    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Stomeo Bettina ==========");
    for (const jahr of [2027, 2032, 2037, 2042]) {
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
        `  Detail: AHV+Witwe=${Math.round(z.einnahmenAhv)} BVG=${Math.round(z.einnahmenBvgRente)} Haushalt=${Math.round(z.ausgabenHaushalt)} Hypozins=${Math.round(z.ausgabenHypozins)} KapAusz=${Math.round(z.kapAuszahlungen)} EMW=${Math.round(z.eigenmietwertJahr)}`
      );
    }
  });
});
