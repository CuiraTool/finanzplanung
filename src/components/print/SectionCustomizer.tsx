"use client";

import { useState } from "react";
import {
  usePdfCustomization,
  type PdfSectionKey,
} from "@/lib/pdf-customization";

/**
 * Inline-Editor pro Print-Section. Listet alle Items aus der Engine-Quelle,
 * erlaubt:
 *  - Sichtbarkeit toggeln (Auge-Icon)
 *  - Reihenfolge per ↑↓-Buttons verschieben
 *  - Titel + Text editieren (Inline-Inputs)
 *  - Section-Reset
 *
 * Im PDF-Cover oder Print-Toolbar mounten — Berater öffnet bei Bedarf
 * pro Section.
 */
interface Item {
  id: string;
  titel: string;
  text: string;
}

interface Props {
  section: PdfSectionKey;
  sectionLabel: string;
  items: Item[];
}

export function SectionCustomizer({ section, sectionLabel, items }: Props) {
  const [open, setOpen] = useState(false);
  const { sections, toggleHide, setOrder, setEdit, clearEdit, resetSection } =
    usePdfCustomization();
  const cfg = sections[section];

  // Display-Liste: orderIds-Reihenfolge zuerst, dann Rest
  const displayItems = (() => {
    if (cfg.orderIds.length === 0) return items;
    const byId = new Map(items.map((it) => [it.id, it]));
    const out: Item[] = [];
    for (const id of cfg.orderIds) {
      const f = byId.get(id);
      if (f) {
        out.push(f);
        byId.delete(id);
      }
    }
    for (const r of byId.values()) out.push(r);
    return out;
  })();

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const newOrder = displayItems.map((it) => it.id);
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx]!, newOrder[idx - 1]!];
    setOrder(section, newOrder);
  };
  const moveDown = (idx: number) => {
    if (idx >= displayItems.length - 1) return;
    const newOrder = displayItems.map((it) => it.id);
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1]!, newOrder[idx]!];
    setOrder(section, newOrder);
  };

  const isHidden = (id: string) => cfg.hiddenIds.includes(id);
  const sichtbarAnz = displayItems.filter((it) => !isHidden(it.id)).length;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 print:hidden"
        title={`${sectionLabel}: Sichtbarkeit, Reihenfolge, Inhalt anpassen`}
      >
        ✎ {sectionLabel} anpassen ({sichtbarAnz}/{items.length})
      </button>
    );
  }

  return (
    <div className="rounded-md border border-slate-300 bg-white p-3 text-xs print:hidden">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold text-slate-700">
          {sectionLabel} anpassen
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (confirm(`${sectionLabel} auf Default zurücksetzen?`)) {
                resetSection(section);
              }
            }}
            className="text-[11px] text-slate-500 hover:underline"
          >
            Zurücksetzen
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[11px] text-slate-500 hover:underline"
          >
            Schliessen
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-[11px] text-slate-400">Keine Einträge vorhanden.</p>
      ) : (
        <ul className="space-y-2">
          {displayItems.map((it, idx) => {
            const hidden = isHidden(it.id);
            const edit = cfg.edits[it.id] ?? {};
            return (
              <li
                key={it.id}
                className={`rounded border p-2 ${
                  hidden ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="rounded border border-slate-200 px-1 text-[10px] text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      title="Nach oben"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(idx)}
                      disabled={idx === displayItems.length - 1}
                      className="rounded border border-slate-200 px-1 text-[10px] text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      title="Nach unten"
                    >
                      ↓
                    </button>
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={edit.titel ?? it.titel}
                      onChange={(e) =>
                        setEdit(section, it.id, { titel: e.target.value })
                      }
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                    />
                    <textarea
                      value={edit.text ?? it.text}
                      onChange={(e) =>
                        setEdit(section, it.id, { text: e.target.value })
                      }
                      rows={2}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600"
                    />
                    {(edit.titel || edit.text) && (
                      <button
                        type="button"
                        onClick={() => clearEdit(section, it.id)}
                        className="text-[10px] text-slate-400 hover:underline"
                      >
                        Original wiederherstellen
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleHide(section, it.id)}
                    className={`rounded border px-2 py-1 text-[11px] ${
                      hidden
                        ? "border-slate-200 bg-slate-50 text-slate-400"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                    title={hidden ? "Im PDF anzeigen" : "Im PDF ausblenden"}
                  >
                    {hidden ? "Ausgeblendet" : "Sichtbar"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
