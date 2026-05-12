/**
 * Live-Test Fall E: Ehepaar beide bereits pensioniert (Witt-Analog).
 *
 * Profil (Martina + Martin Witt, BE Tramelan):
 *  - Martina geb. 1955-05-20, w → 2026 = 71 J., pensioniert seit 2020 (65)
 *  - Martin  geb. 1957-08-15, m → 2026 = 69 J., pensioniert seit 2022 (65)
 *  - Verheiratet, BE Tramelan
 *  - AHV-Override beide (aus IK-Auszug):
 *      P1 (Martina) 23'000/J ord. Vollrente
 *      P2 (Martin)  24'500/J ord. Vollrente
 *      → Summe 47'500 → Ehepaar-Plafond 45'360 × 13/12 ≈ 49'140 → unter Plafond
 *  - PK P1: bereits in Rente, beiBezug 600'000, UWS 6% → 36'000/J
 *  - PK P2: bereits in Rente, beiBezug 480'000, UWS 6% → 28'800/J
 *  - 3a beide bereits ausgezahlt (Saldo 0)
 *  - Eigenheim BE 950'000, Hypothek 0 (abbezahlt)
 *  - Liquidität 380'000, Depot 200'000 (3%)
 *  - Ausgaben 6'500/Mt = 78'000/J
 *
 * Test-Fokus:
 *  1. Engine läuft ohne NaN/crash bei beiden-pensioniert.
 *  2. einnahmenAhv ab Jahr 1 voll (kein Pro-Rata, da schon vor 2026 begonnen).
 *  3. einnahmenBvgRente beide ab Jahr 1 voll.
 *  4. einnahmenErwerb = 0 (kein Lohn mehr).
 *  5. ausgabenAhvNe = 0 (kein Vor-AHV-Alter-Frühpension).
 *  6. vermoegenVorsorge = 0 (PK bereits ausgezahlt, 3a leer).
 *  7. Reform-2030-Bruchstelle: EMW + Schuldzins entfallen (Hypo=0 ist Edge: kein
 *     Schuldzins-Effekt, EMW dennoch bis 2029 wirksam).
 *  8. AHV-Plafond-Logik: Override-Werte korrekt addiert + 13. AHV draufgerechnet.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";

function buildFallE(): CashflowInput {
  return {
    fallart: "paar",
    zivilstand: "verheiratet",
    person1: {
      vorname: "Martina",
      nachname: "Witt",
      geburtsdatum: "1955-05-20",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Martin",
      nachname: "Witt",
      geburtsdatum: "1957-08-15",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: 0,
      einkommenP2: 0,
      hatIkAuszugP1: true,
      hatIkAuszugP2: true,
      hatFehljahreP1: false,
      hatFehljahreP2: false,
      fehljahreAnzahlP1: 0,
      fehljahreAnzahlP2: 0,
      ahvBezugsalterP1: 65,
      ahvBezugsalterP2: 65,
      ahvRenteJahrEffektivP1: 23_000,
      ahvRenteJahrEffektivP2: 24_500,
    },
    bvg: {
      p1: {
        aktiverAnschluss: true,
        altersguthabenHeute: 0, // bereits in Rente
        altersguthabenBeiBezug: 600_000,
        umwandlungssatzProzent: 6.0,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: {
        aktiverAnschluss: true,
        altersguthabenHeute: 0,
        altersguthabenBeiBezug: 480_000,
        umwandlungssatzProzent: 6.0,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
    },
    saeuleDrei: { p1: [], p2: [] },
    vermoegen: {
      items: [
        {
          id: "liq",
          typ: "konto",
          beschreibung: "Privatkonto + ausgezahltes 3a",
          saldoHeute: 380_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "dep",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 200_000,
          renditeProzent: 3.0,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eh-tra",
          typ: "selbstbewohnt",
          beschreibung: "Eigenheim Tramelan BE (abbezahlt)",
          verkehrswert: 950_000,
          hypotheken: [],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 1990,
          anlagekosten: null,
          wertvermehrendeInvestitionen: null,
          wertsteigerungProzent: 0,
        },
      ],
    },
    firma: {
      vorhanden: false,
      firmenname: "",
      moeglicherVerkaufserloes: null,
      plan: "behalten",
      verkaufsjahr: 2050,
    },
    ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
    budget: {
      einkommen: [],
      ausgabenModus: "total",
      ausgabenTotal: 6_500, // 78k/J
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 6_500,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "reformiert",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "",
      plz: "2720",
      ort: "Tramelan",
      kanton: "BE",
      gemeindeBfsId: null,
      gemeindeName: "Tramelan",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live-Fall E — Ehepaar beide pensioniert (Witt BE)", () => {
  const state = buildFallE();
  const reihe = cashflowReihe(state, 2026, 2045);
  const z2026 = reihe.find((r) => r.jahr === 2026)!;
  const z2029 = reihe.find((r) => r.jahr === 2029)!;
  const z2030 = reihe.find((r) => r.jahr === 2030)!;
  const z2045 = reihe.find((r) => r.jahr === 2045)!;

  it("Cashflow läuft 2026-2045 ohne NaN", () => {
    expect(reihe.length).toBe(20);
    for (const z of reihe) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.ausgabenSteuern)).toBe(true);
      expect(z.ausgabenSteuern).toBeGreaterThanOrEqual(0);
    }
  });

  it("Erwerbseinkommen = 0 ab Jahr 1 (beide pensioniert)", () => {
    expect(z2026.einnahmenErwerb).toBe(0);
    expect(z2045.einnahmenErwerb).toBe(0);
  });

  it("AHV läuft ab Jahr 1: Plafond beißt mit 13. AHV ab 2026 (49'140)", () => {
    // Override-Summe 47'500 × 13/12 ≈ 51'458 > Plafond 49'140 (45'360 × 13/12)
    // → wird auf 49'140 gekappt. 13. AHV nun auch für Pre-2026-Rentner.
    expect(z2026.einnahmenAhv).toBeGreaterThanOrEqual(48_500);
    expect(z2026.einnahmenAhv).toBeLessThanOrEqual(49_500);
  });

  it("PK-Rente läuft ab Jahr 1: P1 36k + P2 28.8k = 64.8k", () => {
    // bvgBezug: saldo × UWS = 600k × 6% = 36k + 480k × 6% = 28.8k = 64.8k
    expect(z2026.einnahmenBvgRente).toBeGreaterThanOrEqual(63_000);
    expect(z2026.einnahmenBvgRente).toBeLessThanOrEqual(66_500);
  });

  it("Keine AHV-NE-Beiträge (kein Vor-AHV-Alter)", () => {
    // Beide bereits 65+ — keine Nichterwerbstätigen-Beiträge
    for (const z of reihe) {
      expect(z.ausgabenAhvNe).toBe(0);
    }
  });

  it("Vorsorge-Vermögen = 0 (PK ausgezahlt, 3a leer)", () => {
    expect(z2026.vermoegenVorsorge).toBe(0);
    expect(z2045.vermoegenVorsorge).toBe(0);
  });

  it("EMW wirkt 2029 (Reform-Phase) → 2030 nicht mehr", () => {
    expect(z2029.eigenmietwertJahr).toBeGreaterThan(0);
    expect(z2030.eigenmietwertJahr).toBe(0);
  });

  it("Schuldzins = 0 (Hypothek abbezahlt)", () => {
    for (const z of reihe) {
      expect(z.ausgabenHypozins).toBe(0);
      expect(z.schuldzinsenAbzug).toBe(0);
    }
  });

  it("Vermögensbilanz 2026: Aktiva ~1'530k (380+200+950), Schulden 0", () => {
    expect(z2026.vermoegenAktiva).toBeGreaterThanOrEqual(1_500_000);
    expect(z2026.vermoegenAktiva).toBeLessThanOrEqual(1_560_000);
    expect(z2026.vermoegenSchulden).toBe(0);
  });

  it("Cashflow-Saldo plausibel: AHV+PK ≈ 114k vs Ausgaben 78k + Steuern", () => {
    // 49.1k AHV + 64.8k PK ≈ 114k Einkommen, 78k Lebensausgaben + Steuern
    expect(z2026.einnahmenTotal).toBeGreaterThanOrEqual(112_000);
    expect(z2026.einnahmenTotal).toBeLessThanOrEqual(118_000);
  });

  it("Vermögen 2045 (nach 20 J.) bleibt positiv", () => {
    // Renten decken Ausgaben weitgehend → Vermögen sollte nicht erodieren
    expect(z2045.vermoegenNetto).toBeGreaterThan(0);
  });

  it("Alter steigt korrekt jahresweise", () => {
    expect(z2026.alterP1).toBe(71); // 2026 - 1955
    expect(z2026.alterP2).toBe(69); // 2026 - 1957
    expect(z2045.alterP1).toBe(90); // 2045 - 1955
    expect(z2045.alterP2).toBe(88); // 2045 - 1957
  });
});
