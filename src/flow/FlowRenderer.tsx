"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { usePlanStore, type PlanState } from "@/lib/store";
import { QUESTIONS } from "./spec";
import type { QuestionSpec, OptionDef } from "./types";
import { gemeindenForKanton } from "@/engine/steuer-engine/locations";

interface Props {
  /** Wird aufgerufen wenn der User die letzte Frage durchhat. */
  onComplete?: () => void;
  /** Optional: Modus-Marker für UI-Texte (z.B. "v2") */
  mode?: "pro" | "v2";
}

/**
 * Renderer für den geführten Frage-Flow.
 *
 * - Iteriert durch QUESTIONS, überspringt Fragen mit bedingung()=false
 * - Eine Frage pro Screen, Vor/Zurück-Navigation, Fortschritts-Balken
 * - Antworten werden direkt in den Plan-Store geschrieben (live)
 * - LocalStorage-Persistenz via store.persist
 */
export function FlowRenderer({ onComplete, mode = "pro" }: Props) {
  const fullState = usePlanStore();
  const [idx, setIdx] = useState(0);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Sichtbare Fragen (Filter via bedingung)
  const sichtbar = useMemo(
    () => QUESTIONS.filter((q) => !q.bedingung || q.bedingung(fullState)),
    // Wenn fullState sich ändert, neu filtern — aber idx soll bleiben falls möglich
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fullState]
  );

  // Wenn idx ausserhalb der sichtbaren Liste — clampen
  const safeIdx = Math.min(idx, Math.max(0, sichtbar.length - 1));
  const aktuelle = sichtbar[safeIdx];

  // Wenn alle Fragen durch sind → onComplete
  const istAmEnde = safeIdx >= sichtbar.length - 1;

  const goNext = useCallback(() => {
    if (!aktuelle) return;
    setTouched((t) => ({ ...t, [aktuelle.id]: true }));
    const fehler = validiere(aktuelle, aktuelle.get(fullState));
    if (fehler) return;
    if (istAmEnde) {
      onComplete?.();
      return;
    }
    setIdx((i) => i + 1);
  }, [aktuelle, fullState, istAmEnde, onComplete]);

  const goBack = useCallback(() => {
    setIdx((i) => Math.max(0, i - 1));
  }, []);

  // Keyboard: Enter → next (außer bei longtext/multi)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "TEXTAREA") return;
        if (aktuelle?.type !== "longtext" && aktuelle?.type !== "multi") {
          e.preventDefault();
          goNext();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [aktuelle, goNext]);

  if (!aktuelle) {
    return (
      <div className="p-8 text-center text-slate-500">
        Keine Fragen verfügbar.
      </div>
    );
  }

  const wert = aktuelle.get(fullState);
  const fehler = touched[aktuelle.id] ? validiere(aktuelle, wert) : null;
  const fortschritt = Math.round(((safeIdx + 1) / sichtbar.length) * 100);

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      {/* Progress */}
      <div className="mb-10">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-cuira-deep)]/20 bg-[var(--color-cuira-deep)]/5 px-2.5 py-0.5 font-medium text-[var(--color-cuira-deep)]">
            <span className="font-semibold tabular-nums">
              {aktuelle.block}
            </span>
            <span>·</span>
            <span>{personalisiereText(aktuelle.blockTitle, fullState)}</span>
          </span>
          <span className="tabular-nums text-slate-500">
            Frage {safeIdx + 1} / {sichtbar.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-[var(--color-cuira-deep)] transition-all duration-500 ease-out"
            style={{ width: `${fortschritt}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1">
        <h2 className="mb-3 text-2xl font-semibold leading-tight text-slate-900 sm:text-[28px]">
          {personalisiereFrage(aktuelle, fullState)}
          {aktuelle.pflicht && (
            <span className="ml-1 align-top text-lg text-[var(--color-cuira-deep)]">
              *
            </span>
          )}
        </h2>
        {aktuelle.hilfe && (
          <p className="mb-8 text-sm leading-relaxed text-slate-500">
            {personalisiereText(aktuelle.hilfe, fullState)}
          </p>
        )}

        <div className="mt-8">
          <FieldInput
            spec={aktuelle}
            wert={wert}
            onChange={(v) => {
              usePlanStore.setState((s) => {
                const next = { ...s };
                aktuelle.set(next, v);
                return next;
              });
            }}
          />
        </div>

        {fehler && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-rose-600">
            <span aria-hidden>⚠</span>
            {fehler}
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-12 flex items-center justify-between border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={goBack}
          disabled={safeIdx === 0}
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Zurück
        </button>
        <div className="hidden text-[11px] uppercase tracking-wider text-slate-400 sm:block">
          {mode === "v2" ? "Berater-Erfassung" : "Cuira-Pro"}
        </div>
        <button
          type="button"
          onClick={goNext}
          className="rounded-md bg-[var(--color-cuira-deep)] px-6 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
        >
          {istAmEnde ? "Fertigstellen ✓" : "Weiter →"}
        </button>
      </div>
    </div>
  );
}

function validiere(spec: QuestionSpec, wert: unknown): string | null {
  if (spec.pflicht) {
    if (wert == null) return "Pflichtfeld";
    if (typeof wert === "string" && wert.trim() === "")
      return "Pflichtfeld";
    if (Array.isArray(wert) && wert.length === 0) return "Bitte auswählen";
  }
  if (spec.type === "number" && wert != null && typeof wert === "number") {
    if (spec.min != null && wert < spec.min) return `Mindestens ${spec.min}`;
    if (spec.max != null && wert > spec.max) return `Höchstens ${spec.max}`;
  }
  if (
    spec.type === "multi" &&
    spec.maxAuswahl &&
    Array.isArray(wert) &&
    wert.length > spec.maxAuswahl
  ) {
    return `Maximal ${spec.maxAuswahl} Auswahlen`;
  }
  if (spec.validiere) return spec.validiere(wert);
  return null;
}

const inputBaseClass =
  "w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 transition-colors placeholder:text-slate-400 focus:border-[var(--color-cuira-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--color-cuira-deep)]/20";

function FieldInput({
  spec,
  wert,
  onChange,
}: {
  spec: QuestionSpec;
  wert: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (spec.type) {
    case "text":
    case "email":
      return (
        <input
          type={spec.type === "email" ? "email" : "text"}
          value={(wert as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={spec.placeholder}
          className={inputBaseClass}
        />
      );
    case "longtext":
      return (
        <textarea
          value={(wert as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={spec.placeholder}
          rows={4}
          className={inputBaseClass}
        />
      );
    case "number": {
      const v = wert as number | null;
      return (
        <div className="relative">
          <input
            type="number"
            value={v ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") onChange(null);
              else {
                const n = Number(raw);
                if (!Number.isNaN(n)) onChange(n);
              }
            }}
            placeholder={spec.placeholder}
            className={inputBaseClass}
          />
          {spec.suffix && (
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              {spec.suffix}
            </span>
          )}
        </div>
      );
    }
    case "year":
      return (
        <input
          type="number"
          inputMode="numeric"
          value={(wert as number | null) ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") onChange(null);
            else {
              const n = Number(raw);
              if (!Number.isNaN(n)) onChange(n);
            }
          }}
          min={spec.min}
          max={spec.max}
          placeholder="JJJJ"
          className={inputBaseClass}
        />
      );
    case "date":
      return (
        <input
          type="date"
          value={(wert as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputBaseClass}
        />
      );
    case "yesno":
      return (
        <div className="grid grid-cols-2 gap-3">
          <ChoiceButton
            active={wert === true}
            onClick={() => onChange(true)}
            label="Ja"
          />
          <ChoiceButton
            active={wert === false}
            onClick={() => onChange(false)}
            label="Nein"
          />
        </div>
      );
    case "single":
      return (
        <div className="space-y-2">
          {(spec.optionen ?? []).map((o) => (
            <ChoiceButton
              key={o.value}
              active={wert === o.value}
              onClick={() => onChange(o.value)}
              label={o.label}
              hint={o.hint}
              fullWidth
            />
          ))}
        </div>
      );
    case "multi":
      return (
        <MultiSelect
          options={spec.optionen ?? []}
          values={(wert as string[]) ?? []}
          maxAuswahl={spec.maxAuswahl}
          onChange={(vs) => onChange(vs)}
        />
      );
    case "kanton":
      return (
        <select
          value={(wert as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputBaseClass}
        >
          <option value="">— Kanton wählen —</option>
          {(spec.optionen ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.value} — {o.label}
            </option>
          ))}
        </select>
      );
    case "gemeinde": {
      const kanton = (usePlanStore.getState().adresse.kanton ?? "") as string;
      const gemeinden = kanton ? gemeindenForKanton(kanton) : [];
      return (
        <select
          value={(wert as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputBaseClass}
        >
          <option value="">— Hauptort {kanton} —</option>
          {gemeinden.map((g) => (
            <option key={g.BfsID} value={g.BfsID}>
              {g.BfsName}
            </option>
          ))}
        </select>
      );
    }
    case "consent":
      return (
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
          <input
            type="checkbox"
            checked={(wert as boolean) ?? false}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-1 size-4"
          />
          <span className="text-sm text-slate-700">
            {spec.placeholder ?? "Ich stimme zu."}
          </span>
        </label>
      );
    case "info":
      return null;
    default:
      return null;
  }
}

function ChoiceButton({
  active,
  onClick,
  label,
  hint,
  fullWidth,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border-2 px-4 py-3 text-left text-base transition ${
        active
          ? "border-[var(--color-cuira-deep)] bg-[var(--color-cuira-deep)]/5 text-slate-900"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      } ${fullWidth ? "w-full" : ""}`}
    >
      <div className="font-medium">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </button>
  );
}

