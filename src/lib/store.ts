import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Fallart = "einzel" | "paar";

export type ZivilstandEinzel = "ledig" | "verwitwet" | "geschieden" | "getrennt";
export type ZivilstandPaar = "verheiratet" | "konkubinat";
export type Zivilstand = ZivilstandEinzel | ZivilstandPaar;

export const ZIVILSTAND_EINZEL: { value: ZivilstandEinzel; label: string }[] = [
  { value: "ledig", label: "Ledig" },
  { value: "verwitwet", label: "Verwitwet" },
  { value: "geschieden", label: "Geschieden" },
  { value: "getrennt", label: "Getrennt" },
];

export const ZIVILSTAND_PAAR: { value: ZivilstandPaar; label: string }[] = [
  { value: "verheiratet", label: "Verheiratet" },
  { value: "konkubinat", label: "Konkubinat" },
];

export const KANTONE: { code: string; name: string }[] = [
  { code: "AG", name: "Aargau" },
  { code: "AI", name: "Appenzell Innerrhoden" },
  { code: "AR", name: "Appenzell Ausserrhoden" },
  { code: "BE", name: "Bern" },
  { code: "BL", name: "Basel-Landschaft" },
  { code: "BS", name: "Basel-Stadt" },
  { code: "FR", name: "Freiburg" },
  { code: "GE", name: "Genf" },
  { code: "GL", name: "Glarus" },
  { code: "GR", name: "Graubünden" },
  { code: "JU", name: "Jura" },
  { code: "LU", name: "Luzern" },
  { code: "NE", name: "Neuenburg" },
  { code: "NW", name: "Nidwalden" },
  { code: "OW", name: "Obwalden" },
  { code: "SG", name: "St. Gallen" },
  { code: "SH", name: "Schaffhausen" },
  { code: "SO", name: "Solothurn" },
  { code: "SZ", name: "Schwyz" },
  { code: "TG", name: "Thurgau" },
  { code: "TI", name: "Tessin" },
  { code: "UR", name: "Uri" },
  { code: "VD", name: "Waadt" },
  { code: "VS", name: "Wallis" },
  { code: "ZG", name: "Zug" },
  { code: "ZH", name: "Zürich" },
];

export interface Adresse {
  strasse: string;
  plz: string;
  ort: string;
  kanton: string;
  /** BfsID der Gemeinde (für genauen Steuerfuss). Optional — Fallback Hauptort. */
  gemeindeBfsId?: number | null;
  /** Gemeindename für UI-Anzeige (cosmetic, BfsID ist die Wahrheit). */
  gemeindeName?: string;
}

export type KindZuordnung = "gemeinsam" | "p1" | "p2";

export interface Kind {
  id: string;
  vorname: string;
  geburtsdatum: string;
  zuordnung: KindZuordnung;
  /**
   * In Erstausbildung bis (Jahr). Wenn gesetzt, wird das Kind auch nach
   * dem 18. Geburtstag bis zu diesem Jahr als steuerlich abzugsfähig
   * gezählt (typisch Erstausbildung max bis ~25). Wenn null/undefined:
   * Default-Heuristik = Kind ist abzugsfähig solange < 18.
   */
  ausbildungBisJahr?: number | null;
}

export type Geschlecht = "m" | "w" | "andere";

export interface PersonInput {
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  /** Optional — relevant für AHV21-Übergangsalter (Frauen Jg. 1961-63). */
  geschlecht: Geschlecht | null;
  telefon: string;
  email: string;
}

/**
 * AHV-spezifische Eingaben (Block 4).
 * Liegt bewusst nicht in PersonInput — das massgebende Einkommen ist
 * eine AHV-Berechnungsgrösse, keine Stammdate.
 */
export interface AhvInput {
  einkommenP1: number | null;
  einkommenP2: number | null;
  hatIkAuszugP1: boolean;
  hatIkAuszugP2: boolean;
  hatFehljahreP1: boolean;
  hatFehljahreP2: boolean;
  fehljahreAnzahlP1: number;
  fehljahreAnzahlP2: number;
  /**
   * AHV-Bezugsalter — unabhängig vom Pensionierungsalter (Block 2 Ziele).
   * Range 63–70: 63/64 = Vorbezug, 65 = ordentlich, 66–70 = Aufschub.
   */
  ahvBezugsalterP1: number;
  ahvBezugsalterP2: number;
}

/** BVG / 2. Säule — Block 5. */
export type BezugsPraeferenz = "rente" | "kapital" | "mischung";

export interface FreizuegigkeitEntry {
  id: string;
  beschreibung: string;
  saldoHeute: number | null;
  auszahlungsjahr: number;
  renditeProzent: number; // default 0
}

export interface EinkaufEntry {
  id: string;
  jahr: number;
  betrag: number | null;
  /**
   * Serie über mehrere Jahre: wenn true, wird der gleiche Betrag jährlich
   * von `jahr` bis `bisJahr` (inkl.) wirksam — als Cashflow-Ausgabe,
   * Steuer-Abzug UND PK-Saldo-Erhöhung. Default false (Einzel-Einkauf).
   */
  serie: boolean;
  /** Endjahr der Serie (inkl.). Nur relevant wenn serie=true. */
  bisJahr?: number;
}

/**
 * WEF-Vorbezug (Wohneigentumsförderung): User bezieht PK-Kapital
 * vorzeitig für Erwerb/Amortisation eines selbstbewohnten Eigenheims.
 *
 * Wirkung:
 *   - Mindert sowohl `altersguthabenHeute` als auch
 *     `altersguthabenBeiBezug` proportional zum Vorbezugs-Jahr.
 *   - Wird mit Kapitalauszahlungssteuer-Sondertarif besteuert.
 *   - Kann rückgezahlt werden (Rückzahlung wirkt wie Einkauf) — wenn
 *     der User zurückzahlt, einfach via einkaeufe-Liste erfassen.
 *
 * BVG erlaubt WEF-Vorbezüge alle 5 Jahre, mind. CHF 20'000, bis Alter 50
 * uneingeschränkt, danach max 50% des Altersguthabens (oder Stand mit 50).
 * Wir machen aktuell keinen 50-Jahres-Check — der gehört in eine
 * separate Validierung.
 */
export interface WefVorbezugEntry {
  id: string;
  jahr: number;
  betrag: number | null;
  beschreibung: string;
  /**
   * Verknüpfte Immobilie — der WEF-Betrag reduziert die Hypothek dieser
   * Immobilie (Tilgung) bzw. erhöht das Eigenkapital (Kauf). Bei `null`
   * fällt die Engine auf die erste selbstbewohnte Immobilie zurück.
   */
  immoId?: string | null;
}

export interface BvgPersonInput {
  aktiverAnschluss: boolean;
  /** Aktuelles PK-Altersguthaben heute (vom PK-Ausweis, informativ). */
  altersguthabenHeute: number | null;
  /** Voraussichtliches Altersguthaben beim Bezugsalter (vom PK-Ausweis, für Bezugsberechnung). */
  altersguthabenBeiBezug: number | null;
  /** PK-spezifischer Umwandlungssatz in Prozent (z.B. 6.8 für 6.8%). */
  umwandlungssatzProzent: number;
  bezugspraeferenz: BezugsPraeferenz;
  kapitalanteil: number; // 0–100
  freizuegigkeit: FreizuegigkeitEntry[];
  einkaeufe: EinkaufEntry[];
  /** WEF-Vorbezüge für Eigenheim. */
  wefVorbezuege?: WefVorbezugEntry[];
}

export interface BvgInput {
  p1: BvgPersonInput;
  p2: BvgPersonInput;
}

/** 3. Säule — Block 6. Konto oder Versicherung, beliebig viele pro Person. */
export type SaeuleDreiTyp = "konto" | "versicherung";
/**
 * Säule 3a vs 3b — steuerlich grundverschieden:
 *  - **3a** (gebunden): Einzahlung als Einkommens-Abzug bei Veranlagung,
 *    Auszahlung mit Kapitalleistungssteuer (Sondertarif)
 *  - **3b** (frei): KEIN Einkommens-Abzug, Auszahlung steuerfrei. Prämien
 *    sind aber budgetrelevant (gehen vom Cashflow ab).
 * Konten gibt's nur in 3a (3b ist keine vergleichbare Konto-Form).
 */
export type SaeuleDreiSubTyp = "3a" | "3b";

export interface SaeuleDreiEntry {
  id: string;
  type: SaeuleDreiTyp;
  /**
   * Sub-Typ 3a oder 3b. Konten sind immer 3a. Versicherungen können beides
   * sein — User wählt im UI. Default 3a.
   */
  saeule: SaeuleDreiSubTyp;
  beschreibung: string;
  // Konto:
  aktuellerWert: number | null;
  auszahlungsjahr: number;
  renditeProzent: number;
  // Versicherung:
  rueckkaufswert: number | null;
  ablaufswert: number | null; // Erlebensfallleistung — wird im Ablaufjahr ausbezahlt
  ablaufjahr: number;
  // Einzahlungen (Konto: jährlicher Beitrag, Versicherung: Jahresprämie):
  jaehrlicheEinzahlung: number | null;
  einzahlungAb: number;
  einzahlungBis: number;
}

