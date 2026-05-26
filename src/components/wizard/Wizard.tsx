"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlanStore, type PlanState } from "@/lib/store";
import { block1MinimumErfuellt } from "@/lib/validation";
import { useViewMode } from "@/lib/view-mode";
import { Block1Personen } from "./Block1Personen";
import { DocUploadCenter } from "./DocUploadCenter";
import { ImportPanel } from "./ImportPanel";
import { ActionPill } from "./ActionPill";
import { ResizableNav } from "./ResizableNav";
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
] as const;

/**
 * Block ist "abgeschlossen" wenn der Berater eine **echte Eingabe**
 * gemacht hat — Default-Werte zählen NICHT.
 *
 * Faustregel pro Block:
 *  - Pflicht-Felder (Vorname, Einkommen, etc.) müssen einen Wert haben
 *  - Optionale Blöcke (Immo, Nachlass, Var B) sind erst ✓ wenn etwas
 *    Aktives erfasst wurde
 *  - Defaults wie Pensionsalter 65, "behalten" bei Firma, Privatkonto ohne
 *    Saldo → sind NICHT genug
 */
function blockIstErledigt(blockId: number, s: PlanState): boolean {
  switch (blockId) {
    case 1:
      return !!(s.person1.vorname && s.person1.geburtsdatum);
    case 2: {
      // Wunschverbrauch, einmalige Ausgaben ODER abweichendes Bezugsalter
      // (Default ist 65). Wenn Berater Pensionsalter geändert hat → Block
      // erfasst, auch ohne Wunschverbrauch.
      const istPaar = s.fallart === "paar";
      const p1Abweicht = s.ziele.bezugsalterP1 !== 65;
      const p2Abweicht = istPaar && s.ziele.bezugsalterP2 !== 65;
      return (
        (s.budget.wunschverbrauchPension ?? 0) > 0 ||
        s.einmaligeAusgaben.length > 0 ||
        p1Abweicht ||
        p2Abweicht
      );
    }
    case 3:
      return (
        (s.budget.einkommenHeute ?? 0) > 0 ||
        (s.budget.ausgabenTotal ?? 0) > 0
      );
    case 4:
      return (s.ahv.einkommenP1 ?? 0) > 0;
    case 5:
      return (s.bvg.p1.altersguthabenHeute ?? 0) > 0;
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
      return total > 0;
    }
    case 7:
      // Mindestens ein Eintrag mit echtem Saldo (Default-Privatkonto = saldo null).
      return s.vermoegen.items.some((it) => (it.saldoHeute ?? 0) !== 0);
    case 8:
      // Optional — gilt nur als erfasst wenn ≥ 1 Liegenschaft mit Verkehrswert
      return s.immobilien.items.some((im) => (im.verkehrswert ?? 0) > 0);
    case 9:
      // Firma vorhanden + Name ODER Berater hat aktiv "geprüft / nicht
      // zutreffend" bestätigt. Default false = noch nicht geprüft.
      return (
        (s.firma.vorhanden && !!s.firma.firmenname) ||
        s.firma.geprueft === true
      );
    case 10:
      // Mindestens ein Häkchen ODER Berater hat aktiv "Themen besprochen"
      // bestätigt (auch wenn alle Felder "nein" = noch nichts erledigt).
      return (
        (Object.values(s.nachlass) as string[]).some(
          (v) => v === "ja" || v === "nicht_notwendig"
        ) || s.nachlassGeprueft === true
      );
    default:
      return false;
  }
}

export function Wizard() {
  const aktiverBlock = usePlanStore((s) => s.aktiverBlock);
  const setAktiverBlock = usePlanStore((s) => s.setAktiverBlock);
  const fullState = usePlanStore();
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
            icon="⇅"
            label="Daten Import / Export"
            active={importOpen}
            caret="down"
            onClick={() => setImportOpen((o) => !o)}
            title="Snapshot exportieren / Erfassungs-JSON oder Snapshot importieren"
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
            v43
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
  const aktiverPlan = usePlanStore((s) => s.aktiverPlan);
  // Re-mount mit `key` triggert die fade-in-Animation (cui-block-fade)
  // bei jedem Block-Wechsel.
  return (
    <div
      key={`${aktiverPlan}-${aktiverBlock}`}
      className="cui-block-fade"
      data-aktiver-plan={aktiverPlan}
      style={{
        borderLeft: `4px solid ${
          aktiverPlan === "a"
            ? "var(--accent)"
            : aktiverPlan === "b"
              ? "oklch(0.55 0.24 295)"
              : "oklch(0.7 0.18 65)"
        }`,
        paddingLeft: "12px",
        marginLeft: "-16px",
      }}
    >
      {aktiverPlan !== "a" && (
        <div
          className="mb-3 rounded-md border px-3 py-2 text-xs"
          style={{
            borderColor:
              aktiverPlan === "b"
                ? "oklch(0.75 0.14 295 / 0.4)"
                : "oklch(0.8 0.12 65 / 0.4)",
            background:
              aktiverPlan === "b"
                ? "oklch(0.97 0.03 295 / 0.4)"
                : "oklch(0.97 0.04 65 / 0.4)",
            color:
              aktiverPlan === "b"
                ? "oklch(0.4 0.18 295)"
                : "oklch(0.45 0.13 65)",
          }}
        >
          ▸ Sie bearbeiten <strong>Plan {aktiverPlan.toUpperCase()}</strong>
          {aktiverBlock === 1 && (
            <span> — Block 1 (Personen) ist mit Plan A geteilt. Änderungen wirken auf alle Varianten.</span>
          )}
        </div>
      )}
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
      <BlockNavFooter aktiverBlock={aktiverBlock} />
    </div>
  );
}

/**
 * Navigation-Footer unten in jedem Block (Tiago-Feedback): Zurück / Nächste.
 * Verhindert dass User nach oben scrollen muss.
 */
function BlockNavFooter({ aktiverBlock }: { aktiverBlock: number }) {
  const setAktiverBlock = usePlanStore((s) => s.setAktiverBlock);
  const min = 1;
  const max = 10;
  const istErster = aktiverBlock === min;
  const istLetzter = aktiverBlock === max;
  return (
    <div className="mt-8 flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--border)" }}>
      <button
        type="button"
        disabled={istErster}
        onClick={() => setAktiverBlock(aktiverBlock - 1)}
        className="cui-btn"
        style={{ opacity: istErster ? 0.4 : 1 }}
      >
        ← Zurück
      </button>
      <span className="text-xs" style={{ color: "var(--ink-3)" }}>
        Block {aktiverBlock} / {max}
      </span>
      <button
        type="button"
        disabled={istLetzter}
        onClick={() => setAktiverBlock(aktiverBlock + 1)}
        className="cui-btn cui-btn-primary"
        style={{ opacity: istLetzter ? 0.4 : 1 }}
      >
        Nächste →
      </button>
    </div>
  );
}