function MultiSelect({
  options,
  values,
  maxAuswahl,
  onChange,
}: {
  options: OptionDef[];
  values: string[];
  maxAuswahl?: number;
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) => {
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
    } else {
      if (maxAuswahl && values.length >= maxAuswahl) return;
      onChange([...values, v]);
    }
  };
  return (
    <div className="space-y-2">
      {options.map((o) => {
        const active = values.includes(o.value);
        const disabled = !active && maxAuswahl != null && values.length >= maxAuswahl;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            disabled={disabled}
            className={`w-full rounded-md border-2 px-4 py-3 text-left text-base transition ${
              active
                ? "border-[var(--color-cuira-deep)] bg-[var(--color-cuira-deep)]/5 text-slate-900"
                : disabled
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{o.label}</span>
              {active && <span className="text-[var(--color-cuira-deep)]">✓</span>}
            </div>
          </button>
        );
      })}
      {maxAuswahl && (
        <div className="text-xs text-slate-500">
          {values.length} / {maxAuswahl} ausgewählt
        </div>
      )}
    </div>
  );
}

/**
 * Personalisiert eine Frage abhängig von fallart und erfassten Vornamen.
 *  - einzel + frageEinzel definiert: nimmt frageEinzel (Sie-Form)
 *  - sonst: nimmt frage und ersetzt "Person 1"/"Person 2" durch Vornamen
 *    falls vorhanden.
 */
function personalisiereFrage(spec: QuestionSpec, state: PlanState): string {
  if (state.fallart === "einzel" && spec.frageEinzel) {
    return personalisiereText(spec.frageEinzel, state);
  }
  return personalisiereText(spec.frage, state);
}

/**
 * Ersetzt "Person 1"/"Person 2" durch erfasste Vornamen oder lässt sie weg
 * bei einzel ohne Vorname.
 *
 * - paar + Vorname: "Person 1" → Vorname (z.B. "Max")
 * - paar ohne Vorname: "Person 1"/"Person 2" bleibt
 * - einzel + Vorname: "Person 1" → Vorname
 * - einzel ohne Vorname: "Person 1" wird komplett entfernt (mit umgebenden
 *   Leerzeichen). Beispiel: "Pensionierung Person 1" → "Pensionierung".
 */
export function personalisiereText(text: string, state: PlanState): string {
  let r = text;
  const v1 = state.person1.vorname.trim();
  const v2 = state.person2.vorname.trim();
  if (state.fallart === "einzel") {
    if (v1) {
      r = r.replace(/\bPerson 1\b/g, v1);
    } else {
      // "Person 1" mit umgebenden Spaces entfernen
      r = r.replace(/\s+\bPerson 1\b/g, "");
      r = r.replace(/\bPerson 1\b\s+/g, "");
      r = r.replace(/\bPerson 1\b/g, "");
    }
  } else {
    if (v1) r = r.replace(/\bPerson 1\b/g, v1);
    if (v2) r = r.replace(/\bPerson 2\b/g, v2);
  }
  return r.replace(/\s+/g, " ").trim();
}

// Hilfsexport für Tests / Imports
export { QUESTIONS };
export type { PlanState };
