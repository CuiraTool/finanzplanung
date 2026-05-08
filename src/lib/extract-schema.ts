/**
 * Schema für Dokumenten-Extraktion (Phase 3 AI-Doc-Upload).
 *
 * Claude erhält ein Schweizer Finanzdokument (PK-Ausweis, Steuerveranlagung,
 * IK-Auszug, Versicherungspolice, Lohnausweis) und extrahiert die hier
 * definierten Felder. Felder ohne erkannten Wert werden auf null gesetzt.
 *
 * Das Schema ist absichtlich flach und cross-Doc — Claude füllt nur die
 * Felder, die im jeweiligen Doc-Typ vorhanden sind.
 */

export type DocType =
  | "pk-ausweis"
  | "steuerveranlagung"
  | "ik-auszug"
  | "versicherungspolice"
  | "lohnausweis"
  | "kontoauszug"
  | "unbekannt";

export interface ExtractedDocument {
  /** Erkannter Doc-Typ. */
  docType: DocType;
  /** Confidence 0–1. */
  confidence: number;
  /** Menschenlesbare Quellen-Beschreibung — z.B. "PK-Ausweis Tellco, Stand 31.12.2025". */
  beschreibung: string;
  /** Stichtag des Dokuments, falls erkennbar — ISO YYYY-MM-DD. */
  stichtag: string | null;
  /** Auf wen das Dokument lautet (z.B. "Ralph Muster"). */
  betrifftName: string | null;
  /** Extrahierte Werte. */
  felder: ExtractedFelder;
}

export interface ExtractedFelder {
  // Person — Stammdaten
  vorname: string | null;
  nachname: string | null;
  geburtsdatum: string | null; // ISO YYYY-MM-DD

  // Adresse
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  /** Schweizer Kanton-Code (ZH, ZG, ...). */
  kanton: string | null;

  // Einkommen
  /** Brutto-Jahresgehalt aus Lohnausweis oder Steuererklärung. */
  bruttojahreseinkommen: number | null;
  /** Massgebendes Einkommen aus IK-Auszug (Lebensdurchschnitt für AHV). */
  massgebendesEinkommen: number | null;

  // Steuern
  /** Total Steuern letzte Veranlagung CHF/Jahr. */
  jahressteuer: number | null;
  /** Steuerbares Einkommen aus Veranlagung. */
  steuerbaresEinkommen: number | null;
  /** Steuerbares Vermögen aus Veranlagung. */
  steuerbaresVermoegen: number | null;

  // Pensionskasse (Block 5)
  /** Aktuelles Altersguthaben heute laut PK-Ausweis. */
  pkAltersguthabenHeute: number | null;
  /** Voraussichtliches Altersguthaben mit Alter 65 laut PK-Ausweis. */
  pkAltersguthabenMit65: number | null;
  /** PK-Umwandlungssatz in Prozent (z.B. 6.0 für 6%). */
  pkUmwandlungssatzProzent: number | null;
  /** PK-Anbieter (z.B. "Tellco", "Pensionskasse SBB"). */
  pkAnbieter: string | null;
  /** Freizügigkeitsguthaben (separater Eintrag möglich). */
  freizuegigkeitSaldo: number | null;
  /** FZ-Anbieter (z.B. "Migros Bank FZ-Konto"). */
  freizuegigkeitAnbieter: string | null;

  // 3. Säule (Block 6)
  /** 3a-Konto Saldo. */
  saeule3aKontoSaldo: number | null;
  /** 3a-Konto Anbieter (z.B. "ZKB 3a-Konto"). */
  saeule3aKontoAnbieter: string | null;
  /** 3a-Versicherung Rückkaufswert. */
  saeule3aVersicherungRueckkaufswert: number | null;
  /** 3a-Versicherung Erlebensfallleistung. */
  saeule3aVersicherungAblaufswert: number | null;
  /** 3a-Versicherung Ablaufjahr. */
  saeule3aVersicherungAblaufjahr: number | null;
  /** 3a-Versicherung Anbieter (z.B. "AXA 3a-Police"). */
  saeule3aVersicherungAnbieter: string | null;

  // Vermögen (Block 7)
  /** Liquid-Saldo Bankkonto. */
  bankkontoSaldo: number | null;
  /** Wertschriften-Depot Saldo. */
  depotSaldo: number | null;

  // Immobilien (Block 8)
  /** Verkehrswert eigene Immobilie. */
  immobilieVerkehrswert: number | null;
  /** Hypothek-Restschuld. */
  hypothekRestschuld: number | null;
  /** Hypothek-Zinssatz in Prozent (z.B. 1.5 für 1.5%). */
  hypothekZinssatzProzent: number | null;
  /** Hypothek-Ablaufjahr. */
  hypothekAblaufjahr: number | null;

  // Notizen
  /** Freie Anmerkungen, Auffälligkeiten, was nicht ins Schema passte. */
  notizen: string | null;
}
