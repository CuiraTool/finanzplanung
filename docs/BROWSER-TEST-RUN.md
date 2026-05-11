# Browser-Test-Run — Sprint F

**Datum:** 2026-05-11T16:20:38.949Z
**Tool:** Playwright headless (chromium-headless-shell)
**Target:** `https://cuira.netlify.app`
**Seed-Base:** `0xC04A` (deterministisch reproduzierbar)

## Profile

| Status | Count |
|---|---|
| OK (keine Bugs) | 10 |
| Bugs (mittel/leicht) | 0 |
| Crashes (kritisch) | 0 |
| **Total** | **10** |

## Bekannte Baseline-Issues

**SSR/CSR-Hydration-Mismatch (React #418):** 30 Vorkommen über alle Profile.

Fires bereits ohne Profil-Injection (leerer localStorage) — Ursache: `useViewMode()` + Zustand `persist` lesen erst client-side localStorage, während SSR Default-Werte rendert. React-19-strict weniger tolerant als React-18. Existiert vor Sprint F.

**Empfehlung:** `suppressHydrationWarning` auf root-div oder `useEffect()`-Hook für Zustand-rehydrate (Pattern: render Default bis hydrated, dann re-render). Eigener Bug-Fix-PR.

## Performance

- Total runtime: 40.8s
- Avg pro Profil: 4.08s
- 4 Page-Loads pro Profil (Wizard, Print, Wizard-PlanB, optional zusätzliche)

## Verteilung Fallart

- einzel: 6
- paar: 4

## Top-Kantone (Verteilung)

- SG: 2
- SO: 2
- GE: 1
- AG: 1
- NW: 1
- GR: 1
- GL: 1
- BL: 1
