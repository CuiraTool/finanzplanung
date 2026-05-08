/**
 * UI-Validierungs-Helper. Gating für die Wizard-Navigation: Block 2–10 sind
 * erst aktiv, wenn die absolut nötigen Stammdaten in Block 1 erfasst sind.
 *
 * Was als "absolut nötig" gilt:
 *  - Vorname (Person 1, bei Paar auch Person 2) — für Personenetikett
 *  - Geburtsdatum (Person 1, bei Paar auch Person 2) — für Pensions-/Bezugsjahr
 *  - Kanton — für Steuerberechnung
 *
 * Adresse, Telefon, E-Mail, Kinder etc. sind nicht blockierend.
 */

import type { PlanState } from "./store";

export interface Block1ValidationOutput {
  komplett: boolean;
  fehlend: string[]; // menschenlesbare Liste
}

export function block1MinimumErfuellt(state: PlanState): Block1ValidationOutput {
  const fehlend: string[] = [];

  if (!state.person1.vorname.trim()) {
    fehlend.push(state.fallart === "paar" ? "Vorname Person 1" : "Vorname");
  }
  if (!state.person1.geburtsdatum) {
    fehlend.push(state.fallart === "paar" ? "Geburtsdatum Person 1" : "Geburtsdatum");
  }
  if (!state.adresse.kanton) {
    fehlend.push("Kanton");
  }

  if (state.fallart === "paar") {
    if (!state.person2.vorname.trim()) fehlend.push("Vorname Person 2");
    if (!state.person2.geburtsdatum) fehlend.push("Geburtsdatum Person 2");
  }

  return {
    komplett: fehlend.length === 0,
    fehlend,
  };
}
