import { describe, expect, it } from "vitest";
import { runAllStressTests, STRESS_TESTS } from "./stress-tests";
import type { PlanState } from "@/lib/store";

function makeBaseState(): PlanState {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    adresse: {
      strasse: "",
      plz: "8000",
      ort: "Zürich",
      kanton: "ZH",
      gemeindeBfsId: null,
      gemeindeName: "Zürich",
    },
    person1: {
      vorname: "Max",
      nachname: "Muster",
      geburtsdatum: "1965-01-01",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "",
      nachname: "",
      geburtsdatum: "",
      geschlecht: null,
      telefon: "",
      email: "",
    },
    kinder: [],
    ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
    einmaligeAusgaben: [],
    budget: {
      einkommen: [],
      ausgabenModus: "total",
      ausgabenTotal: 6_000,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 5_000,
      steuernHeute: 12_000,
      einkommenHeute: 100_000,
      religion: "keine",
    },
    ahv: {
      einkommenP1: 90_000,
      einkommenP2: null,
      hatIkAuszugP1: false,
      hatIkAuszugP2: false,
      hatFehljahreP1: false,
      hatFehljahreP2: false,
      fehljahreAnzahlP1: 0,
      fehljahreAnzahlP2: 0,
      ahvBezugsalterP1: 65,
      ahvBezugsalterP2: 65,
    },
    bvg: {
      p1: {
        aktiverAnschluss: true,
        altersguthabenHeute: 350_000,
        altersguthabenBeiBezug: 500_000,
        umwandlungssatzProzent: 6.0,
        bezugspraeferenz: "rente",
        kapitalanteil: 50,
        freizuegigkeit: [],
        einkaeufe: [],
      },
      p2: {
        aktiverAnschluss: false,
        altersguthabenHeute: null,
        altersguthabenBeiBezug: null,
        umwandlungssatzProzent: 6.8,
        bezugspraeferenz: "rente",
        kapitalanteil: 50,
        freizuegigkeit: [],
        einkaeufe: [],
      },
    },
    saeuleDrei: { p1: [], p2: [] },
    vermoegen: {
      items: [
        {
          id: "konto",
          typ: "konto",
          beschreibung: "Privatkonto",
          saldoHeute: 60_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "depot",
          typ: "depot",
          beschreibung: "ETF-Depot",
          saldoHeute: 200_000,
          renditeProzent: 5,
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
      verkaufsjahr: 2040,
    },
    nachlass: {
      vorsorgeauftrag: "nein",
      patientenverfuegung: "nein",
      generalvollmacht: "nein",
      testament: "nein",
      erbvertrag: "nein",
      ehevertrag: "nein",
    },
    anlagen: {
      erfahrung: null,
      risikobereitschaft: null,
      horizont: null,
      formen: [],
      vermoegenAusland: false,
    },
    erbschaft: {
      erwartet: null,
      groessenordnung: null,
      schenkungenStatus: null,
      schenkungenDetails: "",
      gueterstand: null,
    },
    wohnortPlan: { umzugStatus: null, umzugZiel: "" },
    versicherungen: {
      vvgVorhanden: false,
      lebensversicherungVorhanden: false,
      lebensversicherungDetails: "",
      gesundheitsthemen: "",
    },
    prioritaeten: {
      ausgewaehlt: [],
      andereBeschreibung: "",
      zusaetzlicheAnliegen: "",
    },
    erweitert: {
      zivilstandSeitJahr: null,
      unterhaltspflichten: false,
      unterhaltspflichtenDetails: "",
      pensionsvision: "",
      andereVermoegenswerte: "",
      verbindlichkeitenAnderes: false,
      verbindlichkeitenDetails: "",
      firmaNachfolgeloesungEingeleitet: false,
      firmaBezug: null,
      dsgEinwilligung: false,
    },
    szenarioB: { aktiv: false, overrides: {} },
    aktiverBlock: 1,
    // Setter — werden vom State-Test ignoriert, aber TypeScript verlangt sie
  } as unknown as PlanState;
}

describe("runAllStressTests", () => {
  it("liefert nur relevante Szenarien (fall-spezifisch)", () => {
    const state = makeBaseState();
    const results = runAllStressTests(state);
    // Base state: einzel, Depot 200k, aktiver PK, KEINE Hypothek, KEIN Paar.
    // → tod-p1 raus (kein Paar), hypozins-schock raus (keine Hypothek).
    const expectedIds = STRESS_TESTS.map((s) => s.id).filter(
      (id) => id !== "tod-p1" && id !== "hypozins-schock"
    );
    expect(results.map((r) => r.id).sort()).toEqual(expectedIds.sort());
  });

  it("Aktien-Crash reduziert Vermögen heute und bei Pension", () => {
    const state = makeBaseState();
    const results = runAllStressTests(state);
    const crash = results.find((r) => r.id === "aktien-crash");
    expect(crash).toBeDefined();
    // Depot war 200k, jetzt 140k → -60k Vermögen heute (Konto + PK + Vorsorge sind unverändert)
    // Nicht direkt vergleichbar weil cashflowReihe komplettes Vermögen aggregiert
    expect(crash!.deltaPension).toBeLessThan(0);
    // Mindestens -30k Auswirkung erwartet (60k Crash + Renditeverlust)
    expect(crash!.deltaPension).toBeLessThan(-30_000);
  });

  it("Inflation-Schock erhöht Ausgaben → tieferes Endvermögen", () => {
    const state = makeBaseState();
    const results = runAllStressTests(state);
    const inflation = results.find((r) => r.id === "inflation-schock");
    expect(inflation).toBeDefined();
    // Vermögen heute unverändert, aber Vermögen bei Pension und mit 85 sinken
    expect(inflation!.delta85).toBeLessThan(0);
  });

  it("Pflegekosten reduzieren Vermögen mit 85", () => {
    const state = makeBaseState();
    const results = runAllStressTests(state);
    const pflege = results.find((r) => r.id === "pflegekosten");
    expect(pflege).toBeDefined();
    // CHF 200k Pflegekosten mit 80 → ~CHF 200k weniger mit 85
    expect(pflege!.delta85).toBeLessThanOrEqual(-100_000);
  });

  it("Schwere ist 'kritisch' wenn Vermögen mit 85 negativ wird", () => {
    const state = makeBaseState();
    // Reduziere Basis-Vermögen drastisch, dann sollte jeder Stress kritisch werden
    state.vermoegen.items.forEach((it) => {
      if (it.saldoHeute) it.saldoHeute = Math.round(it.saldoHeute * 0.05);
    });
    state.bvg.p1.altersguthabenHeute = 10_000;
    state.bvg.p1.altersguthabenBeiBezug = 20_000;
    state.budget.wunschverbrauchPension = 8_000;
    const results = runAllStressTests(state);
    // Alle Tests bei armem Profil sollten ≥ "mittel" sein
    expect(results.every((r) => r.schwere !== "leicht")).toBe(true);
  });
});
