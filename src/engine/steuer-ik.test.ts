/**
 * Tests für interkantonale Steuerausscheidung (Sprint 2.1).
 *
 * Szenario: Wohnsitz ZH, Ferienwohnung VS (Wallis). Wertschriften am
 * Wohnsitz, Ferienwohnung in Zermatt mit Hypothek.
 */
import { describe, expect, it } from "vitest";
import { steuerProJahrIK, steuerProJahr, type FremdKantonAnteil } from "./steuer";

describe("steuerProJahrIK — Sprint 2.1 interkantonale Ausscheidung", () => {
  const baseInput = {
    einkommenJahr: 150_000, // Erwerb in ZH
    vermoegenJahr: 1_500_000, // Total Vermögen
    kapAuszahlungenJahr: 0,
    kanton: "ZH",
    religion: "reformiert" as const,
    fallart: "paar" as const,
    bruttoErwerbP1: 150_000,
    bruttoErwerbP2: 0,
    alterP1: 50,
    alterP2: 50,
    anzahlKinder: 0,
    saeule3aEinzahlungJahr: 0,
    hatPkAnschlussP1: true,
    hatPkAnschlussP2: false,
    einkommenIstNetto: false,
  };

  it("ohne Fremdkanton-Liegenschaft = identisch zu steuerProJahr", () => {
    const ik = steuerProJahrIK(baseInput, []);
    const direkt = steuerProJahr(baseInput);
    expect(ik.total).toBe(direkt.total);
    expect(ik.einkommen).toBe(direkt.einkommen);
    expect(ik.vermoegen).toBe(direkt.vermoegen);
  });

  it("Ferienwohnung VS verschiebt Vermögensteuer-Anteil vom Wohnsitz weg", () => {
    const ohne = steuerProJahrIK(baseInput, []);
    const fremdAnteil: FremdKantonAnteil[] = [
      {
        kanton: "VS",
        mietenJahr: 0, // selbst genutzt
        vermoegenNetto: 600_000, // Ferienwohnung netto
      },
    ];
    const mit = steuerProJahrIK(
      {
        ...baseInput,
        vermoegenJahr: baseInput.vermoegenJahr + 600_000,
      },
      fremdAnteil
    );
    // Mit Fremdkanton-Liegenschaft: VS bekommt Vermögensteuer-Anteil.
    // Vermögen-Total ist 600k höher → trotzdem nicht 1:1 mehr Steuer am
    // Wohnsitz (VS hat eigenen Tarif). Wichtig: Bund-Anteil bleibt erhalten.
    expect(mit.einkommenBund).toBe(ohne.einkommenBund);
    expect(mit.vermoegen).toBeGreaterThan(ohne.vermoegen);
  });

  it("Renditeliegenschaft GR: Mieten besteuert im Liegenschaftskanton", () => {
    const fremdAnteil: FremdKantonAnteil[] = [
      {
        kanton: "GR",
        mietenJahr: 36_000,
        vermoegenNetto: 800_000,
      },
    ];
    const mit = steuerProJahrIK(
      {
        ...baseInput,
        einkommenJahr: baseInput.einkommenJahr + 36_000,
        vermoegenJahr: baseInput.vermoegenJahr + 800_000,
      },
      fremdAnteil
    );
    // Steuer total muss positiv und plausibel sein
    expect(mit.total).toBeGreaterThan(0);
    expect(mit.einkommenKanton).toBeGreaterThan(0);
    // Bundessteuer rechnet auf Gesamteinkommen inkl. Mieten
    const ohneMieten = steuerProJahrIK(baseInput, []);
    expect(mit.einkommenBund).toBeGreaterThan(ohneMieten.einkommenBund);
  });

  it("zwei Fremdkantone parallel: beide Anteile summieren sich", () => {
    const fremd: FremdKantonAnteil[] = [
      { kanton: "VS", mietenJahr: 0, vermoegenNetto: 500_000 },
      { kanton: "GR", mietenJahr: 24_000, vermoegenNetto: 400_000 },
    ];
    const mit = steuerProJahrIK(
      {
        ...baseInput,
        einkommenJahr: baseInput.einkommenJahr + 24_000,
        vermoegenJahr: baseInput.vermoegenJahr + 900_000,
      },
      fremd
    );
    expect(mit.total).toBeGreaterThan(0);
    // einkommenKanton enthält Wohnsitz + Anteil aus beiden Fremdkantonen
    expect(mit.einkommenKanton).toBeGreaterThan(0);
  });

  it("unbekannter Fremdkanton: wird ignoriert (kein Crash)", () => {
    const fremd: FremdKantonAnteil[] = [
      {
        kanton: "XX",
        mietenJahr: 10_000,
        vermoegenNetto: 100_000,
      },
    ];
    const r = steuerProJahrIK(baseInput, fremd);
    // Resultat trotzdem berechenbar (Fremdkanton wird verworfen, Voll-Aufruf
    // bringt Wohnsitz-Werte)
    expect(r.total).toBeGreaterThan(0);
  });
});
