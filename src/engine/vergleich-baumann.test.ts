/**
 * Validierungs-Vergleich — Baumann Alexandra (Ausgangslage).
 * Secure Invest AG, 03.05.2024.
 *
 * Spezifika:
 *  - Einzelperson w, geschieden, andere Konf, BL Arlesheim
 *  - geb 15.09.1968, Pension Alter 65 = Sep 2033
 *  - AHV 22'428 (Annahme niedriger - vermutlich Lücken)
 *  - 100% Rente PK Abendrot 59'041 (hoch)
 *  - Mieterin (Wohnen 30'000)
 *  - Freizügigkeitskonto UBS 30'360 (Auszahlung 2031)
 *  - 3a Police Generali 68'336 (Auszahlung 2032)
 *  - Erwerb 66'720 (Teilzeit)
 *  - Mieteinnahmen 10'200 (vermutlich Untermiete)
 *  - Inflation 1.5%, Rendite 1.5%
 *  - Stichtage Pension+1/+5/+10/+15 = 2034/2038/2043/2048
 */
import { describe, it, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2024-05-03T12:00:00Z").getTime();
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

describe("Vergleich Baumann Alexandra (Ausgangslage)", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("druckt CUIRA für Baumann 66/70/75/80", () => {
    const state: CashflowInput = {
      fallart: "einzel",
      zivilstand: "geschieden",
      person1: {
        vorname: "Alexandra",
        nachname: "Baumann",
        geburtsdatum: "1968-09-15",
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
        strasse: "Buchenstrasse 1",
        plz: "4144",
        ort: "Arlesheim",
        kanton: "BL",
        gemeindeBfsId: null,
        gemeindeName: "Arlesheim",
      },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      ahv: {
        einkommenP1: 66720,
        einkommenP2: null,
        hatIkAuszugP1: false,
        hatIkAuszugP2: false,
        hatFehljahreP1: false,
        hatFehljahreP2: false,
        fehljahreAnzahlP1: 0,
        fehljahreAnzahlP2: 0,
        ahvBezugsalterP1: 65,
        ahvBezugsalterP2: 65,
        ahvRenteJahrEffektivP1: 20703,
        ahvRenteJahrEffektivP2: null,
      },
      bvg: {
        p1: {
          aktiverAnschluss: true,
          altersguthabenHeute: 750000,
          altersguthabenBeiBezug: 950000,
          umwandlungssatzProzent: 6.21, // 59041/950000
          bezugspraeferenz: "rente",
          kapitalanteil: 0,
          freizuegigkeit: [
            {
              id: "fz-ubs",
              beschreibung: "Freizügigkeitskonto UBS",
              saldoHeute: 28000,
              renditeProzent: 1.5,
              auszahlungsjahr: 2031,
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
            id: "3a-generali",
            type: "versicherung",
            saeule: "3a",
            beschreibung: "3a Police Generali",
            aktuellerWert: 50000,
            auszahlungsjahr: 2032,
            renditeProzent: 0,
            rueckkaufswert: 50000,
            ablaufswert: 68336,
            ablaufjahr: 2032,
            jaehrlicheEinzahlung: 3600,
            einzahlungAb: 2024,
            einzahlungBis: 2031,
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
            betragMonatlich: 66720 / 12,
            von: "2024-01",
            bis: "2033-09",
          },
        ],
        ausgabenModus: "total",
        // 75'619 − Steuern 11'819 − 3a 3'600 = 60'200
        // Davon: Leben 8'600 + Wohnen 36'000 + Mob 5'100 + Versich 9'000 + Div 1'500 = 60'200
        ausgabenTotal: 60200 / 12,
        ausgabenKategorien: {
          lebenshaltung: null,
          wohnen: null,
          mobilitaet: null,
          versicherungen: null,
          ferienHobby: null,
          sonstiges: null,
        },
        wunschverbrauchPension: 60200 / 12,
        steuernHeute: 11819,
        einkommenHeute: 66720,
        religion: "andere",
        alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
        inflationProzent: 1.5,
      },
      einmaligeAusgaben: [],
      laufendeAusgaben: [
        // Mieteinnahmen 10'200 PDF — modelliert als negative Ausgabe (kein Eigenheim,
        // Untermiete/WG nicht modellierbar mit Engine-Standard). Vereinfacht.
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

    const reihe = cashflowReihe(state, 2024, 2050);
    const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

    console.log("\n========== CHECKPOINT Baumann Alexandra (CUIRA only) ==========");
    for (const jahr of [2034, 2038, 2043, 2048]) {
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
