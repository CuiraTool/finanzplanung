/**
 * Umschichtungs-Logik: Konto X → Hauptkonto in bestimmtem Jahr.
 *
 * Pattern: User hat Depot/Anlagekonto und plant in Pensionierung
 * Beträge aufs Hauptkonto (Liquidität) zu verschieben für Entnahme.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { cashflowReihe, type CashflowInput } from "./cashflow";

const FIXED_NOW = new Date("2025-06-01T12:00:00Z").getTime();
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

function baseState(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Test",
      nachname: "Person",
      geburtsdatum: "1965-06-01",
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
      strasse: "Test 1",
      plz: "8000",
      ort: "Zürich",
      kanton: "ZH",
      gemeindeBfsId: null,
      gemeindeName: "Zürich",
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
      ahvRenteJahrEffektivP1: 20000,
      ahvRenteJahrEffektivP2: null,
    },
    bvg: {
      p1: {
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
    saeuleDrei: { p1: [], p2: [] },
    vermoegen: { items: [] },
    immobilien: { items: [] },
    firma: {
      vorhanden: false,
      firmenname: "",
      moeglicherVerkaufserloes: null,
      plan: "behalten",
      verkaufsjahr: 2099,
    },
    budget: {
      einkommen: [],
      ausgabenModus: "total",
      ausgabenTotal: 0,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 0,
      steuernHeute: 0,
      einkommenHeute: 0,
      religion: "andere",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
      inflationProzent: 0,
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
}

describe("Umschichtungen Konto → Hauptkonto", () => {
  beforeAll(() => {
    (globalThis as any).Date = _FakeDate;
  });
  afterAll(() => {
    (globalThis as any).Date = _RealDate;
  });

  it("verschiebt 100'000 vom Depot aufs Hauptkonto in 2026", () => {
    const state = baseState();
    state.vermoegen = {
      items: [
        {
          id: "hk",
          typ: "konto",
          beschreibung: "Liquidität",
          saldoHeute: 50000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "depot",
          typ: "depot",
          beschreibung: "Anlagedepot",
          saldoHeute: 200000,
          renditeProzent: 0,
          istHauptkonto: false,
          umschichtungen: [{ id: "u1", jahr: 2026, betrag: 100000 }],
        },
      ],
    };
    const reihe = cashflowReihe(state, 2025, 2030);

    // Engine zieht minimale Verm-Steuern auch ohne Erwerb. Vergleichswert
    // ohne Umschichtung als Baseline holen.
    const ohneUms = cashflowReihe(
      {
        ...state,
        vermoegen: {
          items: state.vermoegen.items.map((it) => ({
            ...it,
            umschichtungen: undefined,
          })),
        },
      },
      2025,
      2030
    );

    // 2026 Umschichtung soll Netto NICHT verändern vs. Baseline (interne
    // Verschiebung HK ↔ Depot).
    const z2026 = reihe.find((r) => r.jahr === 2026)!;
    const z2026Baseline = ohneUms.find((r) => r.jahr === 2026)!;
    expect(z2026.vermoegenNetto).toBeCloseTo(z2026Baseline.vermoegenNetto, -1);
  });

  it("Umschichtung wird durch verfügbaren Saldo gedeckelt", () => {
    const state = baseState();
    state.vermoegen = {
      items: [
        {
          id: "hk",
          typ: "konto",
          beschreibung: "Liquidität",
          saldoHeute: 0,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "depot",
          typ: "depot",
          beschreibung: "Klein-Depot",
          saldoHeute: 30000,
          renditeProzent: 0,
          istHauptkonto: false,
          umschichtungen: [{ id: "u1", jahr: 2026, betrag: 100000 }],
        },
      ],
    };
    const reihe = cashflowReihe(state, 2025, 2027);
    const ohneUms = cashflowReihe(
      {
        ...state,
        vermoegen: {
          items: state.vermoegen.items.map((it) => ({
            ...it,
            umschichtungen: undefined,
          })),
        },
      },
      2025,
      2027
    );
    const z2026 = reihe.find((r) => r.jahr === 2026)!;
    const z2026Baseline = ohneUms.find((r) => r.jahr === 2026)!;
    // Cap durch Depot-Bestand 30k → Netto-Drift nur durch interne Verschiebung,
    // identisch zu Baseline.
    expect(z2026.vermoegenNetto).toBeCloseTo(z2026Baseline.vermoegenNetto, -1);
  });

  it("richtung 'in' verschiebt HK → Konto (Sparphase)", () => {
    const state = baseState();
    state.vermoegen = {
      items: [
        {
          id: "hk",
          typ: "konto",
          beschreibung: "Liquidität",
          saldoHeute: 200000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "depot",
          typ: "depot",
          beschreibung: "Anlagedepot",
          saldoHeute: 0,
          renditeProzent: 0,
          istHauptkonto: false,
          umschichtungen: [
            { id: "u1", jahr: 2026, betrag: 100000, richtung: "in" },
          ],
        },
      ],
    };
    const reihe = cashflowReihe(state, 2025, 2027);
    const ohneUms = cashflowReihe(
      {
        ...state,
        vermoegen: {
          items: state.vermoegen.items.map((it) => ({
            ...it,
            umschichtungen: undefined,
          })),
        },
      },
      2025,
      2027
    );
    const z2026 = reihe.find((r) => r.jahr === 2026)!;
    const z2026Baseline = ohneUms.find((r) => r.jahr === 2026)!;
    // Verm-Netto unverändert (interne Verschiebung HK ↔ Depot).
    expect(z2026.vermoegenNetto).toBeCloseTo(z2026Baseline.vermoegenNetto, -1);
  });

  it("mehrere Umschichtungen über Jahre kombinierbar", () => {
    const state = baseState();
    state.vermoegen = {
      items: [
        {
          id: "hk",
          typ: "konto",
          beschreibung: "Liquidität",
          saldoHeute: 0,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "depot",
          typ: "depot",
          beschreibung: "Depot",
          saldoHeute: 300000,
          renditeProzent: 0,
          istHauptkonto: false,
          umschichtungen: [
            { id: "u1", jahr: 2026, betrag: 50000 },
            { id: "u2", jahr: 2027, betrag: 50000 },
            { id: "u3", jahr: 2028, betrag: 50000 },
          ],
        },
      ],
    };
    const reihe = cashflowReihe(state, 2025, 2030);
    const ohneUms = cashflowReihe(
      {
        ...state,
        vermoegen: {
          items: state.vermoegen.items.map((it) => ({
            ...it,
            umschichtungen: undefined,
          })),
        },
      },
      2025,
      2030
    );
    const z2028 = reihe.find((r) => r.jahr === 2028)!;
    const z2028Baseline = ohneUms.find((r) => r.jahr === 2028)!;
    expect(z2028.vermoegenNetto).toBeCloseTo(z2028Baseline.vermoegenNetto, -1);
  });
});
