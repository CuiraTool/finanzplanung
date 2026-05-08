# Finanzplanung

Interaktives Pensionsplanungs-Webtool für Cuira Partners GmbH. Live-Dashboard ersetzt das statische Taxware-PDF — Eingabe links (10-Block-Wizard), Vermögensbilanz und Charts rechts in Echtzeit.

## Quick Start

```bash
pnpm install
pnpm dev          # localhost:3000
pnpm test         # 73 Tests gegen BSV-Werte 2025 + Muster-PDF-Eckwerte
pnpm typecheck    # TS strict
```

## Architektur

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript strict + Tailwind v4
- **State:** Zustand + LocalStorage-Persist
- **Charts (geplant Etappe 2):** Recharts
- **Berechnungs-Engine:** Pure TypeScript, läuft im Browser (Echtzeit, sub-50ms)
- **Tests:** Vitest, validiert gegen BSV 2025 und Muster-PDF-Eckwerte

## Ordnerstruktur

```
src/
  app/                 Next.js App Router (Layout, Page, globals.css)
  components/
    ui/                geteilte Form-Bausteine (Field, Section, Input, Button)
    layout/            ResizableSplit (verschiebbare Trennlinie Wizard ↔ Dashboard)
    wizard/            Block1Personen.tsx … Block10Nachlass.tsx
    dashboard/         Live-Dashboard mit Vermögensbilanz-KPIs
  engine/              ahv, bvg, saeule3, vermoegen, immobilien, vermoegensbilanz
  lib/                 Zustand-Store, Helpers (format, pension)
docs/
  Def.FinancialPlanning - Muster.pdf       Taxware-Referenz
  Pensionsplanung_Typeform_Optimierung.docx Datenmodell-Spec
  DEPLOY.md            Vercel-Deployment-Anleitung
```

## Status

**Etappe 1 weitgehend komplett** — alle 10 Wizard-Blöcke implementiert, Vermögensbilanz-Engine berechnet drei Stichtage (heute / Pensionierung / +20 Jahre). 73/73 Tests grün.

Roadmap-Etappen 1.5 (BSV-Tabellen), 2 (Cashflow + Charts), 2.5 (Steuer-Engine), 3 (PDF-Export), 4 (Auth/Sharing) folgen — siehe [`CLAUDE.md`](CLAUDE.md).

## Deployment

Aktuell nur lokal. Vercel-Setup vorbereitet — Anleitung unter [`docs/DEPLOY.md`](docs/DEPLOY.md). Nach erstem Deploy ist die App unter einer Vercel-URL erreichbar (später `plan.cuirapartners.ch`).

## Mehr Kontext

[`CLAUDE.md`](CLAUDE.md) hält Tech-Entscheide, Engine-Module, Etappen, Invarianten und Arbeitsweise fest. Wird in jedem neuen Claude-Code-Chat im Repo automatisch geladen.
