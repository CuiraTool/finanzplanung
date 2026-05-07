const BLOCKS = [
  { id: "A", title: "Partner-Kopfdaten" },
  { id: "B", title: "Zivilstand & Familie" },
  { id: "C", title: "Pensionierungsszenario" },
  { id: "D", title: "Zielverbrauch & Wünsche" },
  { id: "E", title: "1. Säule (AHV)" },
  { id: "F", title: "2. Säule (Pensionskasse)" },
  { id: "G", title: "3. Säule (3a/3b)" },
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
            <span className="flex size-6 items-center justify-center rounded-full bg-slate-200 text-xs font-medium">
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