export interface SaeuleDreiInput {
  p1: SaeuleDreiEntry[];
  p2: SaeuleDreiEntry[];
}

/** Vermögen — Block 7. Konten, Depots, Darlehen. */
export type VermoegenTyp = "konto" | "depot" | "darlehen";

export interface VermoegenItem {
  id: string;
  typ: VermoegenTyp;
  beschreibung: string;
  saldoHeute: number | null;
  renditeProzent: number;
  /** Genau ein Item ist das Hauptkonto, wo der Cashflow-Saldo landet. */
  istHauptkonto: boolean;
}

export interface VermoegenInput {
  items: VermoegenItem[];
}

/** Immobilien — Block 8. */
export type ImmobilienTyp = "selbstbewohnt" | "rendite";
export type ImmobilienPlan = "behalten" | "verkaufen";

export interface Hypothek {
  id: string;
  beschreibung: string;
  hoehe: number | null;
  zinssatzProzent: number;
  ablaufjahr: number;
}

export interface Immobilie {
  id: string;
  beschreibung: string;
  typ: ImmobilienTyp;
  verkehrswert: number | null;
  hypotheken: Hypothek[];
  plan: ImmobilienPlan;
  verkaufsjahr: number;
  /** Nur bei Typ "rendite" relevant — jährliche Bruttomieteinnahmen. */
  jaehrlicheMieteinnahmen: number | null;
  /**
   * Kaufjahr (für Besitzdauer-Berechnung bei Grundstückgewinnsteuer).
   * Wenn null/undefined: Default = Kaufjahr unbekannt → Engine nimmt
   * eine pessimistische Annahme von 15 J. Besitzdauer.
   */
  kaufjahr?: number | null;
  /**
   * Anlagekosten = Kaufpreis + Kaufnebenkosten (Notar, Handänderung etc.).
   * Wenn null/undefined: Engine nimmt 75% des Verkaufspreises bei 15 J. Besitz
   * (Default-Annahme aus berechneGgst). Wenn der User einen genauen Wert hat,
   * wird er hier eingegeben. Wertvermehrende Investitionen werden separat
   * in `wertvermehrendeInvestitionen` erfasst.
   */
  anlagekosten?: number | null;
  /**
   * Wertvermehrende Investitionen seit Kauf (Anbau, Heizungs-Ersatz, neues
   * Bad, Solaranlage, Umbau zu zusätzlichem Stockwerk etc.). Diese Beträge
   * mindern die Grundstückgewinnsteuer beim Verkauf, weil sie zu den
   * Anlagekosten zählen. Werterhaltende Aufwendungen (Anstrich, Reparaturen)
   * dürfen NICHT abgezogen werden — die wurden bereits laufend als
   * Unterhaltsaufwand bei der Einkommenssteuer berücksichtigt.
   * Wenn null/undefined: keine wertvermehrenden Investitionen geltend gemacht.
   */
  wertvermehrendeInvestitionen?: number | null;
  /**
   * Erwartete jährliche Wertsteigerung in % (default 1.5 — historischer
   * CH-Mittelwert für Wohneigentum). Wirkt im Cashflow auf den Verkehrs-
   * wert: Wert(jahr) = verkehrswert × (1 + p/100)^(jahr - heute).
   * Bei null/undefined: Default 1.5%.
   */
  wertsteigerungProzent?: number | null;
  /**
   * Eigene Adresse der Liegenschaft (für interkantonale Steuerausscheidung
   * und GGSt-Kanton). Wenn null/undefined: Wohnsitz des Mandanten (state.adresse)
   * wird als Default angenommen — typisch für Eigenheim am Wohnsitz.
   * Bei Ferienwohnung, Renditeliegenschaft etc. wird hier eine abweichende
   * Adresse erfasst, damit die Steuer-Engine korrekt nach IK-Quote aufteilt.
   */
  adresse?: {
    plz: string;
    ort: string;
    kanton: string;
    gemeindeBfsId: number | null;
    gemeindeName: string;
  } | null;
  /**
   * Eigenmietwert als Prozent vom Verkehrswert (nur bei typ="selbstbewohnt"
   * relevant). Default 1.13 % (ZH-Median nach Veranlagungspraxis). Wirkt
   * im Steuer-Cashflow bis und mit Steuerjahr 2029 — ab 2030 entfällt
   * Eigenmietwert + Schuldzinsabzug aufgrund der Reform 2030 (Volks-
   * abstimmung Sept 2025 angenommen).
   */
  eigenmietwertProzent?: number | null;
}

export interface ImmobilienInput {
  items: Immobilie[];
}

/** Firma / Selbständigkeit — Block 9. */
export interface FirmaInput {
  vorhanden: boolean;
  firmenname: string;
  moeglicherVerkaufserloes: number | null;
  plan: "behalten" | "verkaufen";
  verkaufsjahr: number;
}

/** Override pro Immobilie für Variante B (Plan + ggf. Verkaufsjahr). */
export interface ImmobilieOverride {
  plan?: ImmobilienPlan;
  verkaufsjahr?: number;
}

/** Szenario-Vergleich — optionale Variante B mit Overrides. */
export interface SzenarioBOverrides {
  // Pensionierungs-Stellschrauben
  bezugsalterP1?: number;
  bezugsalterP2?: number;
  ahvBezugsalterP1?: number;
  ahvBezugsalterP2?: number;
  bvgBezugspraeferenzP1?: BezugsPraeferenz;
  bvgBezugspraeferenzP2?: BezugsPraeferenz;
  // Cashflow-Stellschrauben
  /** Multiplikator auf alle Erwerbseinkommens-Perioden (z.B. 1.1 = +10%). */
  einkommensMultiplikator?: number;
  /** Override Wunschverbrauch in Pensionierung (CHF/Monat). */
  wunschverbrauchPension?: number | null;
  /** Override aktuelles Total-Budget (CHF/Monat). */
  ausgabenTotal?: number | null;
  /** Pro Immobilie: Plan-Override (Behalten ↔ Verkaufen) + Verkaufsjahr. */
  immobilienOverrides?: Record<string, ImmobilieOverride>;
}

export interface SzenarioB {
  aktiv: boolean;
  overrides: SzenarioBOverrides;
}

// ───────────────────────────────────────────────────────────────────
// Plan-Verwaltung (V35): A/B/C-Variantenrechnung mit Snapshot-Modell
// ───────────────────────────────────────────────────────────────────
//
// Stammdaten (Personalien, Adresse, Kinder, fallart, zivilstand) bleiben
// am Top-Level des State — geteilt zwischen allen Varianten. Beim Plan-
// Wechsel werden NUR die plan-spezifischen Felder (Variant-Slice) ge-
// tauscht.

export type PlanSlot = "a" | "b" | "c";

/**
 * Variant-Slice — alle Felder die pro Plan unterschiedlich sind.
 * Stammdaten (fallart, zivilstand, adresse, person1/2, kinder) sind NICHT
 * Teil davon: sie bleiben am Top-Level und werden geteilt.
 */
export interface PlanVariantData {
  ziele: ZieleWuensche;
  einmaligeAusgaben: EinmaligAusgabe[];
  budget: Budget;
  ahv: AhvInput;
  bvg: BvgInput;
  saeuleDrei: SaeuleDreiInput;
  vermoegen: VermoegenInput;
  immobilien: ImmobilienInput;
  firma: FirmaInput;
  nachlass: NachlassInput;
  anlagen: AnlagenInput;
  erbschaft: ErbschaftInput;
  wohnortPlan: WohnortPlanInput;
  versicherungen: VersicherungenInput;
  prioritaeten: PrioritaetenInput;
  erweitert: ErweitertInput;
}

export interface PlaeneRegister {
  a: PlanVariantData;
  b: PlanVariantData | null;
  c: PlanVariantData | null;
}

/** Nachlass — Block 10. Status pro Vorsorge-/Nachlassdokument. */
export type NachlassThemaKey =
  | "vorsorgeauftrag"
  | "patientenverfuegung"
  | "generalvollmacht"
  | "testament"
  | "erbvertrag"
  | "ehevertrag";

export type NachlassInput = Record<NachlassThemaKey, boolean>;

// ───────────────────────────────────────────────────────────────────
// Erweiterte Felder (Blöcke M, N, O, P, R aus Typeform-Spec)
// ───────────────────────────────────────────────────────────────────

export type Anlageerfahrung = "keine" | "wenig" | "moderat" | "ausgepraegt";
export type Risikobereitschaft =
  | "konservativ"
  | "ausgewogen"
  | "wachstum"
  | "aggressiv";
