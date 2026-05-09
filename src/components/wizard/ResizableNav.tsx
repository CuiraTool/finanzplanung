"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "cuira-wizard-nav-px";
const DEFAULT_LEFT_PX = 260;
const MIN_LEFT_PX = 200;
const MAX_LEFT_PX = 380;
const MIN_RIGHT_PX = 480;

interface Props {
  left: React.ReactNode;
  right: React.ReactNode;
}

/**
 * Zwei-Spalten-Layout für den Wizard-Mode mit verschiebbarer Trennlinie
 * zwischen Block-Navigation (links) und aktiver Block-Eingabe (rechts).
 *
 * - Links: sticky Block-Liste, Breite via CSS-Variable
 * - Mitte: 1px Drag-Handle (col-resize)
 * - Rechts: Eingabe-Felder, fluid
 *
 * Min 200 / Max 380 px für die Nav-Spalte. Gespeichert in LocalStorage.
 */
export function ResizableNav({ left, right }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState<number>(DEFAULT_LEFT_PX);
  const [dragging, setDragging] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const v = parseInt(stored, 10);
      if (Number.isFinite(v) && v >= MIN_LEFT_PX && v <= MAX_LEFT_PX) {
        setLeftWidth(v);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || dragging) return;
    localStorage.setItem(STORAGE_KEY, String(leftWidth));
  }, [leftWidth, dragging, hydrated]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const max = Math.min(MAX_LEFT_PX, rect.width - MIN_RIGHT_PX);
      const clamped = Math.max(MIN_LEFT_PX, Math.min(max, newWidth));
      setLeftWidth(clamped);
    };

    const handlePointerUp = () => setDragging(false);

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);

    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [dragging]);

  const styleVars = {
    "--cuira-nav-w": `${leftWidth}px`,
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      style={styleVars}
      className="flex items-stretch gap-0"
    >
      <aside className="w-[var(--cuira-nav-w)] shrink-0 self-start py-1 pr-2">
        <div className="sticky top-2">{left}</div>
      </aside>

      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={handlePointerDown}
        className={`group relative -mx-1 flex w-2 shrink-0 cursor-col-resize select-none items-stretch ${
          dragging ? "" : ""
        }`}
        title="Trennlinie ziehen, um die Breite anzupassen"
      >
        <span
          className={`m-auto h-12 w-[2px] rounded-full transition-colors ${
            dragging
              ? "bg-blue-500"
              : "bg-slate-200 group-hover:bg-blue-400"
          }`}
        />
      </div>

      <div className="min-w-0 flex-1 pl-2">{right}</div>
    </div>
  );
}
