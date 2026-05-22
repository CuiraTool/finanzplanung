# ONBOARDING — Cuira Pensionsplanung

Diese Datei bringt eine:n neue:n Entwickler:in in rund einem Tag produktiv. Sie
ergänzt `CLAUDE.md` (Tech-Entscheide, Engine-Details, Invarianten) um den
praktischen Einstieg.

## Was ist das?

Interaktives Pensionsplanungs-Webtool für Cuira Partners GmbH — digitale,
automatisierte Alternative zur klassischen Pensionsplanung (Marktreferenz: VZ
Vermögenszentrum). Drei Produkte auf einer Codebasis:

- **Pro-Tool** (`/app`) — interne Cuira-Planer
- **Erfassungstool** (`/erfassung`) — externe Berater erfassen Kundendaten
- **B2C** (`/kunde`) — "Reicht meine Pensionierung?", öffentlich, Lead-Funnel

## Voraussetzungen

- **Node 22** (siehe `.nvmrc`) — z.B. `nvm use`
- **pnpm 9.12.0** (gepinnt via `packageManager` in `package.json`) —
  `corepack enable` aktiviert die richtige Version automatisch
- Git, ein Editor mit TypeScript-Support

## Lokales Setup

```bash
git clone https://github.com/CuiraTool/finanzplanung.git
cd finanzplanung
pnpm install
# Native Build-Deps einmalig bauen (auf neuem Rechner):
pnpm rebuild esbuild sharp unrs-resolver
cp .env.example .env.local      # danach Keys eintragen — siehe unten
pnpm dev                         # http://localhost:3000
```

## Umgebungsvariablen (`.env.local`)

| Variable | Pflicht | Zweck |
|---|---|---|
| `ANTHROPIC_API_KEY` | für KI-Features | Doc-Upload-Extraktion, KI-Erklärungen, KI-Massnahmen |
| `RESEND_API_KEY` | optional | E-Mail-Versand der Erfassung; ohne Key → JSON-Download-Fallback |
| `CUIRA_SENDER_EMAIL` | optional | Absender-Adresse für Resend |
| `NEXT_PUBLIC_CALENDLY_DETAIL_URL` | optional | Calendly-Buchungslink B2C-Detailanalyse |

Keys NIE committen — nur in `.env.local` (gitignored) und in den
Netlify-Env-Variablen. Die App läuft auch ohne Keys; die KI-Routen liefern dann
einen Fehler bzw. einen Fallback.

## Architektur in einer Seite

- **Frontend** — Next.js 15 App Router, React 19, TypeScript strict, Tailwind
  v4. Links der 10-Block-Wizard (`src/components/wizard/Block1…Block10`), rechts
  ein Live-Dashboard (`src/components/dashboard/`), dazwischen eine verschiebbare
  Trennlinie.
- **State** — Zustand mit LocalStorage-Persist (`src/lib/store.ts`, Key
  `cuira-plan-v43`). Controlled inputs gegen den Store, kein React Hook Form.
- **Berechnungs-Engine** — `src/engine/`, pure TypeScript, läuft im Browser
  (< 50 ms). Keine I/O, keine Seiteneffekte → jede Funktion ist isoliert
  testbar. Module: `ahv` (1. Säule), `bvg` (2. Säule), `saeule3` (3a/3b),
  `vermoegen`, `immobilien`, `grundstueckgewinn`, `steuer` (+ `steuer-engine/`),
  `vermoegensbilanz` (Schnell-Bilanz, drei Stichtage), `cashflow`
  (Jahres-Iteration — die massgebliche Engine).
- **KI-Layer** — `src/app/api/{extract,explain,massnahmen-ki,erfassung}` —
  Next.js Route Handler, rufen die Anthropic-Claude- bzw. Resend-API.
- **Routen** — `/` Landing · `/app` Pro · `/erfassung` Berater · `/kunde` B2C ·
  `/print` PDF-Ausgabe · `/login/*`.

## Die Engine — wie man eine Änderung validiert

Die Engine ist das Herzstück. Referenz ist `docs/Def.FinancialPlanning -
Muster.pdf` (Taxware-Output für ein fiktives Ehepaar) — die Eckwerte, gegen die
validiert wird. Jedes Engine-Modul hat Vitest-Tests mit konkreten Werten (BSV
2025, ESTV-Tarife).

Bei jeder Engine-Änderung:

1. `pnpm test` — alle 1267 Tests müssen grün bleiben.
2. `pnpm typecheck` — TypeScript strict, sauber.
3. Steuer-Änderungen: `src/engine/__validation__/estv-validation.test.ts` prüft
   gegen echte ESTV-Tarife (Drift-Ziel ±5 %).
4. Neue Engine-Logik braucht einen Test gegen mindestens einen konkreten Wert
   (Invariante — siehe `CLAUDE.md`).

## Commands

```bash
pnpm dev          # Dev-Server :3000
pnpm test         # Vitest single-run (1267 Tests)
pnpm test:watch   # Vitest watch mode
pnpm typecheck    # tsc --noEmit (TS strict)
pnpm build        # Production-Build
```

## Deploy-Flow

- **Live:** https://cuira.netlify.app — Netlify, Auto-Deploy bei jedem Push auf
  `main`.
- **CI:** `.github/workflows/ci.yml` läuft typecheck + test + build bei jedem
  Pull Request und Push auf `main`. Ein roter Lauf heisst: nicht mergen.
- Konfiguration: `netlify.toml` (pnpm- und Node-Version gepinnt),
  Deploy-Anleitung in `docs/DEPLOY.md`.

## Schema-Bump-Regel (wichtig — Datenverlust-Falle)

Bei jeder Strukturänderung am Store drei Werte gemeinsam erhöhen und identisch
halten: den Storage-`name` (`cuira-plan-vNN`), das `version`-Feld der
persist-Config (`src/lib/store.ts`) und `AKTUELLE_SCHEMA_VERSION`
(`src/lib/plan-export.ts`). Eine strukturändernde Migration braucht zusätzlich
einen Branch in der `migrate`-Funktion. Sonst rehydrieren alte LocalStorage-
States in inkompatible Strukturen.

## Erste PR

1. Branch anlegen: `feat/...` oder `fix/...`.
2. Änderung + Test. Lokal `pnpm test && pnpm typecheck` grün.
3. PR öffnen → CI abwarten → mergen.
4. Commit-Identität setzen, falls nicht global konfiguriert:
   `git -c user.name="..." -c user.email="..." commit ...`.

## Weiterführend

- `CLAUDE.md` — Tech-Stack, Engine-Module, dokumentierte Vereinfachungen,
  Invarianten, Arbeitsweise.
- `docs/` — interne Audits (Legal, Quant, Engine-Vergleich, ESTV-Validierung,
  UX, Accessibility), `DEPLOY.md`, die Muster-PDF-Referenz und die
  Datenmodell-Spec.
