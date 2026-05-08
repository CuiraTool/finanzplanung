/**
 * Wizard-Block-Reihenfolge für Etappe 0/1.
 *
 * Mapping zu den Typeform-Blöcken (siehe docs/Pensionsplanung_Typeform_Optimierung):
 *  1 → A + B (Kopfdaten zusammen mit Zivilstand & Familie)
 *  2 → D     (Ziele & Wünsche)
 *  3 → E     (1. Säule AHV)
 *  4 → F     (2. Säule Pensionskasse)
 *  5 → G     (3. Säule 3a/3b)
 *  6 → H     (Vermögen, Liquidität, Verbindlichkeiten)
 *  7 → I+J+K (Immobilien: Eigenheim, Ferien, Rendite)
 *  8 → L     (Firma / Selbständigkeit)
 *  9 → N+Q   (Nachlass: Erbschaft/Schenkung + Vorsorge-/Nachlassdokumente)
 *
 * Bewusst weggelassen für jetzt: Block C (Pensionierungsszenario — wird in Block 1
 * mit aufgenommen), M (Anlagen vertieft), O (Steuern/Wohnort), P (Versicherungen),
 * R (Prioritäten), S (Abschluss). Kommen, wenn der Kern steht.
 */
const BLOCKS = [
  { id: 1, title: "Personen" },
  { id: 2, title: "Ziele & Wünsche" },
  { id: 3, title: "1. Säule (AHV)" },
  { id: 4, title: "2. Säule (Pensionskasse)" },
  { id: 5, title: "3. Säule (3a / 3b)" },
  { id: 6, title: "Vermögen" },
  { id: 7, title: "Immobilien" },
  { id: 8, title: "Firma / Selbständigkeit" },
  { id: 9, title: "Nachlass" },
] as const;

export function Wizard() {
  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Pensionsplanung</h1>
        <p className="text-sm text-slate-500">Eingabe</p>
      </header>
      <ol className="space-y-1">
        {BLOCKS.map((b) => (
          <li
            key={b.id}
            className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-slate-200 text-xs font-medium tabular-nums">
              {b.id}
            </span>
            <span>{b.title}</span>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-xs text-slate-400">
        Etappe 0 — Block-Skelett. Felder kommen in Etappe 1.
      </p>
    </div>
  );
}
