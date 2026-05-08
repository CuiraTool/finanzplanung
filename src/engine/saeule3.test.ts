import { describe, it, expect } from "vitest";
import {
  saeuleDreiAuszahlung,
  saeuleDreiAuszahlungen,
  saeuleDreiTotal,
  type SaeuleDreiItem,
} from "./saeule3";

function konto(overrides: Partial<SaeuleDreiItem> = {}): SaeuleDreiItem {
  return {
    id: "k1",
    type: "konto",
    beschreibung: "Konto",
    aktuellerWert: 50_000,
    auszahlungsjahr: 2030,
    renditeProzent: 1.5,
    rueckkaufswert: null,
    ablaufjahr: 2030,
    ...overrides,
  };
}

function versicherung(overrides: Partial<SaeuleDreiItem> = {}): SaeuleDreiItem {
  return {
    id: "v1",
    type: "versicherung",
    beschreibung: "Versicherung",
    aktuellerWert: null,
    auszahlungsjahr: 2030,
    renditeProzent: 0,
    rueckkaufswert: 30_000,
    ablaufjahr: 2032,
    ...overrides,
  };
}

describe("3. Säule — Konto: Projektion mit Rendite", () => {
  it("Auszahlungsjahr = jetzt → unverändert", () => {
    const out = saeuleDreiAuszahlung(
      konto({ aktuellerWert: 50_000, auszahlungsjahr: 2026 }),
      2026
    );
    expect(out).toEqual({ jahr: 2026, betrag: 50_000 });
  });

  it("4 Jahre @ 1.5% verzinst", () => {
    const out = saeuleDreiAuszahlung(
      konto({ aktuellerWert: 50_000, auszahlungsjahr: 2030, renditeProzent: 1.5 }),
      2026
    );
    expect(out?.betrag).toBe(Math.round(50_000 * Math.pow(1.015, 4)));
    expect(out?.jahr).toBe(2030);
  });

  it("Rendite 0% → unverändert", () => {
    const out = saeuleDreiAuszahlung(
      konto({ aktuellerWert: 50_000, auszahlungsjahr: 2030, renditeProzent: 0 }),
      2026
    );
    expect(out?.betrag).toBe(50_000);
  });

  it("aktuellerWert null → null", () => {
    const out = saeuleDreiAuszahlung(konto({ aktuellerWert: null }), 2026);
    expect(out).toBeNull();
  });
});

describe("3. Säule — Versicherung: Rückkaufswert wird übernommen", () => {
  it("liefert Rückkaufswert im Ablaufjahr", () => {
    const out = saeuleDreiAuszahlung(
      versicherung({ rueckkaufswert: 30_000, ablaufjahr: 2032 }),
      2026
    );
    expect(out).toEqual({ jahr: 2032, betrag: 30_000 });
  });

  it("rueckkaufswert null → null", () => {
    const out = saeuleDreiAuszahlung(versicherung({ rueckkaufswert: null }), 2026);
    expect(out).toBeNull();
  });
});

describe("3. Säule — Aggregation Total", () => {
  it("Summe aller Items über alle Auszahlungsjahre", () => {
    const items: SaeuleDreiItem[] = [
      konto({ id: "1", aktuellerWert: 50_000, auszahlungsjahr: 2030, renditeProzent: 1.5 }),
      konto({ id: "2", aktuellerWert: 25_000, auszahlungsjahr: 2032, renditeProzent: 0 }),
      versicherung({ id: "3", rueckkaufswert: 40_000, ablaufjahr: 2035 }),
    ];
    const total = saeuleDreiTotal(items, 2026);
    const expected =
      Math.round(50_000 * Math.pow(1.015, 4)) + 25_000 + 40_000;
    expect(total).toBe(expected);
  });

  it("Items mit fehlenden Pflichtwerten werden übersprungen", () => {
    const items: SaeuleDreiItem[] = [
      konto({ id: "1", aktuellerWert: 50_000, auszahlungsjahr: 2030, renditeProzent: 0 }),
      konto({ id: "2", aktuellerWert: null }),
      versicherung({ id: "3", rueckkaufswert: null }),
    ];
    expect(saeuleDreiTotal(items, 2026)).toBe(50_000);
  });

  it("saeuleDreiAuszahlungen liefert eine Liste pro Item", () => {
    const items: SaeuleDreiItem[] = [
      konto({ id: "1", aktuellerWert: 10_000, auszahlungsjahr: 2030, renditeProzent: 0 }),
      versicherung({ id: "2", rueckkaufswert: 20_000, ablaufjahr: 2035 }),
    ];
    const auszahlungen = saeuleDreiAuszahlungen(items, 2026);
    expect(auszahlungen).toHaveLength(2);
    expect(auszahlungen[0]).toEqual({ jahr: 2030, betrag: 10_000 });
    expect(auszahlungen[1]).toEqual({ jahr: 2035, betrag: 20_000 });
  });
});
