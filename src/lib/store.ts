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
  bvg: BvgInput;
  saeuleDrei: SaeuleDreiInput;
  vermoegen: VermoegenInput;
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
  setBvgP1: (patch: Partial<BvgPersonInput>) => void;
  setBvgP2: (patch: Partial<BvgPersonInput>) => void;
  addFreizuegigkeit: (personIdx: 1 | 2) => void;
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
  addSaeuleDrei: (personIdx: 1 | 2, type: SaeuleDreiTyp) => void;
  updateSaeuleDrei: (
    personIdx: 1 | 2,
    id: string,
    patch: Partial<Omit<SaeuleDreiEntry, "id">>
  ) => void;
  removeSaeuleDrei: (personIdx: 1 | 2, id: string) => void;
  addVermoegen: (typ: VermoegenTyp) => void;
  updateVermoegen: (id: string, patch: Partial<Omit<VermoegenItem, "id">>) => void;
  removeVermoegen: (id: string) => void;
  setHauptkonto: (id: string) => void;
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
      setBvgP1: (patch) =>
        set((s) => ({ bvg: { ...s.bvg, p1: { ...s.bvg.p1, ...patch } } })),
      setBvgP2: (patch) =>
        set((s) => ({ bvg: { ...s.bvg, p2: { ...s.bvg.p2, ...patch } } })),
      addFreizuegigkeit: (personIdx) =>
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
                    beschreibung: "",
                    saldoHeute: null,
                    auszahlungsjahr: new Date().getFullYear() + 5,
                    renditeProzent: 0,
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
      addSaeuleDrei: (personIdx, type) =>
        set((s) => {
          const key = personIdx === 1 ? "p1" : "p2";
          const naechstesJahr = new Date().getFullYear() + 5;
          const neu: SaeuleDreiEntry = {
            id: newId(),
            type,
            beschreibung: "",
            aktuellerWert: null,
            auszahlungsjahr: naechstesJahr,
            renditeProzent: 1.5,
            rueckkaufswert: null,
            ablaufswert: null,
            ablaufjahr: naechstesJahr,
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
      addVermoegen: (typ) =>
        set((s) => ({
          vermoegen: {
            items: [
              ...s.vermoegen.items,
              {
                id: newId(),
                typ,
                beschreibung: "",
                saldoHeute: null,
                renditeProzent: 0,
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
          // Wenn das Hauptkonto entfernt wurde, mach das erste verbleibende dazu.
          if (target?.istHauptkonto && rest.length > 0) {
            rest[0]!.istHauptkonto = true;
          }
          return { vermoegen: { items: rest } };
        }),
      setHauptkonto: (id) =>
        set((s) => ({
          vermoegen: {
            items: s.vermoegen.items.map((it) => ({
              ...it,
              istHauptkonto: it.id === id,
            })),
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
          aktiverBlock: 1,
        }),
    }),
    {
      name: "cuira-plan-v14",
    }
  )
);
