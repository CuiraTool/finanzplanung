/**
 * Regressionstest: Erwerbsende der Zweitperson darf nicht zu höherer Steuer
 * im Folgejahr führen (Monotonie-Check).
 *
 * Bug-Beobachtung (Fall Stanojevic):
 *  - 2026: Mili 62'000 + Dusica 16'800 (Jan-Jun) → Einkommen 78'800
 *  - 2027: nur Mili 62'000
 *  - Engine zeigte: 2026 = 4'880 Steuer, 2027 = 6'961 — non-monoton.
 *
 * Root Cause: cashflow.ts L329-337 fiel auf `state.ahv.einkommenP2` zurück
 * sobald `erwerbP2Roh = 0`. Das contaminate `bruttoErwerbP2` selbst nach
 * Erwerbsende → Doppelverdienerabzug griff weiter, Berufsauslagen P2
 * blieben, 3a-Cap für P2 stieg → steuerbares Einkommen sprang nach oben.
 *
 * Fix: Fallback nur wenn KEINE Erwerbsperioden für die Person existieren.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "./cashflow";
import type { CashflowInput } from "./cashflow";

function basePaar(): CashflowInput {
  return {
    fallart: "paar",
    zivilstand: "verheiratet",
    person1: {
      vorname: "Milivoje",
      nachname: "Stanojevic",
      geburtsdatum: "1963-05-25",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Dusica",
      nachname: "Stanojevic",
      geburtsdatum: "1968-06-08",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    kinder: [],
    adresse: {
      strasse: "",
      plz: "9104",
      ort: "Waldstatt",
      kanton: "AR",
      gemeindeBfsId: null,
      gemeindeName: "Waldstatt",
    },
    ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
    ahv: {
      einkommenP1: 62_000,
      einkommenP2: 33_600, // Historisch / AHV-relevant — NICHT Current
      hatIkAuszugP1: false,
      hatIkAuszugP2: false,
      hatFehljahreP1: false,
      hatFehljahreP2: false,
      fehljahreAnzahlP1: 0,
      fehljahreAnzahlP2: 0,
      ahvBezugsalterP1: 65,
      ahvBezugsalterP2: 65,
      ahvRenteJahrEffektivP1: null,
      ahvRenteJahrEffektivP2: null,
    },
    bvg: {
      p1: {
        aktiverAnschluss: true,
        altersguthabenHeute: 100_000,
        altersguthabenBeiBezug: 150_000,
        umwandlungssatzProzent: 5.5,
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
        umwandlungssatzProzent: 5.5,
        bezugspraeferenz: "kapital",
        kapitalanteil: 100,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
    },
    saeuleDrei: { p1: [], p2: [] },
    vermoegen: {
      items: [
        {
          id: "hk",
          typ: "konto",
          beschreibung: "Hauptkonto",
          saldoHeute: 50_000,
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
      verkaufsjahr: 2050,
    },
    budget: {
      einkommen: [
        {
          id: "lohn-mili",
          beschreibung: "Erwerb Mili",
          personIdx: 1,
          betragMonatlich: 62_000 / 12,
          von: "2025-01",
          bis: "2028-05",
        },
        {
          id: "lohn-dusica",
          beschreibung: "Erwerb Dusica (endet Jun 2026)",
          personIdx: 2,
          betragMonatlich: 33_600 / 12,
          von: "2025-01",
          bis: "2026-06",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 5_000,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 5_000,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "andere",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    einmaligeAusgaben: [],
  };
}

describe("Cashflow — Erwerbsende Zweitperson (Regression Stanojevic)", () => {
  it("Monotonie: Einkommenssteuer 2027 (nach P2-Erwerbsende) ≤ 2026", () => {
    const state = basePaar();
    const reihe = cashflowReihe(state, 2026, 2028);
    const z26 = reihe.find((z) => z.jahr === 2026)!;
    const z27 = reihe.find((z) => z.jahr === 2027)!;

    // 2026: beide Personen mit Einkommen (Mili voll + Dusica Jan-Jun)
    // 2027: nur Mili → weniger Einkommen → muss weniger oder gleich Steuer sein
    expect(z26.einnahmenErwerb).toBeGreaterThan(z27.einnahmenErwerb);
    expect(z27.ausgabenSteuernEinkommen).toBeLessThanOrEqual(
      z26.ausgabenSteuernEinkommen
    );
  });

  it("Nach Erwerbsende P2: kein Doppelverdienerabzug mehr (DBG ddv = 0)", () => {
    const state = basePaar();
    const reihe = cashflowReihe(state, 2026, 2028);
    const z27 = reihe.find((z) => z.jahr === 2027)!;
    // Sanity: 2027 reports DDV via cashflow proxy ist nicht direkt sichtbar,
    // aber das steuerbare Einkommen darf nicht > 2026 sein
    expect(z27.ausgabenSteuernEinkommen).toBeLessThanOrEqual(
      reihe.find((z) => z.jahr === 2026)!.ausgabenSteuernEinkommen
    );
  });

  it("Mit Erwerbsperioden überschreibt explizites 0 die AHV-Fallback-Logik", () => {
    // Wenn nur Mili Perioden hat (Dusica gar keine), greift Fallback weiter.
    // Wenn Dusica Perioden hat aber 2027 = 0 (Periode endete), KEIN Fallback.
    const mit = basePaar();
    const ohnePerioden = basePaar();
    // Dusica's Perioden entfernen, sodass Fallback aktiv ist
    ohnePerioden.budget.einkommen = ohnePerioden.budget.einkommen.filter(
      (p) => p.personIdx !== 2
    );

    const z27Mit = cashflowReihe(mit, 2027, 2027)[0]!;
    const z27Ohne = cashflowReihe(ohnePerioden, 2027, 2027)[0]!;

    // "Mit Perioden, aber 2027 leer" muss WENIGER Steuer haben als
    // "Ohne Perioden → Fallback auf 33'600": dort wird Dusica fiktiv
    // weiterhin als erwerbstätig gerechnet → höhere Steuer.
    expect(z27Mit.ausgabenSteuernEinkommen).toBeLessThan(
      z27Ohne.ausgabenSteuernEinkommen
    );
  });
});
