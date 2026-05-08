"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "cuira-split-left-px";
const DEFAULT_LEFT_PX = 440;
const MIN_LEFT_PX = 320;
const MIN_RIGHT_PX = 480;

interface ResizableSplitProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

/**
 * Zwei-Spalten-Layout mit verschiebbarer Trennlinie.
 *
 * Auf Desktop (lg+): Drag-Handle in der Mitte, Pointer-Events (Maus + Touch),
 * Breite via CSS-Variable. Min-Breiten verhindern, dass eine Seite verschwindet.
 * Persistierung in LocalStorage.
 *
 * Unter lg: Panels stapeln vertikal, kein Resize.
 */
export function ResizableSplit({ left, right }: ResizableSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState<number>(DEFAULT_LEFT_PX);
  const [dragging, setDragging] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate aus LocalStorage nach Mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const v = parseInt(stored, 10);
      if (Number.isFinite(v) && v >= MIN_LEFT_PX) setLeftWidth(v);
    }
    setHydrated(true);
  }, []);

  // Persistieren bei Änderung (nicht während Drag, sonst hammered LocalStorage)
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
      const max = rect.width - MIN_RIGHT_PX;
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

  // CSS-Variable steuert die Breite des linken Panels — nur ab lg aktiv
  const styleVars = { "--cuira-left-w": `${leftWidth}px` } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      style={styleVars}
      className="flex h-full flex-col lg:flex-row"
    >
      <aside className="w-full overflow-y-auto border-b border-slate-200 bg-white lg:w-[var(--cuira-left-w)] lg:border-b-0 lg:border-r">
        {left}
      </aside>

      {/* Drag-Handle: nur ab lg sichtbar/interaktiv */}
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={handlePointerDown}
        className={`hidden shrink-0 cursor-col-resize select-none lg:flex lg:w-1 lg:items-stretch ${
          dragging ? "bg-blue-500" : "bg-slate-200 hover:bg-blue-400"
        }`}
        title="Trennlinie ziehen, um die Breite anzupassen"
      />

      <section className="flex-1 overflow-y-auto p-6">{right}</section>
    </div>
  );
}
