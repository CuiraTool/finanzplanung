"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlanStore, type PlanState } from "@/lib/store";
import { block1MinimumErfuellt } from "@/lib/validation";
import { formatChf } from "@/lib/format";
import { useViewMode } from "@/lib/view-mode";
import { Block1Personen } from "./Block1Personen";
import { DocUploadCenter } from "./DocUploadCenter";
import { ImportPanel } from "./ImportPanel";
import { SzenarioPanel } from "./SzenarioPanel";
import { ActionPill } from "./ActionPill";
import { ResizableNav } from "./ResizableNav";
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

/**
 * Glance-Value pro Block — eine Zeile mit dem wichtigsten Eckwert,
 * damit der Berater im Sidebar sofort sieht, was schon erfasst ist.
 *
 * Bewusst defensiv: bei null/undefined einen sanften Hinweis statt
 * "—" oder leerer Zeile zeigen, weil das Sidebar-Polish Vertrauen
 * vermitteln soll ("hier siehst du, was du schon hast").
 */
function blockGlance(blockId: number, s: PlanState): string {
  switch (blockId) {
    case 1: {
      const isPaar = s.fallart === "paar";
      if (!s.person1.vorname) return "noch nicht erfasst";
      const name = isPaar
        ? `${s.person1.vorname || "P1"} + ${s.person2.vorname || "P2"}`
        : s.person1.vorname;
      return s.adresse.kanton ? `${name} · ${s.adresse.kanton}` : name;
    }
    case 2: {
      const a = s.ziele.bezugsalterP1 || 0;
      if (!a) return "Pensionsalter offen";
      const note = a < 65 ? "Frühpension" : a === 65 ? "ordentlich" : "aufgeschoben";
      return `Pension ${a} · ${note}`;
    }
    case 3: {
      const eink = s.budget.einkommenHeute;
      const ausg = s.budget.ausgabenTotal;
      if (!eink && !ausg) return "Budget offen";
      if (eink && ausg)
        return `${formatChf(eink)} / ${formatChf(ausg)}/Mt`;
      if (eink) return `Einkommen ${formatChf(eink)}`;
      return `Ausgaben ${formatChf(ausg)}/Mt`;
    }
    case 4: {
      const eink = s.ahv.einkommenP1;
      if (!eink) return "AHV-Einkommen offen";
      return `Massg. Eink. ${formatChf(eink)}`;
    }
    case 5: {
      const ag = s.bvg.p1.altersguthabenHeute;
      if (!ag) return "PK-Guthaben offen";
      return `PK-Saldo ${formatChf(ag)}`;
    }
    case 6: {
      const total =
        s.saeuleDrei.p1.reduce(
          (a, e) => a + (e.aktuellerWert ?? 0) + (e.rueckkaufswert ?? 0),
          0
        ) +
        s.saeuleDrei.p2.reduce(
          (a, e) => a + (e.aktuellerWert ?? 0) + (e.rueckkaufswert ?? 0),
          0
        );
      const n = s.saeuleDrei.p1.length + s.saeuleDrei.p2.length;
      if (n === 0) return "noch nichts erfasst";
      return `${formatChf(total)} · ${n} Konto${n > 1 ? "s" : ""}`;
    }
    case 7: {
      const total = s.vermoegen.items.reduce(
        (a, it) => a + (it.saldoHeute ?? 0),
        0
      );
      if (s.vermoegen.items.length === 0) return "noch nichts erfasst";
      return `${formatChf(total)} · ${s.vermoegen.items.length} Position${
        s.vermoegen.items.length > 1 ? "en" : ""
      }`;
    }
    case 8: {
      if (s.immobilien.items.length === 0) return "keine Immobilie";
      const total = s.immobilien.items.reduce(
        (a, im) => a + (im.verkehrswert ?? 0),
        0
      );
      return `${s.immobilien.items.length} Liegenschaft · ${formatChf(total)}`;
    }
    case 9:
      return s.firma.vorhanden
        ? s.firma.firmenname || "Firma erfasst"
        : "keine Firma";
    case 10: {
      const yes = (Object.values(s.nachlass) as boolean[]).filter(Boolean)
        .length;
      const total = Object.keys(s.nachlass).length;
      return `${yes} / ${total} Dokumente`;
    }
    case 11:
      return s.szenarioB.aktiv ? "Variante B aktiv" : "noch keine Variante B";
    default:
      return "";
  }
}

