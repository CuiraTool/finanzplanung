import { beforeAll, vi } from "vitest";

/**
 * Globale Test-Clock.
 *
 * Friert die Systemzeit auf einen fixen Zeitpunkt ein, damit zeitabhängige
 * Engine-Funktionen (die ~30 `new Date()`-Aufrufe in cashflow / steuer /
 * massnahmen / vermoegensbilanz) deterministisch laufen. Ohne diesen Fix
 * driften jahresabhängige Tests am Jahreswechsel (z.B. estv-konkubinat).
 *
 * Es wird ausschliesslich `Date` gefaked — Timer (setTimeout etc.) bleiben
 * echt, damit asynchrone Tests normal funktionieren.
 *
 * Hinweis: Dies ist die pragmatische Absicherung. Der saubere Fix ist, einen
 * optionalen `heuteJahr`-Parameter durch die Engine zu reichen (Refactor,
 * vor der Investment-Runde).
 */
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
});
