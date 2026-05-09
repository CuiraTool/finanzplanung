/**
 * Typen für den geführten Frage-Flow ("Typeform-Style").
 *
 * Die Spec ist eine flache Liste von Fragen mit:
 *  - id (eindeutig, z.B. "B3")
 *  - block-Zuordnung (für Progress-Anzeige + V2-Sales-Pitch)
 *  - Frage-Text
 *  - Feld-Typ (steuert die Eingabe-Komponente)
 *  - Optional: condition (Funktion oder Lookup, ob Frage angezeigt wird)
 *  - Optional: validate (Pflicht? Min/Max?)
 *  - get/set (Mapping zum Plan-Store)
 *
 * Die Flow-Engine geht durch die Liste, überspringt Fragen mit condition=false,
 * persistiert die Antworten via set() in den Store.
 */

import type { PlanState } from "@/lib/store";

export type FieldType =
  | "text" // einfacher Single-Line-Text (ST)
  | "longtext" // mehrzeiliger Text (LT)
  | "number" // Zahl, optional CHF-Format (NR)
  | "date" // ISO-Datum YYYY-MM-DD (DT)
  | "yearmonth" // ISO YYYY-MM
  | "year" // 4-stelliges Jahr
  | "email" // E-Mail (EM)
  | "yesno" // Y/N
  | "single" // SC (Dropdown / Radio)
  | "multi" // MC (Multi-Select-Buttons)
  | "consent" // Pflicht-Checkbox (DSG)
  | "info" // reiner Text-Screen (Statement)
  | "kanton" // Kanton-Code (vorgegebene Liste)
  | "gemeinde"; // Gemeinde-Picker abhängig vom Kanton

export interface OptionDef<V extends string = string> {
  value: V;
  label: string;
  hint?: string;
}

export interface QuestionSpec {
  id: string;
  /** Block-Code aus Word-Doc (A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S). */
  block: string;
  /** Anzeigetitel des Blocks für Progress-Bar. */
  blockTitle: string;
  /** Frage-Text (kann Markdown-light haben — bold via **text**). */
  frage: string;
  /**
   * Optional: alternative Frage für fallart="einzel" (Sie-Form statt
   * "Person 1"). Wenn nicht gesetzt, wird `frage` verwendet (mit
   * Vorname-Replacement durch den Renderer).
   */
  frageEinzel?: string;
  /** Sub-Hinweis unter der Frage. */
  hilfe?: string;
  type: FieldType;
  /** Optional: Optionen für single/multi. */
  optionen?: OptionDef[];
  /** Optional: Konditionale Sichtbarkeit. true → anzeigen. */
  bedingung?: (s: PlanState) => boolean;
  /** Pflichtfeld? Default false. */
  pflicht?: boolean;
  /** Validierung: gibt Fehlertext zurück oder null wenn ok. */
  validiere?: (wert: unknown) => string | null;
  /** Min/Max für number. */
  min?: number;
  max?: number;
  /** Maximale Anzahl bei multi. */
  maxAuswahl?: number;
  /** Lese-Funktion: aus dem Store den aktuellen Wert holen. */
  get: (s: PlanState) => unknown;
  /** Schreib-Funktion: Wert in den Store legen. */
  set: (s: PlanState, wert: unknown) => void;
  /** Platzhalter für die Eingabe. */
  placeholder?: string;
  /** Suffix (z.B. "CHF", "Jahre"). */
  suffix?: string;
}

/** Berater-Meta für V2 (Block A) — separater State, nicht im Hauptstore. */
export interface BeraterMeta {
  datum: string; // ISO YYYY-MM-DD
  partnerfirma: string;
  beraterName: string;
  beraterEmail: string;
  auftrag: "planung_beratung" | "nur_planung" | "";
  kundeP1Name: string;
  kundeP2Name: string;
}

export interface FlowAntworten {
  /** Berater-Meta nur in V2 gefüllt. */
  beraterMeta?: BeraterMeta;
  /** Snapshot des Plan-States. */
  plan: Partial<PlanState>;
  /** Zeitstempel ISO. */
  erfasstAm: string;
}