/**
 * Block ist "abgeschlossen" wenn ein Mindest-Eckwert da ist (Heuristik).
 * Wird für die Progress-Bar oben in der Sidebar verwendet.
 */
function blockIstErledigt(blockId: number, s: PlanState): boolean {
  switch (blockId) {
    case 1:
      return !!(s.person1.vorname && s.person1.geburtsdatum);
    case 2:
      return s.ziele.bezugsalterP1 > 0;
    case 3:
      return (
        (s.budget.einkommenHeute ?? 0) > 0 ||
        (s.budget.ausgabenTotal ?? 0) > 0
      );
    case 4:
      return (s.ahv.einkommenP1 ?? 0) > 0;
    case 5:
      return (s.bvg.p1.altersguthabenHeute ?? 0) > 0;
    case 6:
      return s.saeuleDrei.p1.length + s.saeuleDrei.p2.length > 0;
    case 7:
      return s.vermoegen.items.length > 0;
    case 8:
      return true; // optional
    case 9:
      return !s.firma.vorhanden || !!s.firma.firmenname;
    case 10:
      return true; // optional
    case 11:
      return true; // optional
    default:
      return false;
  }
}

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
        <ResizableNav
          left={
            <BlockNavigation
              blocks={BLOCKS}
              aktiverBlock={aktiverBlock}
              setAktiverBlock={setAktiverBlock}
              validation={validation}
            />
          }
          right={
            <div className="space-y-6">
              <ActiveBlock aktiverBlock={aktiverBlock} />
              {aktiverBlock === 11 && <SzenarioPanel />}
            </div>
          }
        />
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
  const fullState = usePlanStore();
  const erledigt = useMemo(
    () => blocks.filter((b) => blockIstErledigt(b.id, fullState)).length,
    [blocks, fullState]
  );
  const pct = Math.round((erledigt / blocks.length) * 100);

  return (
    <div
      className={`mb-6 ${sticky ? "sticky top-2 self-start" : ""}`}
    >
      {/* Progress-Bar (Phase 6 Polish nach Handoff) */}
      <div className="cui-rail-progress">
        <div className="cui-rail-progress-bar">
          <div
            className="cui-rail-progress-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="cui-rail-progress-text">
          <span>
            {erledigt} / {blocks.length} erledigt
          </span>
          <strong>{pct}%</strong>
        </div>
      </div>

      <ol className="space-y-1">
        {blocks.map((b) => {
          const isActive = aktiverBlock === b.id;
          const isLocked = b.id !== 1 && !validation.komplett;
          const isClickable = b.implemented && !isLocked;
          const isDone = blockIstErledigt(b.id, fullState);
          const glance = blockGlance(b.id, fullState);
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => isClickable && setAktiverBlock(b.id)}
                disabled={!isClickable}
                title={
                  isLocked
                    ? "Erst Block 1 ausfüllen (Pflichtfelder)"
                    : undefined
                }
                className="flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition"
                style={{
                  background: isActive
                    ? "var(--accent-soft)"
                    : "var(--surface-2)",
                  borderColor: isActive
                    ? "var(--accent)"
                    : "var(--border)",
                  color: isActive
                    ? "var(--accent-ink)"
                    : isClickable
                    ? "var(--ink-2)"
                    : "var(--ink-4)",
                  cursor: isClickable ? "pointer" : "not-allowed",
                }}
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums"
                  style={{
                    background: isActive
                      ? "var(--accent)"
                      : isDone
                      ? "var(--pos)"
                      : "var(--surface-hover)",
                    color: isActive || isDone ? "white" : "var(--ink-3)",
                  }}
                >
                  {isDone && !isActive ? "✓" : b.id}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium leading-tight">
                    {b.title}
                  </span>
                  <span className="cui-rail-glance">{glance}</span>
                </span>
                {isLocked && (
                  <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ink-4)" }}>
                    🔒
                  </span>
                )}
                {!b.implemented && (
                  <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ink-4)" }}>
                    bald
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Footer mit Schema/Engine-Info (Phase 6 Polish) */}
      <div
        className="mt-3 border-t pt-2 text-[10px]"
        style={{ borderColor: "var(--border)", color: "var(--ink-3)" }}
      >
        <div className="flex justify-between">
          <span>Schema</span>
          <strong style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>
            v25
          </strong>
        </div>
        <div className="flex justify-between">
          <span>Engine</span>
          <strong style={{ fontWeight: 500 }}>BSV 2025</strong>
        </div>
      </div>
    </div>
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
