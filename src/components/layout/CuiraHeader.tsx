/**
 * Cuira-Header — wordmark + tool name. Logo ist Placeholder-SVG, wird durch
 * echtes Cuira-Logo ersetzt sobald verfügbar.
 */
export function CuiraHeader() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-[var(--color-cuira-deep)] px-6 py-3 text-white">
      <div className="flex items-center gap-3">
        <CuiraLogoMark />
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-wide">Cuira Partners</div>
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

function CuiraLogoMark() {
  return (
    <svg
      viewBox="0 0 40 40"
      width="32"
      height="32"
      aria-label="Cuira Partners Logo"
      className="shrink-0"
    >
      <circle cx="20" cy="20" r="19" fill="white" />
      <text
        x="20"
        y="27"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="22"
        fontWeight="700"
        fill="var(--color-cuira-deep)"
      >
        C
      </text>
    </svg>
  );
}
