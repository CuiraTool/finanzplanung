"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlanStore } from "@/lib/store";
import { block1MinimumErfuellt } from "@/lib/validation";
import { useViewMode } from "@/lib/view-mode";
import { Block1Personen } from "./Block1Personen";
import { DocUploadCenter } from "./DocUploadCenter";
import { ImportPanel } from "./ImportPanel";
import { SzenarioPanel } from "./SzenarioPanel";
import { ActionPill } from "./ActionPill";
import { FlowRenderer } from "@/flow/FlowRenderer";
import { Block2Wuensche } from "./Block2Wuensche";
import { Block3Budget } from "./Block3Budget";
import { Block4Ahv } from "./Block4Ahv";
import { Block5Bvg } from "./Block5Bvg";
import { Block6Saeule3 } from "./Block6Saeule3";
import { Block7Vermoegen } from "./Block7Vermoegen";
import { Block8Immobilien } from "./Block8Immobilien";
import { Block9Firma } from "./Block9Firma";
import { Block10Nachlass } from "./Block10Nachlass";

/**
 * Wizard-Block-Reihenfolge.
 *
 * Mapping zu den Typeform-Blöcken (siehe docs/Pensionsplanung_Typeform_Optimierung):
 *   1 → A + B (Personen: Kopfdaten, Zivilstand, Familie, Adresse, Kontakt)
 *   2 → C + D (Ziele: Pensionierungsalter ordentlich/Wunsch, einmalige Ausgaben)
 *   3 → H/aktuell (Budget: monatlicher Verbrauch heute + Wunsch in Pension)
 *   4 → E     (1. Säule AHV)
 *   5 → F     (2. Säule Pensionskasse)
 *   6 → G     (3. Säule 3a/3b)
 *   7 → H-Vermögensteil (Liquidität, Wertschriften, Verbindlichkeiten)
 *   8 → I+J+K (Immobilien: Eigenheim, Ferien, Rendite)
 *   9 → L     (Firma / Selbständigkeit)
 *  10 → N+Q   (Nachlass: Erbschaft/Schenkung + Vorsorge-/Nachlassdokumente)
 */
const BLOCKS = [
  { id: 1, title: "Personen", implemented: true },
  { id: 2, title: "Ziele & Wünsche", implemented: true },
  { id: 3, title: "Budget", implemented: true },
  { id: 4, title: "1. Säule (AHV)", implemented: true },
  { id: 5, title: "2. Säule (Pensionskasse)", implemented: true },
  { id: 6, title: "3. Säule (3a / 3b)", implemented: true },
  { id: 7, title: "Vermögen", implemented: true },
  { id: 8, title: "Immobilien", implemented: true },
  { id: 9, title: "Firma / Selbständigkeit", implemented: true },
  { id: 10, title: "Nachlass", implemented: true },
  { id: 11, title: "Variante B (Vergleich)", implemented: true },
] as const;

type WizardMode = "klassisch" | "flow";

