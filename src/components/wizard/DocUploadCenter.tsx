"use client";

import { useState, useRef } from "react";
import { usePlanStore } from "@/lib/store";
import type { ExtractedDocument } from "@/lib/extract-schema";
import {
  vorschlaegeAusExtract,
  vorschlaegeNachBlock,
  bestimmePersonIdx,
  type Vorschlag,
  type PersonIdx,
  type PersonHint,
} from "@/lib/extract-mapping";

const ACCEPTED = "application/pdf,image/jpeg,image/png,image/webp";

interface UploadResult {
  fileName: string;
  status: "pending" | "ok" | "error";
  extracted?: ExtractedDocument;
  vorschlaege?: Vorschlag[];
  personHint?: PersonHint;
  personGewaehlt?: PersonIdx; // bei Paar: User-Wahl
  error?: string;
}

export function DocUploadCenter() {
  const fullState = usePlanStore();
  const [results, setResults] = useState<UploadResult[]>([]);
  const [drag, setDrag] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Wenn Ergebnisse vorhanden sind, soll die Drop-Zone offen bleiben
  // (sonst würde man die Vorschläge nicht sehen).
  const showFull = expanded || results.length > 0 || drag;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const idx = results.length;
      setResults((r) => [
        ...r,
        { fileName: file.name, status: "pending" },
      ]);

      try {
        const fd = new FormData();
        fd.append("file", file);

        const res = await fetch("/api/extract", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();

        if (!res.ok) {
          setResults((r) => {
            const copy = [...r];
            copy[idx] = {
              fileName: file.name,
              status: "error",
              error: data.error ?? `HTTP ${res.status}`,
            };
            return copy;
          });
          continue;
        }

        const extracted = data.extracted as ExtractedDocument;
        const personHint = bestimmePersonIdx(extracted, fullState);
        const initialPerson: PersonIdx =
          personHint === "unsicher" ? 1 : personHint;
        const vorschlaege = vorschlaegeAusExtract(
          extracted,
          fullState,
          initialPerson
        );
        setResults((r) => {
          const copy = [...r];
          copy[idx] = {
            fileName: file.name,
            status: "ok",
            extracted,
            vorschlaege,
            personHint,
            personGewaehlt: initialPerson,
          };
          return copy;
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setResults((r) => {
          const copy = [...r];
          copy[idx] = {
            fileName: file.name,
            status: "error",
            error: msg,
          };
          return copy;
        });
      }
    }
  }

  function applyVorschlag(resultIdx: number, vorschlagId: string) {
    const r = results[resultIdx];
    if (!r?.vorschlaege) return;
    const v = r.vorschlaege.find((x) => x.id === vorschlagId);
    if (!v) return;
    v.apply(fullState);
    setResults((rs) => {
      const copy = [...rs];
      copy[resultIdx] = {
        ...copy[resultIdx]!,
        vorschlaege: copy[resultIdx]!.vorschlaege!.filter(
          (x) => x.id !== vorschlagId
        ),
      };
      return copy;
    });
  }

  function applyAll(resultIdx: number) {
    const r = results[resultIdx];
    if (!r?.vorschlaege) return;
    for (const v of r.vorschlaege) v.apply(fullState);
    setResults((rs) => {
      const copy = [...rs];
      copy[resultIdx] = { ...copy[resultIdx]!, vorschlaege: [] };
      return copy;
    });
  }

  function changePerson(resultIdx: number, personIdx: PersonIdx) {
    const r = results[resultIdx];
    if (!r?.extracted) return;
    const vorschlaege = vorschlaegeAusExtract(
      r.extracted,
      fullState,
      personIdx
    );
    setResults((rs) => {
      const copy = [...rs];
      copy[resultIdx] = {
        ...copy[resultIdx]!,
        personGewaehlt: personIdx,
        vorschlaege,
      };
      return copy;
    });
  }

  function removeResult(idx: number) {
    setResults((rs) => rs.filter((_, i) => i !== idx));
  }

  // Hidden input — immer im DOM, damit der collapsed-Trigger ihn auch öffnen kann
  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept={ACCEPTED}
      className="hidden"
      onChange={(e) => handleFiles(e.target.files)}
    />
  );

  // Kompakter Trigger — Default-Zustand. Eine Zeile.
  if (!showFull) {
    return (
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
        >
          <span className="flex items-center gap-2">
            <span aria-hidden>📄</span>
            <span>Dokumente hochladen — automatisch ausfüllen</span>
          </span>
          <span className="text-slate-400">+</span>
        </button>
        {hiddenInput}
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-4 transition ${
          drag
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">📄</div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-700">
              Dokumente hochladen — automatisch in Felder einfüllen
            </div>
            <div className="text-xs text-slate-500">
              PK-Ausweis, Steuerveranlagung, IK-Auszug, Lohnausweis, Versicherungspolice
              · PDF/JPG/PNG · Drag & Drop oder klicken
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md bg-[var(--color-cuira-deep)] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              Datei wählen
            </button>
            {results.length === 0 && (
              <button
                type="button"
                title="Einklappen"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(false);
                }}
                className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs text-slate-500 hover:bg-slate-50"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {hiddenInput}
      </div>

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((r, idx) => (
            <ResultCard
              key={`${r.fileName}-${idx}`}
              r={r}
              fallart={fullState.fallart}
              vornameP1={fullState.person1.vorname}
              vornameP2={fullState.person2.vorname}
              onApply={(id) => applyVorschlag(idx, id)}
              onApplyAll={() => applyAll(idx)}
              onChangePerson={(p) => changePerson(idx, p)}
              onRemove={() => removeResult(idx)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ResultCard({
  r,
  fallart,
  vornameP1,
  vornameP2,
  onApply,
  onApplyAll,
  onChangePerson,
  onRemove,
}: {
  r: UploadResult;
  fallart: "einzel" | "paar";
  vornameP1: string;
  vornameP2: string;
  onApply: (id: string) => void;
  onApplyAll: () => void;
  onChangePerson: (p: PersonIdx) => void;
  onRemove: () => void;
}) {
  if (r.status === "pending") {
    return (
      <li className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Spinner />
          <span>{r.fileName} — wird analysiert …</span>
        </div>
      </li>
    );
  }

  if (r.status === "error") {
    return (
      <li className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-rose-700">{r.fileName}</div>
            <div className="text-rose-600">{r.error}</div>
            <div className="mt-1 text-rose-500/80">
              Tipp: ANTHROPIC_API_KEY in .env.local und in Netlify-Env setzen.
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="text-rose-700 hover:underline"
          >
            Entfernen
          </button>
        </div>
      </li>
    );
  }

  const ex = r.extracted!;
  const vorschlaege = r.vorschlaege ?? [];
  const proBlock = vorschlaegeNachBlock(vorschlaege);

  return (
    <li className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-emerald-800">
            {r.fileName} — erkannt: {docTypeLabel(ex.docType)}
            {ex.confidence > 0 &&
              ` (${Math.round(ex.confidence * 100)}% Vertrauen)`}
          </div>
          <div className="text-xs text-slate-600">{ex.beschreibung}</div>
          {ex.betrifftName && (
            <div className="text-xs text-slate-500">
              Lautet auf: {ex.betrifftName}
              {ex.stichtag && ` · Stichtag ${ex.stichtag}`}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-slate-500 hover:underline"
        >
          Schliessen
        </button>
      </div>

      {/* Personen-Selector bei Paar */}
      {fallart === "paar" && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs">
          <span className="text-slate-600">
            {r.personHint === "unsicher"
              ? "Person nicht eindeutig erkannt — bitte wählen:"
              : `Erkannt: ${r.personHint === 1 ? vornameP1 || "Person 1" : vornameP2 || "Person 2"}`}
          </span>
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={() => onChangePerson(1)}
              className={`rounded px-2 py-0.5 ${
                r.personGewaehlt === 1
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-300 bg-white text-slate-600"
              }`}
            >
              {vornameP1 || "Person 1"}
            </button>
            <button
              type="button"
              onClick={() => onChangePerson(2)}
              className={`rounded px-2 py-0.5 ${
                r.personGewaehlt === 2
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-300 bg-white text-slate-600"
              }`}
            >
              {vornameP2 || "Person 2"}
            </button>
          </div>
        </div>
      )}

      {vorschlaege.length === 0 ? (
        <div className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-700">
          ✓ Alle erkannten Werte übernommen
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              {vorschlaege.length} Vorschläge
              {proBlock.length > 0 && (
                <span className="ml-1 text-slate-400">
                  ({proBlock.map((b) => `${b.block.replace("Block ", "")}: ${b.anzahl}`).join(", ")})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onApplyAll}
              className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Alle übernehmen
            </button>
          </div>

          <ul className="space-y-1">
            {vorschlaege.map((v) => (
              <li
                key={v.id}
                className="flex items-center gap-2 rounded-md border border-emerald-100 bg-white px-2 py-1.5 text-xs"
              >
                <div className="flex-1">
                  <div className="text-slate-700">
                    <span className="font-medium">{v.feldLabel}</span>
                    <span className="text-slate-400"> · {v.block}</span>
                  </div>
                  <div className="tabular-nums">
                    <span className="text-slate-500">{v.aktuellerWert}</span>
                    <span className="mx-1.5 text-slate-400">→</span>
                    <span className="font-semibold text-emerald-700">
                      {v.neuerWert}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onApply(v.id)}
                  className="shrink-0 rounded-md border border-emerald-300 bg-white px-2 py-1 text-emerald-700 hover:bg-emerald-50"
                >
                  Übernehmen
                </button>
              </li>
            ))}
          </ul>

          {ex.felder.notizen && (
            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
              <span className="font-medium">Anmerkung Claude:</span>{" "}
              {ex.felder.notizen}
            </div>
          )}
        </>
      )}
    </li>
  );
}

function docTypeLabel(t: ExtractedDocument["docType"]): string {
  return (
    {
      "pk-ausweis": "PK-Ausweis",
      "steuerveranlagung": "Steuerveranlagung",
      "ik-auszug": "IK-Auszug",
      "versicherungspolice": "Versicherungspolice",
      "lohnausweis": "Lohnausweis",
      "kontoauszug": "Kontoauszug",
      "unbekannt": "Unbekannter Doc-Typ",
    }[t] ?? t
  );
}

function Spinner() {
  return (
    <span
      aria-label="Lädt"
      className="inline-block size-3 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500"
    />
  );
}
