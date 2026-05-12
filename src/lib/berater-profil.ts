"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Berater-Profil (E2-8 / Y-2b P3-Audit).
 *
 * Wird im PDF-Berater-Block angezeigt. Foto optional als Base64 oder URL.
 * Default-Profil = Kathirsan Kathirgamanathan (Cuira-Gründer).
 *
 * LocalStorage: "cuira-berater-profil-v2"
 */
export interface BeraterProfil {
  name: string;
  rolle: string;
  email: string;
  telefon: string;
  office: string;
  fotoBase64: string | null; // Base64-PNG/JPG (Browser-Upload)
  kalenderUrl: string;
}

const DEFAULT_PROFIL: BeraterProfil = {
  name: "Kathirsan Kathirgamanathan",
  rolle: "Senior Pensionsplaner",
  email: "kathir@cuirapartners.ch",
  telefon: "+41 44 000 00 00",
  office: "Splügenstrasse 11, 8002 Zürich",
  fotoBase64: null,
  kalenderUrl: "",
};

interface BeraterProfilStore {
  profil: BeraterProfil;
  setProfil: (p: Partial<BeraterProfil>) => void;
  reset: () => void;
}

const useStore = create<BeraterProfilStore>()(
  persist(
    (set) => ({
      profil: DEFAULT_PROFIL,
      setProfil: (p) => set((s) => ({ profil: { ...s.profil, ...p } })),
      reset: () => set({ profil: DEFAULT_PROFIL }),
    }),
    { name: "cuira-berater-profil-v2" }
  )
);

export function useBeraterProfil(): BeraterProfilStore {
  return useStore();
}

export function getBeraterProfilStatic(): BeraterProfil {
  if (typeof window === "undefined") return DEFAULT_PROFIL;
  try {
    const raw = window.localStorage.getItem("cuira-berater-profil-v2");
    if (!raw) return DEFAULT_PROFIL;
    const p = JSON.parse(raw) as { state?: { profil?: BeraterProfil } };
    return p.state?.profil ?? DEFAULT_PROFIL;
  } catch {
    return DEFAULT_PROFIL;
  }
}
