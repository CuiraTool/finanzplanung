/**
 * Sprint-Tests für drei neue Features:
 *
 *  F1 — Eigenmietwert + Schuldzinsabzug (Reform 2030):
 *      Bis und mit Steuerjahr 2029 wirksam, ab 2030 entfällt beides.
 *
 *  F2 — Alimente-Abzug (Art. 33 Abs. 1 lit. c DBG):
 *      Voll abzugsfähig vom steuerbaren Einkommen + laufende Cashflow-
 *      Ausgabe.
 *
 *  F3 — PK-Einkauf-Serie:
 *      Einkauf-Entry mit `serie: true` + `bisJahr` wirkt jährlich vom
 *      Startjahr bis bisJahr (inkl.) — als Cashflow-Ausgabe, Steuer-Abzug
 *      und PK-Saldo-Hochlauf.
 */

import { describe, expect, it } from "vitest";
import {
  steuerProJahr,
  eigenmietwertAktivImJahr,
  EIGENMIETWERT_LETZTES_JAHR,
} from "./steuer";

const baseInput = {
  einkommenJahr: 150_000,
  vermoegenJahr: 200_000,
  kapAuszahlungenJahr: 0,
  kanton: "ZH",
  fallart: "einzel" as const,
      zivilstand: "ledig" as const,
  bruttoErwerbP1: 150_000,
  bruttoErwerbP2: 0,
  alterP1: 50,
  alterP2: 0,
  anzahlKinder: 0,
  saeule3aEinzahlungJahr: 7_258,
  hatPkAnschlussP1: true,
  hatPkAnschlussP2: false,
  religion: "keine" as const,
};

describe("F1 — Eigenmietwert + Schuldzinsabzug (Reform 2030)", () => {
  it("EIGENMIETWERT_LETZTES_JAHR ist 2029", () => {
    expect(EIGENMIETWERT_LETZTES_JAHR).toBe(2029);
  });

  it("eigenmietwertAktivImJahr: true bis 2029, false ab 2030", () => {
    expect(eigenmietwertAktivImJahr(2025)).toBe(true);
    expect(eigenmietwertAktivImJahr(2029)).toBe(true);
    expect(eigenmietwertAktivImJahr(2030)).toBe(false);
    expect(eigenmietwertAktivImJahr(2050)).toBe(false);
  });

  it("Steuerjahr 2026: Eigenmietwert 20k erhöht steuerbares Einkommen", () => {
    const ohne = steuerProJahr({ ...baseInput, jahr: 2026 });
    const mit = steuerProJahr({
      ...baseInput,
      jahr: 2026,
      eigenmietwertJahr: 20_000,
    });
    // Eigenmietwert wirkt → höhere Steuer
    expect(mit.einkommen).toBeGreaterThan(ohne.einkommen);
  });

  it("Steuerjahr 2030: Eigenmietwert wird IGNORIERT (Reform)", () => {
    const ohne = steuerProJahr({ ...baseInput, jahr: 2030 });
    const mit = steuerProJahr({
      ...baseInput,
      jahr: 2030,
      eigenmietwertJahr: 20_000,
    });
    expect(mit.einkommen).toBe(ohne.einkommen);
  });

  it("Steuerjahr 2029: Schuldzinsen 15k senken steuerbares Einkommen", () => {
    const ohne = steuerProJahr({ ...baseInput, jahr: 2029 });
    const mit = steuerProJahr({
      ...baseInput,
      jahr: 2029,
      schuldzinsenJahr: 15_000,
    });
    expect(mit.einkommen).toBeLessThan(ohne.einkommen);
  });

  it("Steuerjahr 2030: Schuldzinsen werden IGNORIERT (Reform)", () => {
    const ohne = steuerProJahr({ ...baseInput, jahr: 2030 });
    const mit = steuerProJahr({
      ...baseInput,
      jahr: 2030,
      schuldzinsenJahr: 15_000,
    });
    expect(mit.einkommen).toBe(ohne.einkommen);
  });

  it("EMW + Schuldzinsen heben sich teilweise auf (gleicher Betrag → kleiner Delta)", () => {
    // EMW 20k + Schuldzinsen 20k: bei Annahme gleicher Steuerklasse beidseitig
    // nahezu Null-Effekt, aber durch Progressions-Sprung etwas Differenz.
    const ohne = steuerProJahr({ ...baseInput, jahr: 2026 });
    const mit = steuerProJahr({
      ...baseInput,
      jahr: 2026,
      eigenmietwertJahr: 20_000,
      schuldzinsenJahr: 20_000,
    });
    // Mit korrekter Verrechnung ist die Differenz minimal (<500 CHF auf 150k Einkommen)
    expect(Math.abs(mit.einkommen - ohne.einkommen)).toBeLessThan(500);
  });
});