export type Anlagehorizont = "lt3j" | "3_7j" | "7_15j" | "gt15j";
export type Anlageform =
  | "etf"
  | "fonds"
  | "aktien"
  | "obligationen"
  | "immobilienfonds"
  | "krypto"
  | "strukturiert"
  | "keine";

/** Block M — Anlagen vertieft. */
export interface AnlagenInput {
  erfahrung: Anlageerfahrung | null;
  risikobereitschaft: Risikobereitschaft | null;
  horizont: Anlagehorizont | null;
  formen: Anlageform[];
  vermoegenAusland: boolean;
}

export type ErbschaftStatus = "ja_absehbar" | "moeglich" | "nein" | "keine_angabe";
export type ErbschaftGroesse = "lt200k" | "200k_1m" | "1m_5m" | "gt5m";
export type Gueterstand =
  | "errungenschaft"
  | "guetertrennung"
  | "guetergemeinschaft"
  | "weiss_nicht";

/** Status für Schenkungen / Erbvorbezüge an Kinder. */
export type SchenkungenStatus = "getaetigt" | "geplant" | "nein";

/** Block N — Erbschaft, Schenkung, Güterrecht. */
export interface ErbschaftInput {
  erwartet: ErbschaftStatus | null;
  /** @deprecated Stattdessen `erwartetBetrag` + `erwartetJahr` nutzen. */
  groessenordnung: ErbschaftGroesse | null;
  /** Erwarteter Erbschafts-Betrag (CHF) — wenn erwartet ja/möglich. */
  erwartetBetrag: number | null;
  /** Erwartetes Jahr der Erbschaft. */
  erwartetJahr: number | null;
  /**
   * Soll die Erbschaft im Cashflow / Vermögensverlauf berücksichtigt werden?
   * Default: false (vorsichtige Annahme — nur einrechnen wenn der Berater
   * explizit will).
   */
  erwartetBeruecksichtigen: boolean;
  /** Schenkungen / Erbvorbezüge: bereits getätigt, geplant oder nein. */
  schenkungenStatus: SchenkungenStatus | null;
  /** Schenkungs-Betrag (CHF) — wenn getätigt oder geplant. */
  schenkungenBetrag: number | null;
  /** Jahr der Schenkung. */
  schenkungenJahr: number | null;
  /**
   * Soll die Schenkung im Cashflow / Vermögensverlauf als Minus
   * berücksichtigt werden? Default true für getätigt (rückwirkend),
   * false für geplant (Berater entscheidet aktiv).
   */
  schenkungenBeruecksichtigen: boolean;
  schenkungenDetails: string;
  gueterstand: Gueterstand | null;
}

export type UmzugStatus = "ja" | "moeglich" | "nein";

/** Block O — Steuern & Wohnort (zusätzlich zu Adresse). */
export interface WohnortPlanInput {
  umzugStatus: UmzugStatus | null;
  umzugZiel: string;
}

/** Block P — Versicherungen. */
export interface VersicherungenInput {
  vvgVorhanden: boolean;
  lebensversicherungVorhanden: boolean;
  lebensversicherungDetails: string;
  gesundheitsthemen: string;
}

export type PrioritaetKey =
  | "sicheres_einkommen"
  | "steuern_optimieren"
  | "vermoegen_erhalten"
  | "vererben"
  | "frueher_pension"
  | "lebenstraum"
  | "liegenschaft_regeln"
  | "firma_regeln"
  | "andere";

/** Block R — Prioritäten. */
export interface PrioritaetenInput {
  /** Max. 3 ausgewählte Prioritäten. */
  ausgewaehlt: PrioritaetKey[];
  andereBeschreibung: string;
  zusaetzlicheAnliegen: string;
}

export type FirmaBezug =
  | "nur_lohn"
  | "lohn_dividenden"
  | "nur_dividenden"
  | "nein";

/** Lückenfelder aus Word-Doc, die in keinen eigenen Block passen. */
export interface ErweitertInput {
  // Block B
  zivilstandSeitJahr: number | null;
  unterhaltspflichten: boolean;
  unterhaltspflichtenDetails: string;

  // Block D
  pensionsvision: string; // D7 LT optional

  // Block H
  andereVermoegenswerte: string; // H6 Krypto/Gold/Sammlungen LT
  verbindlichkeitenAnderes: boolean; // H7
  verbindlichkeitenDetails: string; // H8

  // Block L
  firmaNachfolgeloesungEingeleitet: boolean; // L3
  firmaBezug: FirmaBezug | null; // L4

  // Block S
  dsgEinwilligung: boolean; // S3
}

export interface EinmaligAusgabe {
  id: string;
  jahr: number;
  betrag: number | null;
  beschreibung: string;
}

export interface ZieleWuensche {
  bezugsalterP1: number;
  bezugsalterP2: number;
}

export interface Einkommensperiode {
  id: string;
  beschreibung: string;
  personIdx: 1 | 2; // bei Einzelperson immer 1
  betragMonatlich: number | null;
  von: string; // ISO YYYY-MM, leer = offen
  bis: string; // ISO YYYY-MM, leer = offen / bis Pension
}

export type AusgabenModus = "total" | "detailliert";

export interface AusgabenKategorien {
  lebenshaltung: number | null;
  wohnen: number | null;
  mobilitaet: number | null;
  versicherungen: number | null;
  ferienHobby: number | null;
  sonstiges: number | null;
}

/**
 * Steuerlich relevante Religionszugehörigkeit. Wirkt auf Kirchensteuer:
 *  - katholisch (römisch-katholisch) → ESTV-Satz IncomeRateRoman
 *  - reformiert (evangelisch-reformiert) → IncomeRateProtestant
 *  - christkatholisch (Alt-Katholisch) → IncomeRateChrist (in ZH/AG/BS/SO/BE etc.)
 *  - israelitisch → eigene Gemeinden, in den ESTV-Faktoren nicht erfasst —
 *    wir setzen 0% (Beratung im Termin, kantonal unterschiedlich)
 *  - andere → 0% (z.B. orthodox, muslimisch — keine Landeskirche)
 *  - keine → 0%
 */
export type Religion =
  | "katholisch"
  | "reformiert"
  | "christkatholisch"
  | "israelitisch"
  | "andere"
  | "keine";

/**
 * Alimente/Unterhalt: laufende Unterhaltsbeiträge an Ex-Partner oder Kinder
 * sind nach Art. 33 Abs. 1 lit. c DBG vollumfänglich vom steuerbaren
 * Einkommen abzugsfähig. Sie sind ausserdem eine echte Cashflow-Ausgabe.
 */
export interface AlimenteInput {
  aktiv: boolean;
  betragJahr: number | null;
}

export interface Budget {
  einkommen: Einkommensperiode[];
  ausgabenModus: AusgabenModus;
  ausgabenTotal: number | null;
  ausgabenKategorien: AusgabenKategorien;
  wunschverbrauchPension: number | null;
  /** Anker fürs aktuelle Jahr: Total Einkommens-/Vermögenssteuer (laut letzter Veranlagung). */
  steuernHeute: number | null;
  /** Anker-Bruttojahreseinkommen, das zu `steuernHeute` gehört. */
  einkommenHeute: number | null;
  religion: Religion;
  /**
   * Alimente/Unterhaltsbeiträge (Art. 33 Abs. 1 lit. c DBG).
   * Voll vom steuerbaren Einkommen abzugsfähig + Cashflow-Ausgabe.
   */
  alimente: AlimenteInput;
}

export interface PlanState {
  fallart: Fallart;
  zivilstand: Zivilstand;
  adresse: Adresse;
  person1: PersonInput;
  person2: PersonInput;
  kinder: Kind[];
  ziele: ZieleWuensche;
  einmaligeAusgaben: EinmaligAusgabe[];
  budget: Budget;
  ahv: AhvInput;
  bvg: BvgInput;
  saeuleDrei: SaeuleDreiInput;
  vermoegen: VermoegenInput;
  immobilien: ImmobilienInput;
  firma: FirmaInput;
  nachlass: NachlassInput;
  // Erweiterte Slices (Word-Doc Blöcke M, N, O, P, R + Lücken)
  anlagen: AnlagenInput;
  erbschaft: ErbschaftInput;
  wohnortPlan: WohnortPlanInput;
  versicherungen: VersicherungenInput;
  prioritaeten: PrioritaetenInput;
  erweitert: ErweitertInput;
  szenarioB: SzenarioB;
  aktiverBlock: number;
  /** Plan-Verwaltung (V35): Snapshot-basierte A/B/C-Varianten. */
  aktiverPlan: PlanSlot;
  plaene: PlaeneRegister;

