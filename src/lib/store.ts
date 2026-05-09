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
}

export interface PersonInput {
  vorname: string;
  nachname: string;
  geburtsdatum: string;
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
}

export interface BvgInput {
  p1: BvgPersonInput;
  p2: BvgPersonInput;
}

/** 3. Säule — Block 6. Konto oder Versicherung, beliebig viele pro Person. */
export type SaeuleDreiTyp = "konto" | "versicherung";

export interface SaeuleDreiEntry {
  id: string;
  type: SaeuleDreiTyp;
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

/** Block N — Erbschaft, Schenkung, Güterrecht. */
export interface ErbschaftInput {
  erwartet: ErbschaftStatus | null;
  groessenordnung: ErbschaftGroesse | null;
  schenkungenGetaetigt: boolean;
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

export type Religion = "katholisch" | "reformiert" | "keine";

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
  reset: () => void;
  /** Vollen State aus einem Import-Object (V2-Submission) übernehmen. */
  importState: (snapshot: Partial<PlanState>) => void;
}

const initialPerson: PersonInput = {
  vorname: "",
  nachname: "",
  geburtsdatum: "",
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
  umwandlungssatzProzent: 6.8,
  bezugspraeferenz: "rente",
  kapitalanteil: 50,
  freizuegigkeit: [],
  einkaeufe: [],
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
  return {
    items: [
      {
        id: newId(),
        typ: "konto",
        beschreibung: "Privatkonto",
        saldoHeute: null,
        renditeProzent: 0,
        istHauptkonto: true,
      },
    ],
  };
}

function isZivilstandEinzel(z: Zivilstand): z is ZivilstandEinzel {
  return ZIVILSTAND_EINZEL.some((e) => e.value === z);
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
        schenkungenGetaetigt: false,
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
                    saldoHeute: initial?.saldoHeute ?? null,
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
      addSaeuleDrei: (personIdx, type, initial) =>
        set((s) => {
          const key = personIdx === 1 ? "p1" : "p2";
          const aktJahr = new Date().getFullYear();
          const naechstesJahr = aktJahr + 5;
          const neu: SaeuleDreiEntry = {
            id: newId(),
            type,
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
        set((s) => ({
          vermoegen: {
            items: [
              ...s.vermoegen.items,
              {
                id: newId(),
                typ,
                beschreibung: initial?.beschreibung ?? "",
                saldoHeute: initial?.saldoHeute ?? null,
                renditeProzent: initial?.renditeProzent ?? 0,
                istHauptkonto: false,
              },
            ],
          },
        })),
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
          // Wenn das einzige Item entfernt wird, lass es stehen — sonst hätte
          // der Cashflow keinen Anker. UI verhindert das auch.
          if (s.vermoegen.items.length === 1) return {};
          const rest = s.vermoegen.items.filter((it) => it.id !== id);
          // Wenn das Hauptkonto entfernt wurde, mach das erste Nicht-Darlehen
          // dazu — ein Darlehen darf nicht Hauptkonto sein (würde Cashflow-
          // Logik brechen).
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
            schenkungenGetaetigt: false,
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
        }),
    }),
    {
      name: "cuira-plan-v23",
    }
  )
);
