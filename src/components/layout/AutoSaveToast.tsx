"use client";

/**
 * Auto-Save-Toast — kurzer visueller Hinweis dass der Plan gespeichert wurde.
 *
 * Zustand-persist speichert bei jedem State-Change ins LocalStorage. Der
 * Toast bestätigt das visuell (1-Sekunde-Slide-In von oben rechts), damit
 * der Berater im Termin sieht: "ja, die Eingabe ist drin, geht nicht
 * verloren wenn ich den Tab schliesse".
 *
 * Strategie:
 * - Subscriber auf den PlanStore
 * - Bei jeder Änderung Toast triggern (mit Debounce 600ms — sonst spammt
 *   es bei jedem Tastendruck im Wizard)
 * - Toast verschwindet nach 1.5 sek
 * - Erste 800ms nach Mount kein Toast (sonst poppt bei jedem Page-Load
 *   einer auf, was nervt)
 */

import { useEffect, useState, useRef } from "react";
import { Check } from "lucide-react";
import { usePlanStore } from "@/lib/store";

const DEBOUNCE_MS = 600;
const TOAST_DAUER_MS = 1500;
const STARTUP_GRACE_MS = 800;

export function AutoSaveToast() {
  const [show, setShow] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const hideRef = useRef<NodeJS.Timeout | null>(null);
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const unsubscribe = usePlanStore.subscribe(() => {
      // Startup-Grace: erste 800ms nach Mount kein Toast
      if (Date.now() - mountTimeRef.current < STARTUP_GRACE_MS) return;

      // Debounce: bei rapider Tipperei nur am Ende anzeigen
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setShow(true);
        if (hideRef.current) clearTimeout(hideRef.current);
        hideRef.current = setTimeout(() => setShow(false), TOAST_DAUER_MS);
      }, DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (hideRef.current) clearTimeout(hideRef.current);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="cui-toast" role="status" aria-live="polite">
      <Check className="h-3.5 w-3.5" />
      <span>Gespeichert</span>
    </div>
  );
}