  setFallart: (v: Fallart) => void;
  setZivilstand: (v: Zivilstand) => void;
  setAdresse: (patch: Partial<Adresse>) => void;
  setPerson1: (patch: Partial<PersonInput>) => void;
  setPerson2: (patch: Partial<PersonInput>) => void;
  addKind: () => void;
  updateKind: (id: string, patch: Partial<Kind>) => void;
  removeKind: (id: string) => void;
  setZiele: (patch: Partial<ZieleWuensche>) => void;
  addEinmaligAusgabe: () => void;
  updateEinmaligAusgabe: (id: string, patch: Partial<EinmaligAusgabe>) => void;
  removeEinmaligAusgabe: (id: string) => void;
  addEinkommensperiode: () => void;
  updateEinkommensperiode: (id: string, patch: Partial<Einkommensperiode>) => void;
  removeEinkommensperiode: (id: string) => void;
  setAusgabenModus: (m: AusgabenModus) => void;
  setAusgabenTotal: (v: number | null) => void;
  setAusgabenKategorie: (key: keyof AusgabenKategorien, v: number | null) => void;
  setWunschverbrauchPension: (v: number | null) => void;
  setSteuerAnker: (steuern: number | null, einkommen: number | null) => void;
  setReligion: (r: Religion) => void;
  setAlimente: (patch: Partial<AlimenteInput>) => void;
  setAhv: (patch: Partial<AhvInput>) => void;
  setBvgP1: (patch: Partial<BvgPersonInput>) => void;
  setBvgP2: (patch: Partial<BvgPersonInput>) => void;
  addFreizuegigkeit: (
    personIdx: 1 | 2,
    initial?: Partial<Omit<FreizuegigkeitEntry, "id">>
  ) => void;
  updateFreizuegigkeit: (
    personIdx: 1 | 2,
    id: string,
    patch: Partial<FreizuegigkeitEntry>
  ) => void;
  removeFreizuegigkeit: (personIdx: 1 | 2, id: string) => void;
  addEinkauf: (personIdx: 1 | 2) => void;
  updateEinkauf: (
    personIdx: 1 | 2,
    id: string,
    patch: Partial<EinkaufEntry>
  ) => void;
  removeEinkauf: (personIdx: 1 | 2, id: string) => void;
  addWefVorbezug: (personIdx: 1 | 2) => void;
  updateWefVorbezug: (
    personIdx: 1 | 2,
    id: string,
    patch: Partial<WefVorbezugEntry>
  ) => void;
  removeWefVorbezug: (personIdx: 1 | 2, id: string) => void;
  addSaeuleDrei: (
    personIdx: 1 | 2,
    type: SaeuleDreiTyp,
    initial?: Partial<Omit<SaeuleDreiEntry, "id" | "type">>
  ) => void;
  updateSaeuleDrei: (
    personIdx: 1 | 2,
    id: string,
    patch: Partial<Omit<SaeuleDreiEntry, "id">>
  ) => void;
  removeSaeuleDrei: (personIdx: 1 | 2, id: string) => void;
  addVermoegen: (
    typ: VermoegenTyp,
    initial?: Partial<Omit<VermoegenItem, "id" | "typ" | "istHauptkonto">>
  ) => void;
  updateVermoegen: (id: string, patch: Partial<Omit<VermoegenItem, "id">>) => void;
  removeVermoegen: (id: string) => void;
  setHauptkonto: (id: string) => void;
  addImmobilie: (
    initial?: Partial<Omit<Immobilie, "id" | "hypotheken">>
  ) => void;
  updateImmobilie: (
    id: string,
    patch: Partial<Omit<Immobilie, "id" | "hypotheken">>
  ) => void;
  removeImmobilie: (id: string) => void;
  addHypothek: (
    immobilieId: string,
    initial?: Partial<Omit<Hypothek, "id">>
  ) => void;
  updateHypothek: (
    immobilieId: string,
    hypothekId: string,
    patch: Partial<Omit<Hypothek, "id">>
  ) => void;
  removeHypothek: (immobilieId: string, hypothekId: string) => void;
  setNachlass: (key: NachlassThemaKey, value: boolean) => void;
  setFirma: (patch: Partial<FirmaInput>) => void;
  setAnlagen: (patch: Partial<AnlagenInput>) => void;
  setErbschaft: (patch: Partial<ErbschaftInput>) => void;
  setWohnortPlan: (patch: Partial<WohnortPlanInput>) => void;
  setVersicherungen: (patch: Partial<VersicherungenInput>) => void;
  setPrioritaeten: (patch: Partial<PrioritaetenInput>) => void;
  setErweitert: (patch: Partial<ErweitertInput>) => void;
  setSzenarioBAktiv: (aktiv: boolean) => void;
  setSzenarioBOverride: (patch: Partial<SzenarioBOverrides>) => void;
  setAktiverBlock: (id: number) => void;
  // Plan-Setter (V35):
  /** Plan b oder c neu erstellen — klont basis-Plan in den Slot. */
  erstellePlan: (slot: "b" | "c", basis: PlanSlot) => void;
  /** Aktiven Plan wechseln (a/b/c). */
  wechsleZuPlan: (slot: PlanSlot) => void;
  /** Plan b oder c löschen. Aktivierung springt auf a zurück wenn nötig. */
  loeschePlan: (slot: "b" | "c") => void;
  /** Plan b oder c neu von a klonen (Reset). */
  resetPlanZuA: (slot: "b" | "c") => void;
  reset: () => void;
  /** Vollen State aus einem Import-Object (V2-Submission) übernehmen. */
  importState: (snapshot: Partial<PlanState>) => void;
}

const initialPerson: PersonInput = {
  vorname: "",
  nachname: "",
  geburtsdatum: "",
  geschlecht: null,
  telefon: "",
  email: "",
};

const initialAhv: AhvInput = {
  einkommenP1: null,
  einkommenP2: null,
  hatIkAuszugP1: false,
  hatIkAuszugP2: false,
  hatFehljahreP1: false,
  hatFehljahreP2: false,
  fehljahreAnzahlP1: 0,
  fehljahreAnzahlP2: 0,
  ahvBezugsalterP1: 65,
  ahvBezugsalterP2: 65,
};

const initialBvgPerson: BvgPersonInput = {
  aktiverAnschluss: true,
  altersguthabenHeute: null,
  altersguthabenBeiBezug: null,
  // Default 5.5% statt BVG-Mindestsatz 6.8% — realistischer, weil PK-
  // Reglemente landesweit gesunken sind. Empirisch aus Berater-Plänen
  // (Franziska PKSZ ≈ 5.25%, SSM-Standardannahme).
  umwandlungssatzProzent: 5.5,
  bezugspraeferenz: "rente",
  kapitalanteil: 50,
  freizuegigkeit: [],
  einkaeufe: [],
  wefVorbezuege: [],
};

const initialBvg: BvgInput = {
  p1: { ...initialBvgPerson },
  p2: { ...initialBvgPerson },
};

const initialAdresse: Adresse = {
  strasse: "",
  plz: "",
  ort: "",
  kanton: "",
  gemeindeBfsId: null,
  gemeindeName: "",
};

const initialZiele: ZieleWuensche = {
  bezugsalterP1: 65,
  bezugsalterP2: 65,
};

const initialBudget: Budget = {
  einkommen: [],
  ausgabenModus: "total",
  ausgabenTotal: null,
  ausgabenKategorien: {
    lebenshaltung: null,
    wohnen: null,
    mobilitaet: null,
    versicherungen: null,
    ferienHobby: null,
    sonstiges: null,
  },
  wunschverbrauchPension: null,
  steuernHeute: null,
  einkommenHeute: null,
  religion: "keine",
  alimente: { aktiv: false, betragJahr: null },
};

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function makeInitialVermoegen(): VermoegenInput {
  // Bewusst leer — der Berater fügt selbst Konten hinzu. Das erste
  // hinzugefügte Aktiv-Konto wird automatisch zum Hauptkonto (siehe
  // addVermoegen). Default-"Privatkonto" wirkt sonst wie schon erfasst.
  return { items: [] };
}

function isZivilstandEinzel(z: Zivilstand): z is ZivilstandEinzel {
  return ZIVILSTAND_EINZEL.some((e) => e.value === z);
}

/**
 * Extrahiert die Variant-Felder aus einem PlanState — verwendet beim
 * Snapshot-Speichern (vor Plan-Switch / vor Plan-Erstellung).
 */
function extractVariant(state: PlanState): PlanVariantData {
  return {
    ziele: state.ziele,
    einmaligeAusgaben: state.einmaligeAusgaben,
    budget: state.budget,
    ahv: state.ahv,
    bvg: state.bvg,
    saeuleDrei: state.saeuleDrei,
    vermoegen: state.vermoegen,
    immobilien: state.immobilien,
    firma: state.firma,
    nachlass: state.nachlass,
    anlagen: state.anlagen,
    erbschaft: state.erbschaft,
    wohnortPlan: state.wohnortPlan,
    versicherungen: state.versicherungen,
    prioritaeten: state.prioritaeten,
    erweitert: state.erweitert,
  };
}