export function Wizard() {
  const aktiverBlock = usePlanStore((s) => s.aktiverBlock);
  const setAktiverBlock = usePlanStore((s) => s.setAktiverBlock);
  const fullState = usePlanStore();
  const [mode, setMode] = useState<WizardMode>("klassisch");
  const [viewMode] = useViewMode();
  const [docOpen, setDocOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Im "wizard-only"-View-Modus haben wir die volle Breite und können die
  // Block-Liste links / Eingabe rechts stellen. In Split bleibt's vertikal.
  const useTwoColumns = viewMode === "wizard";

  const validation = useMemo(() => block1MinimumErfuellt(fullState), [fullState]);

  // Wenn Block 1 unvollständig wird (z.B. User löscht Geburtsdatum),
  // navigiere automatisch zurück zu Block 1.
  useEffect(() => {
    if (!validation.komplett && aktiverBlock !== 1) {
      setAktiverBlock(1);
    }
  }, [validation.komplett, aktiverBlock, setAktiverBlock]);

  // Geführter-Flow-Modus: vollflächig, ohne Block-Liste
  if (mode === "flow") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
          <span>Geführter Frage-Flow</span>
          <button
            type="button"
            onClick={() => setMode("klassisch")}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            ← Klassisch
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <FlowRenderer mode="pro" onComplete={() => setMode("klassisch")} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <header className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <h1 className="text-xl font-semibold">Pensionsplanung</h1>
          <p className="text-sm text-slate-500">Eingabe</p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
          <ActionPill
            icon="📄"
            label="Dokumente hochladen"
            active={docOpen}
            caret="down"
            onClick={() => setDocOpen((o) => !o)}
            title="PK-Ausweis, Steuererklärung, IK-Auszug — Felder werden automatisch ausgefüllt"
          />
          <ActionPill
            icon="✨"
            label="Geführter Flow"
            caret="right"
            onClick={() => setMode("flow")}
            title="Frage-für-Frage-Modus für die Beratung mit dem Kunden"
          />
          <ActionPill
            icon="⬇"
            label="Daten importieren"
            active={importOpen}
            caret="down"
            onClick={() => setImportOpen((o) => !o)}
            title="JSON aus V2-Erfassung (Berater-Email) ins Tool laden"
          />
        </div>
      </header>

      {docOpen && (
        <DocUploadCenter
          controlled={{ onClose: () => setDocOpen(false) }}
        />
      )}
      {importOpen && (
        <ImportPanel
          controlled={{ onClose: () => setImportOpen(false) }}
        />
      )}

      {!validation.komplett && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <div className="font-semibold">Block 1 vervollständigen, um weiterzugehen</div>
          <div className="mt-0.5">
            Fehlt noch: {validation.fehlend.join(", ")}
          </div>
        </div>
      )}

      {useTwoColumns ? (
        <div className="grid grid-cols-[260px_1fr] gap-6">
          <BlockNavigation
            blocks={BLOCKS}
            aktiverBlock={aktiverBlock}
            setAktiverBlock={setAktiverBlock}
            validation={validation}
            sticky
          />
          <div className="space-y-6">
            <ActiveBlock aktiverBlock={aktiverBlock} />
            {aktiverBlock === 11 && <SzenarioPanel />}
          </div>
        </div>
      ) : (
        <>
          <BlockNavigation
            blocks={BLOCKS}
            aktiverBlock={aktiverBlock}
            setAktiverBlock={setAktiverBlock}
            validation={validation}
          />
          <ActiveBlock aktiverBlock={aktiverBlock} />
          {aktiverBlock === 11 && <SzenarioPanel />}
        </>
      )}
    </div>
  );
}

interface BlockNavProps {
  blocks: typeof BLOCKS;
  aktiverBlock: number;
  setAktiverBlock: (id: number) => void;
  validation: { komplett: boolean; fehlend: string[] };
  sticky?: boolean;
}

function BlockNavigation({
  blocks,
  aktiverBlock,
  setAktiverBlock,
  validation,
  sticky,
}: BlockNavProps) {
  return (
    <ol
      className={`mb-6 space-y-1 ${
        sticky ? "sticky top-2 self-start" : ""
      }`}
    >
      {blocks.map((b) => {
        const isActive = aktiverBlock === b.id;
        const isLocked = b.id !== 1 && !validation.komplett;
        const isClickable = b.implemented && !isLocked;
        return (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => isClickable && setAktiverBlock(b.id)}
              disabled={!isClickable}
              title={
                isLocked ? "Erst Block 1 ausfüllen (Pflichtfelder)" : undefined
              }
              className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition ${
                isActive
                  ? "border-blue-600 bg-blue-50"
                  : isClickable
                    ? "border-slate-200 bg-slate-50 hover:border-slate-300"
                    : "border-slate-200 bg-slate-50 text-slate-400"
              }`}
            >
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : isLocked
                      ? "bg-slate-200 text-slate-400"
                      : "bg-slate-200 text-slate-700"
                }`}
              >
                {b.id}
              </span>
              <span className="flex-1">{b.title}</span>
              {isLocked && (
                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                  🔒
                </span>
              )}
              {!b.implemented && (
                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                  bald
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ActiveBlock({ aktiverBlock }: { aktiverBlock: number }) {
  return (
    <>
      {aktiverBlock === 1 && <Block1Personen />}
      {aktiverBlock === 2 && <Block2Wuensche />}
      {aktiverBlock === 3 && <Block3Budget />}
      {aktiverBlock === 4 && <Block4Ahv />}
      {aktiverBlock === 5 && <Block5Bvg />}
      {aktiverBlock === 6 && <Block6Saeule3 />}
      {aktiverBlock === 7 && <Block7Vermoegen />}
      {aktiverBlock === 8 && <Block8Immobilien />}
      {aktiverBlock === 9 && <Block9Firma />}
      {aktiverBlock === 10 && <Block10Nachlass />}
    </>
  );
}
