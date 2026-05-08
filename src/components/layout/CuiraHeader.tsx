import Image from "next/image";

/**
 * Cuira-Header — offizielles Wordmark-Logo (weisse Version) auf
 * Cuira-Dunkelblau-Hintergrund, plus Tool-Bezeichnung.
 *
 * Logo-Quelle: cuirapartners.ch (Cuira-Schriftzug-weiss-DEF.png), lokal
 * unter public/cuira-logo.png hinterlegt.
 */
export function CuiraHeader() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-[var(--color-cuira-deep)] px-6 py-3 text-white">
      <div className="flex items-center gap-4">
        <Image
          src="/cuira-logo.png"
          alt="Cuira Partners"
          width={140}
          height={60}
          priority
          className="h-10 w-auto"
        />
        <div className="hidden border-l border-white/20 pl-4 leading-tight md:block">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-300">
            Pensionsplanung
          </div>
        </div>
      </div>
      <div className="hidden text-xs text-slate-300 md:block">
        Etappe 1 — interaktive Auslegeordnung
      </div>
    </header>
  );
}
