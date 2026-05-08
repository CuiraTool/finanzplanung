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

export interface Budget {
  einkommen: Einkommensperiode[];
  ausgabenModus: AusgabenModus;
  ausgabenTotal: number | null;
  ausgabenKategorien: AusgabenKategorien;
  wunschverbrauchPension: number | null;
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
  setAhv: (patch: Partial<AhvInput>) => void;
  setAktiverBlock: (id: number) => void;
  reset: () => void;
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
};

const initialAdresse: Adresse = {
  strasse: "",
  plz: "",
  ort: "",
  kanton: "",
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
      setAhv: (patch) => set((s) => ({ ahv: { ...s.ahv, ...patch } })),
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
          aktiverBlock: 1,
        }),
    }),
    {
      name: "cuira-plan-v6",
    }
  )
);