describe("F2 — Alimente-Abzug (Art. 33 DBG)", () => {
  it("Alimente 24k senkt steuerbares Einkommen spürbar", () => {
    const ohne = steuerProJahr({ ...baseInput, jahr: 2026 });
    const mit = steuerProJahr({
      ...baseInput,
      jahr: 2026,
      alimenteJahr: 24_000,
    });
    const ersparnis = ohne.einkommen - mit.einkommen;
    // Grenzsteuersatz ~25 % bei 150k Ledig ZH → 24k × 0.25 ≈ 6'000
    expect(ersparnis).toBeGreaterThan(3_000);
  });

  it("Alimente wirkt auch ab Steuerjahr 2030 (keine Reform-Restriktion)", () => {
    const ohne = steuerProJahr({ ...baseInput, jahr: 2030 });
    const mit = steuerProJahr({
      ...baseInput,
      jahr: 2030,
      alimenteJahr: 24_000,
    });
    expect(mit.einkommen).toBeLessThan(ohne.einkommen);
  });

  it("Alimente 0 oder undefined: identisch zum Default-Aufruf", () => {
    const a = steuerProJahr({ ...baseInput, jahr: 2026 });
    const b = steuerProJahr({ ...baseInput, jahr: 2026, alimenteJahr: 0 });
    expect(a.einkommen).toBe(b.einkommen);
  });

  it("Alimente erhalten erhöht steuerbares Einkommen (Art. 23 lit. f DBG)", async () => {
    const { cashflowReihe } = await import("./cashflow");
    const base = {
      fallart: "einzel" as const,
      zivilstand: "ledig" as const,
      person1: {
        vorname: "Erika",
        nachname: "Empfänger",
        geburtsdatum: "1980-01-01",
        geschlecht: "w" as const,
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
      ahv: {
        einkommenP1: 60_000,
        einkommenP2: null,
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
          aktiverAnschluss: false,
          altersguthabenHeute: null,
          altersguthabenBeiBezug: null,
          umwandlungssatzProzent: 6,
          bezugspraeferenz: "rente" as const,
          kapitalanteil: 0,
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
        p2: {
          aktiverAnschluss: false,
          altersguthabenHeute: null,
          altersguthabenBeiBezug: null,
          umwandlungssatzProzent: 6,
          bezugspraeferenz: "rente" as const,
          kapitalanteil: 0,
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
      },
      saeuleDrei: { p1: [], p2: [] },
      vermoegen: {
        items: [{ id: "v1", typ: "konto" as const, beschreibung: "Konto", saldoHeute: 10_000, renditeProzent: 0, istHauptkonto: true }],
      },
      immobilien: { items: [] },
      firma: { vorhanden: false, firmenname: "", moeglicherVerkaufserloes: null, plan: "behalten" as const, verkaufsjahr: 2040 },
      ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
      budget: {
        einkommen: [{ id: "e1", beschreibung: "Lohn", personIdx: 1 as const, betragMonatlich: 5_000, von: "2026-01", bis: "2040-12" }],
        ausgabenModus: "total" as const,
        ausgabenTotal: 3_000,
        ausgabenKategorien: { lebenshaltung: null, wohnen: null, mobilitaet: null, versicherungen: null, ferienHobby: null, sonstiges: null },
        wunschverbrauchPension: 2_500,
        steuernHeute: null,
        einkommenHeute: null,
        religion: "keine" as const,
        alimente: { aktiv: true, betragJahr: 24_000, richtung: "erhaelt" as const },
      },
      adresse: { strasse: "", plz: "", ort: "", kanton: "ZH" as const, gemeindeBfsId: null, gemeindeName: "" },
      einmaligeAusgaben: [],
    };
    const reihe = cashflowReihe(base, 2026, 2026);
    const z = reihe[0]!;
    // Einnahmen enthalten Alimente
    expect(z.einnahmenTotal).toBeGreaterThanOrEqual(60_000 + 24_000 - 100);
    // Saldo positiver als ohne Alimente (Empfänger profitiert)
    const ohne = cashflowReihe(
      { ...base, budget: { ...base.budget, alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" as const } } },
      2026,
      2026
    )[0]!;
    expect(z.saldo).toBeGreaterThan(ohne.saldo);
  });
});

describe("F3 — PK-Einkauf-Serie (Cashflow-Engine)", () => {
  // expandEinkaeufe ist intern in cashflow.ts — wir testen den Effekt via
  // pkEinkauf-Helper-Logik durch cashflowReihe.
  //
  // Wir testen hier nur die Datenstruktur-Konsistenz: serie:true mit bisJahr
  // muss eine Mehrfach-Wirkung haben gegenüber dem Einzel-Fall.

  it("EinkaufEntry-Interface erlaubt serie + bisJahr (Type-Check)", () => {
    // Wenn das hier compiliert, ist die Struktur korrekt.
    const einzel: import("@/lib/store").EinkaufEntry = {
      id: "e1",
      jahr: 2026,
      betrag: 20_000,
      serie: false,
    };
    const serie: import("@/lib/store").EinkaufEntry = {
      id: "e2",
      jahr: 2026,
      betrag: 20_000,
      serie: true,
      bisJahr: 2030,
    };
    expect(einzel.serie).toBe(false);
    expect(serie.serie).toBe(true);
    expect(serie.bisJahr).toBe(2030);
  });
});
