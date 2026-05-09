"use client";

import type { PlanState } from "@/lib/store";
import type { BeraterMeta, FlowAntworten } from "./types";

const META_STORAGE_KEY = "cuira-erfassung-meta";

export function leereBeraterMeta(): BeraterMeta {
  return {
    datum: new Date().toISOString().slice(0, 10),
    partnerfirma: "",
    beraterName: "",
    beraterEmail: "",
    auftrag: "",
    kundeP1Name: "",
    kundeP2Name: "",
  };
}

export function readMeta(): BeraterMeta {
  if (typeof window === "undefined") return leereBeraterMeta();
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return leereBeraterMeta();
    return { ...leereBeraterMeta(), ...JSON.parse(raw) };
  } catch {
    return leereBeraterMeta();
  }
}

export function writeMeta(meta: BeraterMeta): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
}

export function clearMeta(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(META_STORAGE_KEY);
}

/** Erstellt das Submission-JSON aus Plan-State + Berater-Meta. */
export function buildSubmission(
  plan: PlanState,
  meta?: BeraterMeta
): FlowAntworten {
  // PlanState enthält Setter — die filtern wir raus, nur Daten serialisieren.
  const planClean = JSON.parse(
    JSON.stringify(plan, (_key, value) =>
      typeof value === "function" ? undefined : value
    )
  );
  return {
    beraterMeta: meta,
    plan: planClean,
    erfasstAm: new Date().toISOString(),
  };
}

/** JSON-Datei zum Download anbieten (Browser-API). */
export function downloadJson(submission: FlowAntworten, filename: string): void {
  const blob = new Blob([JSON.stringify(submission, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Sendet die Submission an die /api/erfassung-Route (die ggf. Email triggert). */
export async function submitErfassung(
  submission: FlowAntworten
): Promise<{ ok: boolean; emailGesendet: boolean; error?: string }> {
  try {
    const res = await fetch("/api/erfassung", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });
    const data = await res.json();
    return {
      ok: res.ok,
      emailGesendet: data.emailGesendet === true,
      error: data.error,
    };
  } catch (e) {
    return {
      ok: false,
      emailGesendet: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
