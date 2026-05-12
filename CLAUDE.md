# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projektstatus

**Etappe 1 weitgehend implementiert.** Alle 10 Wizard-Blöcke haben funktionsfähige UI mit Live-Berechnung, Vermögensbilanz-Engine läuft mit drei Stichtagen (heute / Pensionierung / +20 Jahre). Tests grün (170/170), TypeScript strict.

**Was als nächstes kommt:** echte Cashflow-Engine mit Jahres-Iteration (Etappe 2), Charts (Recharts), Steuer-Engine pro Kanton, dann Etappe 1.5 (BSV-Rententabellen statt linearer Approximation).

## Was wir bauen

Interaktives Pensionsplanungs-Webtool für **Cuira Partners GmbH** (kathir@cuirapartners.ch). Ersetzt das statische Taxware-PDF — Eingabe links (Wizard mit 10 Blöcken), Live-Dashboard rechts mit drei Vermögens-KPIs und (kommende) Charts. Trennlinie zwischen Eingabe und Dashboard ist verschiebbar.

Geschäftliches Ziel: **Markt-Disruption gegen VZ Vermögenszentrum** (CHF 3'000+) bei einem Preispunkt um CHF 300, ermöglicht durch hohen Automatisierungsgrad.

**Zwei Zielgruppen, eine App, zwei "Türen":**
- **Berater-Modus** (B2B): Cuira-Partner mit Lizenz, betreuen ihre Kunden
- **Endkunden-Modus** (B2C, Etappe 5+): Privatperson registriert selbst, zahlt einmalig

## Quelldokumente (Pflichtlektüre)

- **`docs/Def.FinancialPlanning - Muster.pdf`** (23 Seiten) — Taxware-Output für fiktives Ehepaar Muster (Ralph 1967, Stephanie 1972, Steuerkanton ZH). Liefert die Referenzwerte, gegen die unsere Engine validieren muss. Beispiele: AHV-Ehepaarrente CHF 33'072 p.a. (Stand 2024 ohne 13. AHV), Nettovermögen 2024 CHF 1'854'826.
- **`docs/Pensionsplanung_Typeform_Optimierung (1).docx`** — Spec für das Eingabe-Datenmodell. Blöcke A–S, ~50 Felder mit Feldtypen. Switch in Block A6 (Einzelperson/Paar/Konkubinat) steuert die gesamte Paar-Logik.

## Tech-Stack (verbindlich)

| Bereich | Entscheidung |
|---|---|
| Frontend | Next.js 15 + React 19 + TypeScript strict + Tailwind v4 |
| State | Zustand mit LocalStorage-Persist (`cuira-plan-vNN`, aktuell v30) |
| Forms | controlled inputs gegen Zustand-Store, kein React Hook Form |
| Charts (geplant) | Recharts |
| **Berechnungs-Engine** | **Pure TypeScript, läuft im Browser** (sub-50ms Echtzeit) |
| Tests | Vitest, validiert gegen Eckwerte aus Muster-PDF |
| Auth + DB (ab Etappe 4) | Supabase Frankfurt |
| Deploy | Vercel (siehe Abschnitt "Deployment") |

## Wizard-Reihenfolge (10 Blöcke)

| # | Block | Engine-Anbindung |
|---|---|---|
| 1 | Personen | Stammdaten, Kinder, Adresse |
| 2 | Ziele & Wünsche | Pensionierungsalter (Wunsch + ordentlich), einmalige Ausgaben |
| 3 | Budget | Einnahmen-Perioden, Ausgaben Total/Detailliert, Wunsch-Verbrauch |
| 4 | 1. Säule (AHV) | `engine/ahv.ts` |
| 5 | 2. Säule (Pensionskasse) | `engine/bvg.ts` |
| 6 | 3. Säule (3a / 3b) | `engine/saeule3.ts` |
| 7 | Vermögen | `engine/vermoegen.ts` |
| 8 | Immobilien | `engine/immobilien.ts` |
| 9 | Firma / Selbständigkeit | inline |
| 10 | Nachlass | reine Status-Erfassung |

**Kontextsensitivität:** Sektion-Titel wechseln je Fallart (Einzelperson → "Personendaten", Paar → "Person 1 — Vorname"). Zivilstand-Optionen abhängig von Fallart.

## Engine-Module (Stand 170 Tests grün)

```
src/engine/
  ahv.ts             1. Säule, BSV-Werte 2025 (Min 15'120, Max 30'240, Plafond
                     Ehepaar 45'360), 13. AHV ab 2026 (Faktor 13/12), Vorbezug
                     max 2 J. (6.8%/J.), Aufschub max 5 J. (BSV-Tabelle)
  bvg.ts             2. Säule, UWS pro Person, Mindestzinssatz 1.25%, Einkäufe
                     verzinst, 3-J.-Sperrfrist-Warnung; Freizügigkeit als
                     eigene Auszahlung mit Auszahlungsjahr + Rendite
  saeule3.ts         3a/3b — Konto (mit Rendite-Projektion) oder Versicherung
                     (Rückkaufswert + Ablaufwert + Ablaufjahr)
  vermoegen.ts       Konten, Depots, Darlehen mit Rendite + Hauptkonto-Flag
  immobilien.ts      Verkehrswert, Hypotheken-Tranchen, Plan behalten/verkaufen,
                     Mieteinnahmen für Renditeliegenschaften
  vermoegensbilanz.ts  Quick-Cashflow-Engine: Stichtag heute / Pension / +20 J.
                       Aggregiert alle Module, dokumentierte Vereinfachungen.
```

**Validierungs-Regel:** Jedes Engine-Modul hat Vitest-Tests mit konkreten Werten (BSV 2025, Plafond-Tests, Edge-Cases).

## Vereinfachungen / Designentscheide

- ✅ AHV: BSV-Skala 44 echte Tabelle (Etappe 1.5 done, Stand 2025)
- ✅ AHV21-Übergangsalter (Frauen Jg 1961-63) modelliert
- 🟡 BVG: Pauschaler UWS pro Person, lineare Saldo-Wachstum bis Bezugsjahr nicht modelliert
- ✅ Vermögensbilanz: Inflation-Toggle, Steuern aus ESTV-Engine
- ✅ Hypothek-Tragbarkeit modelliert (heute + bei Pension)
- ✅ **Eigenmietwert + Schuldzinsabzug bis Steuerjahr 2029** — die
  Reform 2030 (Volksabstimmung Sept 2025 angenommen, Inkrafttreten 1.1.2030)
  schafft beides ab. Engine: `EIGENMIETWERT_LETZTES_JAHR = 2029`. Ab
  Steuerjahr 2030 entfällt beides automatisch.
- ✅ Grundstückgewinnsteuer beim Verkauf (engine/grundstueckgewinn.ts) — 9 Kantone ZH/ZG/SZ/BE/LU/AG/SG/TI/VD + Median-Fallback, Besitzdauer-Faktor (Spekulationszuschlag bis +50%, Langhalter-Rabatt bis −60%), optional Kaufjahr+Anlagekosten pro Immobilie
- ✅ BVG-Sparphase Saldo-Hochlauf — linearer Hochlauf vom altersguthabenHeute zum altersguthabenBeiBezug (vereinfacht, ±2-3% Fehler vs. exakter Sparphasen-Mathematik)
- ✅ 13. AHV für Pre-2026-Pensionierte — Faktor 13/12 ab Dez 2026 für alle Rentner (auch Bezug vor 2026)
- ✅ AHV21 ordentliches Ref-Alter im bezugsfaktor (Frauen Jg 1961-63 = 64.25/64.5/64.75)
- ✅ Erbschaft-Verwandtschaft konfigurierbar (Block 10): nachkomme/ehegatte/eltern/geschwister/konkubinat/nicht_verwandt
- ✅ Multi-Kanton Umzug via Variante (SzenarioBOverrides: umzugJahr + umzugZielKanton) — Wohnsitzkanton-Wechsel wirkt auf Einkommens-/Vermögens-/Erbschaftssteuer
- ✅ Liquidations-Wasserfall bei negativem Hauptkonto: Depot wird angezapft (kein Auto-Immo-Verkauf)
- ✅ BVG-Aufschub > 65: Saldo wächst mit Mindestzins 1.25% p.a. ohne neue Sparbeiträge
- ✅ Art. 37b DBG Liquidationsgewinn-Approximation: Firma-Erlös zu 1/5 in Kapital-Sondertarif bei Selbständig + Alter ≥ 55
- ✅ AHV-NE Pro-Rata bei Halbjahres-Erwerbsende — Anteil = (12 − Erwerbsmonate) / 12

## Etappenplan

| # | Inhalt | Status |
|---|---|---|
| 0 | Repo + Wizard-Skelett + Engine v0 | ✅ |
| 1 | Alle 10 Blöcke + Engines + Vermögensbilanz | ✅ |
| 1.5 | BSV-Rententabellen statt Linear-Approx | ✅ |
| 2 | Cashflow-Engine mit Jahres-Iteration + Charts (Recharts) | offen |
| 2.5 | Steuer-Engine ZH/ZG (Eink./Verm./Kap./GGSt) | offen |
| 3 | Multi-Kanton + PDF-Export (Puppeteer) | offen |
| 4 | Supabase-Auth + Berater-Dashboard + Sharing | offen |
| 5 | B2C-Self-Service + Pricing | offen |

## Invarianten (nicht verhandelbar)

- **Sprache UI:** Deutsch (Schweizerdeutsch-Wording)
- **Recht:** Schweizer Recht, AHV21-Stand, DSG-konform
- **Daten-Region:** Server in CH oder EU (Supabase Frankfurt). Keine US-Hosts für PII.
- **Echtzeit-Reaktivität:** Eingabe-Änderungen müssen <100ms im Dashboard sichtbar sein.
- **Validierung:** Jeder Engine-PR enthält Test gegen mindestens einen konkreten Wert.

## Arbeitsweise

- **Solo-Coder:** Kathir codet allein, direkt auf `main`
- **Tiago** ist Produkt/Finance-Brain, schreibt keinen Code
- **Erstes Code-Projekt** für Kathir — Tooling-Konzepte beim ersten Vorkommen kurz erklären
- **Auto-push-Modus**: kleine, isolierte Commits gehen sofort auf `main`. Nur bei Force-Push, DB-Migrationen oder externen API-Calls explizit nachfragen.
- **Git-Identität in Commits:** `git -c user.name="Kathir" -c user.email="kathir@cuirapartners.ch" commit ...` — globale Konfiguration setzt Kathir ggf. selbst
- **Schema-Bump:** bei jeder Strukturänderung in `src/lib/store.ts` den Storage-Namen erhöhen (`cuira-plan-vNN+1`), damit alte LocalStorage-States nicht in inkompatible Strukturen rehydrieren

## Commands

```bash
pnpm install               # Dependencies
pnpm dev                   # Dev-Server localhost:3000
pnpm test                  # Vitest single-run (165 Tests aktuell)
pnpm test:watch            # Vitest watch mode
pnpm typecheck             # TS strict check (tsc --noEmit)
pnpm build                 # Production build
```

## Pnpm-Spezifisches

- **`verify-deps-before-run=false`** ist global konfiguriert (siehe `.npmrc`),
  damit pnpm 11 nicht bei jedem `pnpm <script>` einen impliziten Dep-Check fährt.
- **Build-Scripts** (esbuild, sharp, unrs-resolver) sind in
  `package.json` unter `pnpm.onlyBuiltDependencies` whitelisted — auf neuem
  Rechner einmal `pnpm rebuild esbuild sharp unrs-resolver` ausführen.

## Deployment

**Live unter https://cuira.netlify.app** — Auto-Deploy bei jedem Push auf `main`.
Netlify-Konfiguration in `netlify.toml` (pnpm 9.12.0 gepinnt via `PNPM_VERSION`,
Node 22 via `.nvmrc`). Custom-Domain `plan.cuirapartners.ch` ist vorbereitet,
aber noch nicht aktiviert. Schritte siehe `docs/DEPLOY.md`.

## Bekannte Drift gegen Muster-PDF (Stand: erwartet)

Die Linear-Approximation der AHV-Skala 44 plus 13. AHV ergibt für Ehepaar Muster
(Ralph + Stephanie, beide Vollrente bei Maximum) andere Werte als die im PDF
ausgewiesenen CHF 33'072 p.a. (Stand 2024, ohne 13. AHV, mit individueller
massgebender Einkommens-Berechnung). Der Test in `src/engine/ahv.test.ts`
dokumentiert diese erwartete Diskrepanz und wird in Etappe 1.5 mit echten
BSV-Tabellen aufgelöst.
