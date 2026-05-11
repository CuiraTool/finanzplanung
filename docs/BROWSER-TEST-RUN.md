# Browser-Test-Run — Sprint F

**Datum:** 2026-05-11T17:07:37.228Z
**Tool:** Playwright headless (chromium-headless-shell)
**Target:** `http://localhost:3000`
**Seed-Base:** `0xC04A` (deterministisch reproduzierbar)

## Profile

| Status | Count |
|---|---|
| OK (keine Bugs) | 99 |
| Bugs (mittel/leicht) | 1 |
| Crashes (kritisch) | 0 |
| **Total** | **100** |

## Bekannte Baseline-Issues

**SSR/CSR-Hydration-Mismatch (React #418):** 300 Vorkommen über alle Profile.

Fires bereits ohne Profil-Injection (leerer localStorage) — Ursache: `useViewMode()` + Zustand `persist` lesen erst client-side localStorage, während SSR Default-Werte rendert. React-19-strict weniger tolerant als React-18. Existiert vor Sprint F.

**Empfehlung:** `suppressHydrationWarning` auf root-div oder `useEffect()`-Hook für Zustand-rehydrate (Pattern: render Default bis hydrated, dann re-render). Eigener Bug-Fix-PR.

## Performance

- Total runtime: 2486.8s
- Avg pro Profil: 24.87s
- 4 Page-Loads pro Profil (Wizard, Print, Wizard-PlanB, optional zusätzliche)

## Verteilung Fallart

- einzel: 50
- paar: 50

## Top-Kantone (Verteilung)

- GR: 7
- GE: 6
- NW: 6
- UR: 6
- LU: 6
- SO: 5
- GL: 5
- BE: 5
- SZ: 5
- AG: 4
