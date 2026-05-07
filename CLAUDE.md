# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projektstatus

**Greenfield, Planungsphase abgeschlossen, Etappe 0 noch nicht gestartet.** Repo enthält bisher nur die beiden Quelldokumente, keine Codebase. Sobald `package.json` existiert, ist der Abschnitt "Commands" hier zu ergänzen.

## Was wir bauen

Interaktives Pensionsplanungs-Webtool für **Cuira Partners GmbH** (kathir@cuirapartners.ch). Soll das statische Taxware-PDF ersetzen — Eingabe links, Live-Dashboard rechts, Charts und Massnahmen aktualisieren sich auf jede Eingabe in Echtzeit.

Geschäftliches Ziel: **Markt-Disruption gegen VZ Vermögenszentrum** (verlangen CHF 3'000+ pro Pensionsplanung) bei einem Preispunkt um CHF 300, ermöglicht durch hohen Automatisierungsgrad.

**Zwei Zielgruppen, eine App, zwei "Türen":**
- **Berater-Modus** (B2B): Cuira-Partner mit Lizenz, betreuen ihre Kunden
- **Endkunden-Modus** (B2C, Etappe 5+): Privatperson registriert selbst, zahlt einmalig

## Quelldokumente (Pflichtlektüre)

- **`Def.FinancialPlanning - Muster.pdf`** (23 Seiten) — Taxware-Output für fiktives Ehepaar Muster (Ralph 1967, Stephanie 1972, Steuerkanton ZH). Liefert die Referenzwerte, gegen die unsere Engine validieren muss. Beispiele: AHV-Ehepaarrente CHF 33'072 p.a., Nettovermögen 2024 CHF 1'854'826, Total Steuern Ausgangslage 2024–2036 CHF 446'037.
- **`Pensionsplanung_Typeform_Optimierung (1).docx`** — Spec für das Eingabe-Datenmodell. Blöcke A–S, ~50 Felder mit Feldtypen (ST/LT/EM/NR/DT/Y/N/SC/MC/DD). Switch in Block A6 (Einzelperson/Paar/Konkubinat) steuert die gesamte Paar-Logik. Diese Spec ist die Quelle für unsere Zod-Schemas.

## Tech-Stack-Entscheidungen (verbindlich)

| Bereich | Entscheidung | Warum |
|---|---|---|
| Frontend | Next.js 15 + React + TypeScript + Tailwind | Standard-Stack, 1-Klick-Deploy auf Vercel |
| State | Zustand + LocalStorage-Persistierung | Klein, schnell, reaktiv |
| Forms + Validierung | React Hook Form + Zod | Zod-Schema = Single Source of Truth (UI, Validierung, Engine-Input) |
| Charts | Recharts | Reicht für Stacked-Bars/Lines à la Taxware |
| **Berechnungs-Engine** | **Pure TypeScript, läuft im Browser** | Echtzeit-Reaktivität (sub-50ms), kein Server-Round-Trip |
| Tests | Vitest, gegen Taxware-Muster-Werte | Engine ist das Herzstück — falsche Zahlen = wertlos |
| Auth + DB (ab Etappe 4) | Supabase (Region Frankfurt) | DSG-tauglich, gratis bis ~50k Nutzer |
| PDF-Export (Etappe 3) | Puppeteer serverseitig | Layout am Taxware-PDF orientiert |
| Deploy | Vercel, Domain `plan.cuirapartners.ch` | Free-Tier reicht für Etappe 0–3 |

## Geplante Engine-Module

```
engine/
  ahv.ts         1. Säule — Vollrenten 2026, Splitting, Fehljahre, Frühbezug/Aufschub
  bvg.ts         2. Säule — Altersguthaben, Umwandlungssatz, WEF, Einkäufe + 3y-Sperrfrist
  saeule3.ts     3a/3b — Max-Beitrag, Staffelbezug, Bank- vs. Versicherungsgefäss
  realestate.ts  Eigenmietwert, Schuldzinsabzug, GGSt, Hypothek-Tranchen
  tax.ts         Eink./Verm./Kap.steuer (Bund + Kanton, Start ZH/ZG)
  cashflow.ts    25-Jahres-Projektion, kombiniert alle Module
  scenario.ts    Szenario-Vergleich (Ausgangslage vs. Variante 1/2)
```

**Validierungs-Regel:** Jedes Engine-Modul hat einen Vitest-Test, der gegen einen konkreten Wert aus dem Muster-PDF rechnet. Solange die Muster-Zahlen nicht reproduziert werden, gilt die Engine als nicht funktional.

## Etappenplan

| # | Inhalt | Erfolgskriterium |
|---|---|---|
| 0 | Repo + Wizard-Skelett A–G + Engine v0 (AHV, BVG, 3a, Einzelperson) | Cashflow Einzelperson rechnet ±2% Hand-Rechnung |
| 1 | Alle Blöcke E–S, Cashflow + Vermögen + Steuern (1 Kanton) | Ralph solo → Taxware-Zahlen reproduziert |
| 2 | Paare + Szenario-Vergleich + Auto-Massnahmen | Muster-Ehepaar, alle 3 Taxware-Szenarien reproduziert |
| 3 | Immobilien (WEF, GGSt) + Multi-Kanton + PDF-Export | Kunden-Handover-PDF generierbar |
| 4 | Supabase-Auth + Berater-Dashboard + Sharing | Erste Cuira-Partner nutzen es live |
| 5 | B2C-Self-Service + Pricing + Zahlungsabwicklung | Erster bezahlter Endkunde ohne Berater |

## Invarianten (nicht verhandelbar)

- **Sprache UI:** Deutsch (Schweizerdeutsch-Wording, "Sie"-Form für Endkunde, "Du"-Form für Partner — siehe Typeform-Spec)
- **Recht:** Schweizer Recht. AHV/BVG/3a-Regeln Stand aktuelles Jahr. DSG-konform (revidiertes DSG seit Sept. 2023).
- **Daten-Region:** Server in der Schweiz oder EU (Supabase Frankfurt). Keine US-Hosts für PII.
- **Echtzeit-Reaktivität:** Jede Eingabeänderung muss in <100ms im Dashboard sichtbar sein. Wenn ein Feature das verletzt, wird es anders gelöst (z.B. Web Worker), nicht durch Loading-Spinner kaschiert.
- **Validierung gegen Taxware:** Jeder Engine-PR enthält den Test gegen mindestens einen Muster-PDF-Wert.

## Arbeitsweise mit diesem Repo

- **Solo-Coder:** Kathir codet allein. Keine PR-Reviews nötig — direkt in `main` arbeiten ist OK.
- **Tiago** ist Produkt-/Finance-Brain, schreibt keinen Code. Output für ihn: lauffähige Demos, keine Code-Reviews.
- **Quellprüfung:** Bei Engine-Logik immer das Taxware-PDF konsultieren (Seite und Zahl in den Test-Kommentar).
- **Steuerdaten:** Müssen pro Kanton recherchiert werden (~1 Tag/Kanton). Quellen: ESTV, kantonale Steuerverwaltung. Tabellen als TypeScript-Konstanten in `engine/tax-data/<kanton>.ts` ablegen.

## Commands

*Wird ergänzt, sobald Etappe 0 das Next.js-Projekt aufgesetzt hat. Erwartete Standards:*

```bash
# Erwartete Standards nach Etappe 0:
# pnpm install
# pnpm dev              # Dev-Server localhost:3000
# pnpm test             # Vitest (Engine-Tests gegen Taxware-Werte)
# pnpm test:watch       # Vitest watch mode
# pnpm typecheck        # TS strict check
# pnpm build            # Production build
```