/**
 * Tiefer Klon einer Variant — JSON-basiert (Plan-Daten sind reine Daten,
 * keine Funktionen, keine Date-Objekte → JSON-safe).
 */
function cloneVariant(v: PlanVariantData): PlanVariantData {
  return JSON.parse(JSON.stringify(v));
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      fallart: "einzel",
      zivilstand: "ledig",
      adresse: { ...initialAdresse },
      person1: { ...initialPerson },
      person2: { ...initialPerson },
      kinder: [],
      ziele: { ...initialZiele },
      einmaligeAusgaben: [],
      budget: { ...initialBudget },
      ahv: { ...initialAhv },
      bvg: { p1: { ...initialBvgPerson }, p2: { ...initialBvgPerson } },
      saeuleDrei: { p1: [], p2: [] },
      vermoegen: makeInitialVermoegen(),
      immobilien: { items: [] },
      firma: {
        vorhanden: false,
        firmenname: "",
        moeglicherVerkaufserloes: null,
        plan: "behalten",
        verkaufsjahr: new Date().getFullYear() + 10,
      },
      nachlass: {
        vorsorgeauftrag: false,
        patientenverfuegung: false,
        generalvollmacht: false,
        testament: false,
        erbvertrag: false,
        ehevertrag: false,
      },
      anlagen: {
        erfahrung: null,
        risikobereitschaft: null,
        horizont: null,
        formen: [],
        vermoegenAusland: false,
      },
      erbschaft: {
        erwartet: null,
        groessenordnung: null,
        erwartetBetrag: null,
        erwartetJahr: null,
        erwartetBeruecksichtigen: false,
        schenkungenStatus: null,
        schenkungenBetrag: null,
        schenkungenJahr: null,
        schenkungenBeruecksichtigen: false,
        schenkungenDetails: "",
        gueterstand: null,
      },
      wohnortPlan: {
        umzugStatus: null,
        umzugZiel: "",
      },
      versicherungen: {
        vvgVorhanden: false,
        lebensversicherungVorhanden: false,
        lebensversicherungDetails: "",
        gesundheitsthemen: "",
      },
      prioritaeten: {
        ausgewaehlt: [],
        andereBeschreibung: "",
        zusaetzlicheAnliegen: "",
      },
      erweitert: {
        zivilstandSeitJahr: null,
        unterhaltspflichten: false,
        unterhaltspflichtenDetails: "",
        pensionsvision: "",
        andereVermoegenswerte: "",
        verbindlichkeitenAnderes: false,
        verbindlichkeitenDetails: "",
        firmaNachfolgeloesungEingeleitet: false,
        firmaBezug: null,
        dsgEinwilligung: false,
      },
      szenarioB: {
        aktiv: false,
        overrides: {},
      },
      aktiverBlock: 1,
      // V35: Plan-Verwaltung. Plan A wird beim ersten Setter implizit
      // initialisiert (Top-Level = Plan A solange aktiverPlan === "a").
      aktiverPlan: "a",
      plaene: {
        // Plan A bekommt einen Initial-Snapshot der Default-Werte. Das
        // ist nicht strikt nötig (Top-Level ist Source of Truth bei
        // aktiverPlan === "a") — aber konsistent fürs Mental-Model.
        a: {
          ziele: initialZiele,
          einmaligeAusgaben: [],
          budget: initialBudget,
          ahv: {
            einkommenP1: null,
            einkommenP2: null,
            hatIkAuszugP1: false,
            hatIkAuszugP2: false,
            hatFehljahreP1: false,
            hatFehljahreP2: false,
            fehljahreAnzahlP1: 0,
            fehljahreAnzahlP2: 0,
            ahvBezugsalterP1: 65,
            ahvBezugsalterP2: 65,
          },
          bvg: initialBvg,
          saeuleDrei: { p1: [], p2: [] },
          vermoegen: makeInitialVermoegen(),
          immobilien: { items: [] },
          firma: {
            vorhanden: false,
            firmenname: "",
            moeglicherVerkaufserloes: null,
            plan: "behalten",
            verkaufsjahr: new Date().getFullYear() + 10,
          },
          nachlass: {
            vorsorgeauftrag: false,
            patientenverfuegung: false,
            generalvollmacht: false,
            testament: false,
            erbvertrag: false,
            ehevertrag: false,
          },
          anlagen: {
            erfahrung: null,
            risikobereitschaft: null,
            horizont: null,
            formen: [],
            vermoegenAusland: false,
          },
          erbschaft: {
            erwartet: null,
            groessenordnung: null,
            erwartetBetrag: null,
            erwartetJahr: null,
            erwartetBeruecksichtigen: false,
            schenkungenStatus: null,
            schenkungenDetails: "",
            schenkungenBetrag: null,
            schenkungenJahr: null,
            schenkungenBeruecksichtigen: false,
            gueterstand: null,
          },
          wohnortPlan: { umzugStatus: null, umzugZiel: "" },
          versicherungen: {
            vvgVorhanden: false,
            lebensversicherungVorhanden: false,
            lebensversicherungDetails: "",
            gesundheitsthemen: "",
          },
          prioritaeten: {
            ausgewaehlt: [],
            andereBeschreibung: "",
            zusaetzlicheAnliegen: "",
          },
          erweitert: {
            zivilstandSeitJahr: null,
            unterhaltspflichten: false,
            unterhaltspflichtenDetails: "",
            pensionsvision: "",
            andereVermoegenswerte: "",
            verbindlichkeitenAnderes: false,
            verbindlichkeitenDetails: "",
            firmaNachfolgeloesungEingeleitet: false,
            firmaBezug: null,
            dsgEinwilligung: false,
          },
        },
        b: null,
        c: null,
      },

      setFallart: (fallart) =>
        set((s) => {
          const wantsEinzel = fallart === "einzel";
          const currentlyEinzel = isZivilstandEinzel(s.zivilstand);
          let zivilstand = s.zivilstand;
          if (wantsEinzel && !currentlyEinzel) zivilstand = "ledig";
          if (!wantsEinzel && currentlyEinzel) zivilstand = "verheiratet";
          return { fallart, zivilstand };
        }),
      setZivilstand: (zivilstand) => set({ zivilstand }),
      setAdresse: (patch) => set((s) => ({ adresse: { ...s.adresse, ...patch } })),
      setPerson1: (patch) => set((s) => ({ person1: { ...s.person1, ...patch } })),
      setPerson2: (patch) => set((s) => ({ person2: { ...s.person2, ...patch } })),
      addKind: () =>
        set((s) => ({
          kinder: [
            ...s.kinder,
            {
              id: newId(),
              vorname: "",
              geburtsdatum: "",
              zuordnung: s.fallart === "paar" ? "gemeinsam" : "p1",
              ausbildungBisJahr: null,
            },
          ],
        })),
      updateKind: (id, patch) =>
        set((s) => ({
          kinder: s.kinder.map((k) => (k.id === id ? { ...k, ...patch } : k)),
        })),
      removeKind: (id) =>
        set((s) => ({ kinder: s.kinder.filter((k) => k.id !== id) })),
      setZiele: (patch) => set((s) => ({ ziele: { ...s.ziele, ...patch } })),
      addEinmaligAusgabe: () =>
        set((s) => ({
          einmaligeAusgaben: [
            ...s.einmaligeAusgaben,
            {
              id: newId(),
              jahr: new Date().getFullYear() + 1,
              betrag: null,
              beschreibung: "",
            },
          ],
        })),
      updateEinmaligAusgabe: (id, patch) =>
        set((s) => ({
          einmaligeAusgaben: s.einmaligeAusgaben.map((a) =>
            a.id === id ? { ...a, ...patch } : a
          ),
        })),
      removeEinmaligAusgabe: (id) =>
        set((s) => ({
          einmaligeAusgaben: s.einmaligeAusgaben.filter((a) => a.id !== id),
        })),
      addEinkommensperiode: () =>
        set((s) => ({
          budget: {
            ...s.budget,
            einkommen: [
              ...s.budget.einkommen,
              {
                id: newId(),
                beschreibung: "",
                personIdx: 1,
                betragMonatlich: null,
                von: currentYearMonth(),
                bis: "",
              },
            ],
          },
        })),
      updateEinkommensperiode: (id, patch) =>
        set((s) => ({
          budget: {
            ...s.budget,
            einkommen: s.budget.einkommen.map((e) =>
              e.id === id ? { ...e, ...patch } : e
            ),
          },
        })),
      removeEinkommensperiode: (id) =>
        set((s) => ({
          budget: {
            ...s.budget,
            einkommen: s.budget.einkommen.filter((e) => e.id !== id),
          },
        })),
      setAusgabenModus: (m) =>
        set((s) => ({ budget: { ...s.budget, ausgabenModus: m } })),
      setAusgabenTotal: (v) =>
        set((s) => ({ budget: { ...s.budget, ausgabenTotal: v } })),
      setAusgabenKategorie: (key, v) =>
        set((s) => ({
          budget: {
            ...s.budget,
            ausgabenKategorien: { ...s.budget.ausgabenKategorien, [key]: v },
          },
        })),
      setWunschverbrauchPension: (v) =>
        set((s) => ({ budget: { ...s.budget, wunschverbrauchPension: v } })),
      setSteuerAnker: (steuern, einkommen) =>
        set((s) => ({
          budget: { ...s.budget, steuernHeute: steuern, einkommenHeute: einkommen },
        })),
      setReligion: (r) => set((s) => ({ budget: { ...s.budget, religion: r } })),
      setAlimente: (patch) =>
        set((s) => ({
          budget: { ...s.budget, alimente: { ...s.budget.alimente, ...patch } },
        })),
      setAhv: (patch) => set((s) => ({ ahv: { ...s.ahv, ...patch } })),
      setBvgP1: (patch) =>
        set((s) => ({ bvg: { ...s.bvg, p1: { ...s.bvg.p1, ...patch } } })),
      setBvgP2: (patch) =>
        set((s) => ({ bvg: { ...s.bvg, p2: { ...s.bvg.p2, ...patch } } })),
      addFreizuegigkeit: (personIdx, initial) =>
        set((s) => {
          const key = personIdx === 1 ? "p1" : "p2";
          return {
            bvg: {
              ...s.bvg,
              [key]: {
                ...s.bvg[key],
                freizuegigkeit: [
                  ...s.bvg[key].freizuegigkeit,
                  {
                    id: newId(),
                    beschreibung: initial?.beschreibung ?? "",
                    // Default 0 — Cashflow-Saldo wird von Anfang an ins
                  // Hauptkonto verbucht, auch ohne initialen User-Eintrag.
                  saldoHeute: initial?.saldoHeute ?? 0,
                    auszahlungsjahr:
                      initial?.auszahlungsjahr ?? new Date().getFullYear() + 5,
                    renditeProzent: initial?.renditeProzent ?? 0,
                  },
                ],
              },
            },
          };
        }),
      updateFreizuegigkeit: (personIdx, id, patch) =>
        set((s) => {
          const key = personIdx === 1 ? "p1" : "p2";
          return {
            bvg: {
              ...s.bvg,
              [key]: {
                ...s.bvg[key],
                freizuegigkeit: s.bvg[key].freizuegigkeit.map((f) =>
                  f.id === id ? { ...f, ...patch } : f
                ),
              },
            },
          };
        }),
      removeFreizuegigkeit: (personIdx, id) =>
        set((s) => {
          const key = personIdx === 1 ? "p1" : "p2";
          return {
            bvg: {
              ...s.bvg,
              [key]: {
                ...s.bvg[key],
                freizuegigkeit: s.bvg[key].freizuegigkeit.filter((f) => f.id !== id),
              },
            },
          };
        }),
      addEinkauf: (personIdx) =>
        set((s) => {
          const key = personIdx === 1 ? "p1" : "p2";
          return {
            bvg: {
              ...s.bvg,
              [key]: {
                ...s.bvg[key],
                einkaeufe: [
                  ...s.bvg[key].einkaeufe,
                  {
                    id: newId(),
                    jahr: new Date().getFullYear() + 1,
                    betrag: null,
                    serie: false,
                  },
                ],
              },
            },
          };
        }),
      updateEinkauf: (personIdx, id, patch) =>
        set((s) => {
          const key = personIdx === 1 ? "p1" : "p2";
          return {
            bvg: {
              ...s.bvg,
              [key]: {
                ...s.bvg[key],
                einkaeufe: s.bvg[key].einkaeufe.map((e) =>
                  e.id === id ? { ...e, ...patch } : e
                ),
              },
            },
          };
        }),
      removeEinkauf: (personIdx, id) =>
        set((s) => {
          const key = personIdx === 1 ? "p1" : "p2";
          return {
            bvg: {
              ...s.bvg,
              [key]: {
                ...s.bvg[key],
                einkaeufe: s.bvg[key].einkaeufe.filter((e) => e.id !== id),
              },
            },
          };
        }),
      addWefVorbezug: (personIdx) =>
        set((s) => {
          const key = personIdx === 1 ? "p1" : "p2";
          return {
            bvg: {
              ...s.bvg,
              [key]: {
                ...s.bvg[key],
                wefVorbezuege: [
                  ...(s.bvg[key].wefVorbezuege ?? []),
                  {
                    id: newId(),
                    jahr: new Date().getFullYear(),
                    betrag: null,
                    beschreibung: "",
                    immoId: null,
                  },
                ],
              },
            },
          };
        }),
      updateWefVorbezug: (personIdx, id, patch) =>
        set((s) => {
          const key = personIdx === 1 ? "p1" : "p2";
          return {
            bvg: {
              ...s.bvg,
              [key]: {
                ...s.bvg[key],
                wefVorbezuege: (s.bvg[key].wefVorbezuege ?? []).map((e) =>
                  e.id === id ? { ...e, ...patch } : e
                ),
              },
            },
          };
        }),
      removeWefVorbezug: (personIdx, id) =>
        set((s) => {
          const key = personIdx === 1 ? "p1" : "p2";
          return {
            bvg: {
              ...s.bvg,
              [key]: {
                ...s.bvg[key],
                wefVorbezuege: (s.bvg[key].wefVorbezuege ?? []).filter(
                  (e) => e.id !== id
                ),
              },
            },
          };
        }),
      addSaeuleDrei: (personIdx, type, initial) =>
        set((s) => {
          const key = personIdx === 1 ? "p1" : "p2";
          const aktJahr = new Date().getFullYear();
          const naechstesJahr = aktJahr + 5;
          const neu: SaeuleDreiEntry = {
            id: newId(),
            type,
            // Default 3a (Konten gibt's nur in 3a, Versicherung Default 3a).
            // User kann bei Versicherung auf 3b umstellen.
            saeule: initial?.saeule ?? "3a",
            beschreibung: initial?.beschreibung ?? "",
            aktuellerWert: initial?.aktuellerWert ?? null,
            auszahlungsjahr: initial?.auszahlungsjahr ?? naechstesJahr,
            renditeProzent: initial?.renditeProzent ?? 1.5,
            rueckkaufswert: initial?.rueckkaufswert ?? null,
            ablaufswert: initial?.ablaufswert ?? null,
            ablaufjahr: initial?.ablaufjahr ?? naechstesJahr,
            jaehrlicheEinzahlung: initial?.jaehrlicheEinzahlung ?? null,
            einzahlungAb: initial?.einzahlungAb ?? aktJahr,
            einzahlungBis: initial?.einzahlungBis ?? naechstesJahr - 1,
          };
          return {
            saeuleDrei: {
              ...s.saeuleDrei,
              [key]: [...s.saeuleDrei[key], neu],
            },
          };
        }),
      updateSaeuleDrei: (personIdx, id, patch) =>
        set((s) => {
          const key = personIdx === 1 ? "p1" : "p2";
          return {
            saeuleDrei: {
              ...s.saeuleDrei,
              [key]: s.saeuleDrei[key].map((e) =>
                e.id === id ? { ...e, ...patch } : e
              ),
            },
          };
        }),
      removeSaeuleDrei: (personIdx, id) =>
        set((s) => {
          const key = personIdx === 1 ? "p1" : "p2";
          return {
            saeuleDrei: {
              ...s.saeuleDrei,
              [key]: s.saeuleDrei[key].filter((e) => e.id !== id),
            },
          };
        }),
      addVermoegen: (typ, initial) =>
        set((s) => {
          // Erstes Aktiv-Item (Konto/Depot) wird automatisch zum
          // Hauptkonto, sonst hätte die Cashflow-Engine keinen Anker.
          // Darlehen können nicht Hauptkonto sein.
          const keinAktivumVorhanden = !s.vermoegen.items.some(
            (it) => it.typ !== "darlehen"
          );
          const sollHauptkontoSein =
            typ !== "darlehen" && keinAktivumVorhanden;
          return {
            vermoegen: {
              items: [
                ...s.vermoegen.items,
                {
                  id: newId(),
                  typ,
                  beschreibung: initial?.beschreibung ?? "",
                  // Default 0 — Cashflow-Saldo wird von Anfang an ins
                  // Hauptkonto verbucht, auch ohne initialen User-Eintrag.
                  saldoHeute: initial?.saldoHeute ?? 0,
                  renditeProzent: initial?.renditeProzent ?? 0,
                  istHauptkonto: sollHauptkontoSein,
                },
              ],
            },
          };
        }),
      updateVermoegen: (id, patch) =>
        set((s) => ({
          vermoegen: {
            items: s.vermoegen.items.map((it) =>
              it.id === id ? { ...it, ...patch } : it
            ),
          },
        })),
      removeVermoegen: (id) =>
        set((s) => {
          const target = s.vermoegen.items.find((it) => it.id === id);
          const rest = s.vermoegen.items.filter((it) => it.id !== id);
          // Wenn das Hauptkonto entfernt wurde, mach das erste Nicht-Darlehen
          // dazu — ein Darlehen darf nicht Hauptkonto sein (würde Cashflow-
          // Logik brechen). Cashflow-Engine handhabt leere Listen safe.
          if (target?.istHauptkonto && rest.length > 0) {
            const ersteAktiva = rest.find((it) => it.typ !== "darlehen");
            if (ersteAktiva) {
              return {
                vermoegen: {
                  items: rest.map((it) =>
                    it.id === ersteAktiva.id
                      ? { ...it, istHauptkonto: true }
                      : it
                  ),
                },
              };
            }
          }
          return { vermoegen: { items: rest } };
        }),
      setHauptkonto: (id) =>
        set((s) => ({
          vermoegen: {
            items: s.vermoegen.items.map((it) => ({
              ...it,
              // Ein Darlehen kann nicht Hauptkonto sein — wenn der User das
              // versucht, wird der Aufruf ignoriert.
              istHauptkonto:
                it.id === id && it.typ !== "darlehen" ? true : false,
            })),
          },
        })),
      addImmobilie: (initial) =>
        set((s) => {
          const jahr = new Date().getFullYear();
          const neu: Immobilie = {
            id: newId(),
            beschreibung: initial?.beschreibung ?? "",
            typ: initial?.typ ?? "selbstbewohnt",
            verkehrswert: initial?.verkehrswert ?? null,
            hypotheken: [],
            plan: initial?.plan ?? "behalten",
            verkaufsjahr: initial?.verkaufsjahr ?? jahr + 10,
            jaehrlicheMieteinnahmen: initial?.jaehrlicheMieteinnahmen ?? null,
            wertsteigerungProzent: initial?.wertsteigerungProzent ?? null,
            kaufjahr: initial?.kaufjahr ?? null,
            anlagekosten: initial?.anlagekosten ?? null,
            wertvermehrendeInvestitionen:
              initial?.wertvermehrendeInvestitionen ?? null,
            adresse: initial?.adresse ?? null,
          };
          return { immobilien: { items: [...s.immobilien.items, neu] } };
        }),
      updateImmobilie: (id, patch) =>
        set((s) => ({
          immobilien: {
            items: s.immobilien.items.map((im) =>
              im.id === id ? { ...im, ...patch } : im
            ),
          },
        })),
      removeImmobilie: (id) =>
        set((s) => ({
          immobilien: {
            items: s.immobilien.items.filter((im) => im.id !== id),
          },
        })),
      addHypothek: (immobilieId, initial) =>
        set((s) => {
          const neueHypothek: Hypothek = {
            id: newId(),
            beschreibung: initial?.beschreibung ?? "",
            hoehe: initial?.hoehe ?? null,
            zinssatzProzent: initial?.zinssatzProzent ?? 1.5,
            ablaufjahr: initial?.ablaufjahr ?? new Date().getFullYear() + 5,
          };
          return {
            immobilien: {
              items: s.immobilien.items.map((im) =>
                im.id === immobilieId
                  ? { ...im, hypotheken: [...im.hypotheken, neueHypothek] }
                  : im
              ),
            },
          };
        }),
      updateHypothek: (immobilieId, hypothekId, patch) =>
        set((s) => ({
          immobilien: {
            items: s.immobilien.items.map((im) =>
              im.id === immobilieId
                ? {
                    ...im,
                    hypotheken: im.hypotheken.map((h) =>
                      h.id === hypothekId ? { ...h, ...patch } : h
                    ),
                  }
                : im
            ),
          },
        })),
      removeHypothek: (immobilieId, hypothekId) =>
        set((s) => ({
          immobilien: {
            items: s.immobilien.items.map((im) =>
              im.id === immobilieId
                ? {
                    ...im,
                    hypotheken: im.hypotheken.filter((h) => h.id !== hypothekId),
                  }
                : im
            ),
          },
        })),
      setNachlass: (key, value) =>
        set((s) => ({ nachlass: { ...s.nachlass, [key]: value } })),
      setFirma: (patch) => set((s) => ({ firma: { ...s.firma, ...patch } })),
      setAnlagen: (patch) =>
        set((s) => ({ anlagen: { ...s.anlagen, ...patch } })),
      setErbschaft: (patch) =>
        set((s) => ({ erbschaft: { ...s.erbschaft, ...patch } })),
      setWohnortPlan: (patch) =>
        set((s) => ({ wohnortPlan: { ...s.wohnortPlan, ...patch } })),
      setVersicherungen: (patch) =>
        set((s) => ({ versicherungen: { ...s.versicherungen, ...patch } })),
      setPrioritaeten: (patch) =>
        set((s) => ({ prioritaeten: { ...s.prioritaeten, ...patch } })),
      setErweitert: (patch) =>
        set((s) => ({ erweitert: { ...s.erweitert, ...patch } })),
      importState: (snapshot) => set(() => snapshot),
      setSzenarioBAktiv: (aktiv) =>
        set((s) => ({ szenarioB: { ...s.szenarioB, aktiv } })),
      setSzenarioBOverride: (patch) =>
        set((s) => ({
          szenarioB: {
            ...s.szenarioB,
            overrides: { ...s.szenarioB.overrides, ...patch },
          },
        })),
      setAktiverBlock: (aktiverBlock) => set({ aktiverBlock }),

      // ── Plan-Setter (V35) ──────────────────────────────────────────
      erstellePlan: (slot, basis) =>
        set((s) => {
          // 1. Aktuellen Top-Level-Variant als Snapshot in plaene[aktiv]
          //    speichern (sonst gehen aktuelle Edits verloren bei Switch).
          const aktuellerSnapshot = extractVariant(s);
          const plaeneMitAktuellem = {
            ...s.plaene,
            [s.aktiverPlan]: aktuellerSnapshot,
          };
          // 2. Basis-Slot lesen (kann selber aktueller Plan sein).
          const basisVariant =
            basis === s.aktiverPlan
              ? aktuellerSnapshot
              : plaeneMitAktuellem[basis];
          if (!basisVariant) return s;
          // 3. Klonen → neuer Slot
          const klon = cloneVariant(basisVariant);
          // 4. Top-Level auf neuen Plan setzen
          return {
            plaene: {
              ...plaeneMitAktuellem,
              [slot]: klon,
            },
            aktiverPlan: slot,
            ...klon,
          };
        }),
      wechsleZuPlan: (slot) =>
        set((s) => {
          if (slot === s.aktiverPlan) return s;
          if (slot !== "a" && !s.plaene[slot]) return s;
          const aktuellerSnapshot = extractVariant(s);
          const zielVariant = s.plaene[slot];
          if (!zielVariant) return s;
          return {
            plaene: {
              ...s.plaene,
              [s.aktiverPlan]: aktuellerSnapshot,
            },
            aktiverPlan: slot,
            ...zielVariant,
          };
        }),
      loeschePlan: (slot) =>
        set((s) => {
          const next: PlaeneRegister = { ...s.plaene, [slot]: null };
          // Wenn der gelöschte Plan gerade aktiv war → zu Plan A wechseln
          if (s.aktiverPlan === slot) {
            const variantA = next.a;
            return { plaene: next, aktiverPlan: "a", ...variantA };
          }
          return { plaene: next };
        }),
      resetPlanZuA: (slot) =>
        set((s) => {
          // Plan A immer lesefrisch (Top-Level wenn aktiv, sonst plaene.a).
          const planA =
            s.aktiverPlan === "a" ? extractVariant(s) : s.plaene.a;
          const klon = cloneVariant(planA);
          const next: PlaeneRegister = { ...s.plaene, [slot]: klon };
          // Wenn der zurückgesetzte Plan aktuell aktiv → Top-Level updaten
          if (s.aktiverPlan === slot) {
            return { plaene: next, ...klon };
          }
          return { plaene: next };
        }),

      reset: () =>
        set({
          fallart: "einzel",
          zivilstand: "ledig",
          adresse: { ...initialAdresse },
          person1: { ...initialPerson },
          person2: { ...initialPerson },
          kinder: [],
          ziele: { ...initialZiele },
          einmaligeAusgaben: [],
          budget: { ...initialBudget },
          ahv: { ...initialAhv },
          bvg: { p1: { ...initialBvgPerson }, p2: { ...initialBvgPerson } },
          saeuleDrei: { p1: [], p2: [] },
          vermoegen: makeInitialVermoegen(),
          immobilien: { items: [] },
          firma: {
            vorhanden: false,
            firmenname: "",
            moeglicherVerkaufserloes: null,
            plan: "behalten",
            verkaufsjahr: new Date().getFullYear() + 10,
          },
          nachlass: {
            vorsorgeauftrag: false,
            patientenverfuegung: false,
            generalvollmacht: false,
            testament: false,
            erbvertrag: false,
            ehevertrag: false,
          },
          anlagen: {
            erfahrung: null,
            risikobereitschaft: null,
            horizont: null,
            formen: [],
            vermoegenAusland: false,
          },
          erbschaft: {
            erwartet: null,
            groessenordnung: null,
            erwartetBetrag: null,
            erwartetJahr: null,
            erwartetBeruecksichtigen: false,
            schenkungenStatus: null,
            schenkungenBetrag: null,
            schenkungenJahr: null,
            schenkungenBeruecksichtigen: false,
            schenkungenDetails: "",
            gueterstand: null,
          },
          wohnortPlan: {
            umzugStatus: null,
            umzugZiel: "",
          },
          versicherungen: {
            vvgVorhanden: false,
            lebensversicherungVorhanden: false,
            lebensversicherungDetails: "",
            gesundheitsthemen: "",
          },
          prioritaeten: {
            ausgewaehlt: [],
            andereBeschreibung: "",
            zusaetzlicheAnliegen: "",
          },
          erweitert: {
            zivilstandSeitJahr: null,
            unterhaltspflichten: false,
            unterhaltspflichtenDetails: "",
            pensionsvision: "",
            andereVermoegenswerte: "",
            verbindlichkeitenAnderes: false,
            verbindlichkeitenDetails: "",
            firmaNachfolgeloesungEingeleitet: false,
            firmaBezug: null,
            dsgEinwilligung: false,
          },
          szenarioB: {
            aktiv: false,
            overrides: {},
          },
          aktiverBlock: 1,
          aktiverPlan: "a",
          plaene: {
            a: extractVariant({
              fallart: "einzel",
              zivilstand: "ledig",
              adresse: { ...initialAdresse },
              person1: { ...initialPerson },
              person2: { ...initialPerson },
              kinder: [],
              ziele: { ...initialZiele },
              einmaligeAusgaben: [],
              budget: { ...initialBudget },
              ahv: { ...initialAhv },
              bvg: { p1: { ...initialBvgPerson }, p2: { ...initialBvgPerson } },
              saeuleDrei: { p1: [], p2: [] },
              vermoegen: makeInitialVermoegen(),
              immobilien: { items: [] },
              firma: {
                vorhanden: false,
                firmenname: "",
                moeglicherVerkaufserloes: null,
                plan: "behalten",
                verkaufsjahr: new Date().getFullYear() + 10,
              },
              nachlass: {
                vorsorgeauftrag: false,
                patientenverfuegung: false,
                generalvollmacht: false,
                testament: false,
                erbvertrag: false,
                ehevertrag: false,
              },
              anlagen: {
                erfahrung: null,
                risikobereitschaft: null,
                horizont: null,
                formen: [],
                vermoegenAusland: false,
              },
              erbschaft: {
                erwartet: null,
                groessenordnung: null,
                erwartetBetrag: null,
                erwartetJahr: null,
                erwartetBeruecksichtigen: false,
                schenkungenStatus: null,
                schenkungenDetails: "",
                schenkungenBetrag: null,
                schenkungenJahr: null,
                schenkungenBeruecksichtigen: false,
                gueterstand: null,
              },
              wohnortPlan: { umzugStatus: null, umzugZiel: "" },
              versicherungen: {
                vvgVorhanden: false,
                lebensversicherungVorhanden: false,
                lebensversicherungDetails: "",
                gesundheitsthemen: "",
              },
              prioritaeten: {
                ausgewaehlt: [],
                andereBeschreibung: "",
                zusaetzlicheAnliegen: "",
              },
              erweitert: {
                zivilstandSeitJahr: null,
                unterhaltspflichten: false,
                unterhaltspflichtenDetails: "",
                pensionsvision: "",
                andereVermoegenswerte: "",
                verbindlichkeitenAnderes: false,
                verbindlichkeitenDetails: "",
                firmaNachfolgeloesungEingeleitet: false,
                firmaBezug: null,
                dsgEinwilligung: false,
              },
            } as unknown as PlanState),
            b: null,
            c: null,
          },
        }),
    }),
    {
      name: "cuira-plan-v37",
      version: 37,
      migrate: (persistedState: unknown, fromVersion: number): unknown => {
        let state = persistedState as Record<string, unknown> & {
          szenarioB?: { aktiv: boolean };
          saeuleDrei?: { p1: SaeuleDreiEntry[]; p2: SaeuleDreiEntry[] };
          plaene?: PlaeneRegister;
          budget?: Budget;
          bvg?: BvgInput;
        };
        // v34 → v35: Top-Level → plaene
        if (fromVersion < 35) {
          const planA = extractVariant(state as unknown as PlanState);
          const planB =
            state.szenarioB?.aktiv === true ? cloneVariant(planA) : null;
          state = {
            ...state,
            aktiverPlan: "a",
            plaene: { a: planA, b: planB, c: null },
          };
        }
        // v36 → v37: Drei neue Felder mit Defaults
        //   1. Budget.alimente — { aktiv: false, betragJahr: null }
        //   2. EinkaufEntry.serie — default false (Einzel-Einkauf)
        //   3. Immobilie.eigenmietwertProzent — bleibt undefined (Engine
        //      nimmt Default 1.13 %, gilt nur bis Steuerjahr 2029)
        //
        // Wir lassen Migrationen für v36 später drin und führen die v37-
        // Migration unterhalb aus.

        // v35 → v36: SaeuleDreiEntry.saeule Default "3a" für Bestands-Items
        if (fromVersion < 36) {
          const addSaeule = (entries: SaeuleDreiEntry[]): SaeuleDreiEntry[] =>
            entries.map((e) => {
              const raw = e as unknown as Record<string, unknown>;
              if ("saeule" in raw) return e;
              return { ...e, saeule: "3a" as const };
            });
          if (state.saeuleDrei) {
            state.saeuleDrei = {
              p1: addSaeule(state.saeuleDrei.p1),
              p2: addSaeule(state.saeuleDrei.p2),
            };
          }
          if (state.plaene) {
            const fix = (v: PlanVariantData | null) =>
              v
                ? {
                    ...v,
                    saeuleDrei: {
                      p1: addSaeule(v.saeuleDrei.p1),
                      p2: addSaeule(v.saeuleDrei.p2),
                    },
                  }
                : null;
            state.plaene = {
              a: fix(state.plaene.a) as PlanVariantData,
              b: fix(state.plaene.b),
              c: fix(state.plaene.c),
            };
          }
        }

        // v36 → v37: Alimente-Feld + Einkauf.serie + Immobilie.eigenmietwertProzent
        if (fromVersion < 37) {
          const ensureAlimente = (b: Budget | undefined): Budget | undefined => {
            if (!b) return b;
            const bm = b as Budget & { alimente?: AlimenteInput };
            if (bm.alimente && typeof bm.alimente.aktiv === "boolean") return b;
            return { ...b, alimente: { aktiv: false, betragJahr: null } };
          };
          const ensureSerieEntries = (entries: EinkaufEntry[]): EinkaufEntry[] =>
            entries.map((e) => {
              const raw = e as unknown as Record<string, unknown>;
              if (typeof raw.serie === "boolean") return e;
              return { ...e, serie: false };
            });
          const ensureSerieBvg = (b: BvgInput): BvgInput => ({
            p1: { ...b.p1, einkaeufe: ensureSerieEntries(b.p1.einkaeufe) },
            p2: { ...b.p2, einkaeufe: ensureSerieEntries(b.p2.einkaeufe) },
          });
          if (state.budget) state.budget = ensureAlimente(state.budget);
          if (state.bvg) state.bvg = ensureSerieBvg(state.bvg);
          if (state.plaene) {
            const fix = (v: PlanVariantData | null): PlanVariantData | null =>
              v
                ? {
                    ...v,
                    budget: ensureAlimente(v.budget) as Budget,
                    bvg: ensureSerieBvg(v.bvg),
                  }
                : null;
            state.plaene = {
              a: fix(state.plaene.a) as PlanVariantData,
              b: fix(state.plaene.b),
              c: fix(state.plaene.c),
            };
          }
          // Immobilie.eigenmietwertProzent: bleibt undefined → Engine-Default 1.13.
          // Keine aktive Migration nötig.
        }
        return state;
      },
      // Bei jedem Persist: Top-Level-Variant in plaene[aktiverPlan] mergen
      // — damit nach Reload kein Drift zwischen Top-Level und gespeichertem
      // Plan-Slot existiert.
      partialize: (state) => {
        const aktuellerSnapshot = extractVariant(state);
        return {
          ...state,
          plaene: {
            ...state.plaene,
            [state.aktiverPlan]: aktuellerSnapshot,
          },
        };
      },
    }
  )
);
