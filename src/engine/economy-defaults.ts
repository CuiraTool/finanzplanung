/**
 * Zentrale Wirtschafts-Annahmen (Inflation, Renditen, Wertsteigerung).
 *
 * Y-1a H-3-Fix: vorher waren Inflations-Annahmen über mehrere Module verstreut
 * (inflation.ts: 1.5%, immobilieWert default: 1.5%, stress-tests: 2.0%).
 * Hier bündeln wir die Konstanten für Transparenz, Tunability und Konsistenz.
 *
 * Quellen:
 *  - INFLATION_DEFAULT_PROZENT: BFS LIK-Mittel 2000-2025 = 0.55%. Wir setzen
 *    konservativ 1.5% (oberer Rand der historischen Schwankung, plus die
 *    erwartete höhere Inflation nach 2022-Schock). Audit-Befund: 1.5% kann
 *    real überzeichnen, bleibt aber sichere Default für Kaufkraft-Prognosen.
 *  - IMMO_WERTSTEIGERUNG_DEFAULT_PROZENT: historisch CH-Wohneigentum ≈ +1.5%
 *    p.a. (BIS-Wohnimmobilien-Preisindex). User kann pro Objekt überschreiben.
 *  - STRESS_INFLATION_PROZENT: Stress-Szenario "Inflation-Schock" geht von
 *    2.0% p.a. compound aus (Notenbank-Zielband oberer Rand).
 *  - BVG_MINDESTZINS: 2025 = 1.25% (Bundesrat 2024-12-04).
 */

/** Default-Inflations-Rate für Deflations-Toggle Dashboard (% p.a.). */
export const INFLATION_DEFAULT_PROZENT = 1.5;

/** Default-Wertsteigerung Schweizer Wohnimmobilien (% p.a.). */
export const IMMO_WERTSTEIGERUNG_DEFAULT_PROZENT = 1.5;

/** Stress-Test "Inflation-Schock": angenommene Inflation (% p.a.). */
export const STRESS_INFLATION_PROZENT = 2.0;

/** BVG-Mindestzinssatz 2025 (Bundesrat 04.12.2024). */
export const BVG_MINDESTZINS_2025 = 0.0125;

/** Default-Kalkulationszinssatz Tragbarkeit (% p.a.) — Banken-Standard 5%. */
export const TRAGBARKEIT_KALK_ZINS_DEFAULT = 0.05;

/** Default-Hypothek-Amortisations-Quote (% Verkehrswert) — auf 65% in 15 J. */
export const HYPOTHEK_BELEHNUNG_ZIEL_PROZENT = 65;
