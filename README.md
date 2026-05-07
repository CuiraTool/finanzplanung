# Finanzplanung

Interaktive Pensionsplanung für Cuira Partners GmbH. Live-Dashboard ersetzt das statische Taxware-PDF.

## Quick Start

```bash
pnpm install
pnpm dev          # localhost:3000
pnpm test         # Engine-Tests gegen Taxware-Muster-Werte
pnpm typecheck
```

## Architektur

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind v4
- **State:** Zustand + LocalStorage
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **Berechnungs-Engine:** Pure TypeScript, läuft im Browser (Echtzeit-Reaktivität)
- **Tests:** Vitest, validiert gegen Referenzwerte aus `docs/Def.FinancialPlanning - Muster.pdf`

## Ordnerstruktur

```
src/
  app/                 Next.js App Router (Pages, Layouts)
  components/          UI-Komponenten (Wizard, Dashboard, Charts)
  engine/              Berechnungs-Engine (AHV, BVG, 3a, Steuern, Cashflow)
  lib/                 Schemas (Zod), State (Zustand), Utilities
docs/                  Quelldokumente (Taxware-Muster, Typeform-Spec)
```

Details und Konventionen: siehe [`CLAUDE.md`](CLAUDE.md).
