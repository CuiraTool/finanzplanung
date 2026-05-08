import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Fallart = "einzel" | "paar";

export interface PersonInput {
  geburtsdatum: string; // ISO yyyy-mm-dd, leer = noch nicht eingegeben
  massgebendesEinkommen: number | null;
  bezugsalter: number; // 58–70, default 65
}

export interface PlanState {
  fallart: Fallart;
  person1: PersonInput;
  person2: PersonInput;

  // Aktiver Block im Wizard (für spätere Navigation)
  aktiverBlock: number;

  setFallart: (v: Fallart) => void;
  setPerson1: (patch: Partial<PersonInput>) => void;
  setPerson2: (patch: Partial<PersonInput>) => void;
  setAktiverBlock: (id: number) => void;
  reset: () => void;
}

const initialPerson: PersonInput = {
  geburtsdatum: "",
  massgebendesEinkommen: null,
  bezugsalter: 65,
};

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      fallart: "einzel",
      person1: { ...initialPerson },
      person2: { ...initialPerson },
      aktiverBlock: 1,

      setFallart: (fallart) => set({ fallart }),
      setPerson1: (patch) =>
        set((s) => ({ person1: { ...s.person1, ...patch } })),
      setPerson2: (patch) =>
        set((s) => ({ person2: { ...s.person2, ...patch } })),
      setAktiverBlock: (aktiverBlock) => set({ aktiverBlock }),
      reset: () =>
        set({
          fallart: "einzel",
          person1: { ...initialPerson },
          person2: { ...initialPerson },
          aktiverBlock: 1,
        }),
    }),
    {
      name: "cuira-plan-v1",
    }
  )
);
