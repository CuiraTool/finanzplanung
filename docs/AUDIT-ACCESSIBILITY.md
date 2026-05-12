# WCAG 2.1 AA Accessibility-Audit — Cuira Pensionsplanungstool

**Datum:** 2026-05-12
**Scope:** Pro-Modus `/` (Wizard + Dashboard) + `/print` PDF
**Methode:** Statische Code-Analyse + WCAG-2.1-Mapping
**Output:** read-only Findings

## Compliance-Score Schätzung

**WCAG 2.1 Level AA: ~55-60 %**

| Bereich | Score | Bemerkung |
|---|---|---|
| 1.1 Text-Alternativen | 70 % | Logos haben `alt`, Charts haben `role="img"` + `aria-label`, aber kein `aria-describedby` mit Datenbeschreibung |
| 1.3 Adaptable | 75 % | Saubere semantische Strukturen (main, header, section, nav-ähnlich, h1/h2), aber: kein `<nav>`-Landmark, h3 ohne h2 (`StressTests.tsx`) |
| 1.4 Distinguishable | 40 % | **Kritisch:** Massive Verwendung von `text-[10px]`/`text-[11px]` (~150+ Stellen), `--ink-3`/`--ink-4` Kontrast, `/40` Hintergrund-Overlays |
| 2.1 Keyboard | 65 % | Standard-HTML weitestgehend ok, ABER: ESC schliesst nur in 2 von 4+ Modals, kein Focus-Trap, custom Confirm-Dialogs blockieren |
| 2.4 Navigable | 50 % | **Kein Skip-Link**, kein sichtbares `:focus-visible` Styling auf Buttons, mehrfach `focus:outline-none` ohne Ersatz |
| 3.2 Predictable | 80 % | Konsistente Block-Navigation, Plan-A/B/C predictable |
| 3.3 Input Assistance | 70 % | Pflichtfeld-Markierung über `*`, Validierungs-Hinweise vorhanden, ABER: nicht `aria-required`, kein `aria-invalid`, kein `aria-describedby` für Hints |
| 4.1 Compatible | 60 % | Modals fehlen `role="dialog"`/`aria-modal`, kein `aria-labelledby` |

## Top 5 Quick-Wins (höchster Impact pro Aufwand)

1. **Mindest-Schriftgrösse 12px (~14px für Body) erhöhen** — `text-[10px]` und `text-[11px]` durchgängig auf min. `text-xs` (12px) anheben. Für 60+ Berater grenzwertig lesbar. (1.4.4 Resize Text + 1.4.12 Text Spacing)
2. **`role="dialog"` + `aria-modal="true"` + `aria-labelledby` in VarianteDiffModal + PlanVersionenModal** — beide Modals haben Overlay-Pattern, aber keine dialog-Semantik. NVDA/JAWS/VoiceOver lesen sie als generisches DIV vor. (4.1.2)
3. **Skip-Link "Direkt zum Dashboard / zum Wizard"** in `src/app/page.tsx` — Wizard hat 10 Blöcke × ~15 Felder = ~150 Tab-Stops, bevor das Dashboard erreichbar ist. (2.4.1 Bypass Blocks)
4. **`focus-visible` Ring auf allen Buttons** — globales CSS-Reset für `.cui-btn`, `.cui-seg-btn`, `.cui-yesno-btn`, `.cui-topbar-icon-btn`, `.cui-scenario-tab`. Aktuell `focus:outline-none` ohne sichtbaren Ersatz an ~10 Stellen (OrtKantonPicker, GemeindeSelect, SzenarioPanel, etc.). (2.4.7 Focus Visible)
5. **PlausibilityPanel + AutoSaveToast Severity nicht nur über Farbe** — Schwere-Pills/Dots tragen Information allein in Rot/Gelb/Grau. Symbole/Text-Präfix ergänzen + `role="alert"` für `fehler`-Schwere. (1.4.1 Use of Color + 4.1.3 Status Messages)

---

## Findings nach WCAG-Kriterium

### 1.1.1 Non-text Content (Level A)

**F-1.1.1.a — Sankey-SVG nur `aria-label` ohne Datenwerte**
File: `src/components/dashboard/SankeyChart.tsx:419-425`
Severity: **A**
Das SVG hat nur `aria-label="Geldfluss-Diagramm für 2026"`. Die `<title>`-Tags pro Path sind nur für Hover-Tooltips. Screenreader bekommen keine Datenwerte vermittelt.
Fix: `<desc>` nach `<title>` einfügen oder `aria-describedby` auf einen visuell versteckten `<div>` mit Text-Aufzählung (z.B. "Einnahmen 2026: Erwerb 120'000 CHF, AHV 0 CHF, ... Ausgaben: Haushalt 60'000, Steuern 18'000, Saldo +25'000"). Im Print-Layout besonders relevant, weil PDF-Reader auf SVG-Alt-Text angewiesen sind.

**F-1.1.1.b — QuickStart MiniChart komplett ohne Alt-Text**
File: `src/components/wizard/QuickStart.tsx:556-643`
Severity: **A**
~~Das custom-SVG für die Lite-Hochrechnung hat weder `role="img"` noch `aria-label`.~~
**HINFÄLLIG:** QuickStart-Komponente entfernt 2026-05-12.

**F-1.1.1.c — Recharts-Charts haben gar keine aria-Attribute**
Files:
- `src/components/dashboard/EinnahmenAusgabenChart.tsx:84-221`
- `src/components/dashboard/VermoegensChart.tsx`
- `src/components/dashboard/SteuerChart.tsx`

Severity: **A**
ResponsiveContainer rendert SVG ohne `role="img"`/`aria-label`. Recharts-eigene Accessibility ist optional via `accessibilityLayer` Prop (Recharts ≥2.10).
Fix: `<ComposedChart accessibilityLayer>` aktivieren + wrappenden `<figure>` mit `<figcaption>` für Datenzusammenfassung (z.B. "Vermögensverlauf 2026 bis 2055: Maximum CHF 1.85M im Jahr 2032, Minimum CHF 0 — niemals aufgebraucht").

**F-1.1.1.d — Emojis im UI dokumentiert mit `aria-hidden` aber inkonsistent**
Files (Beispiele):
- `src/components/dashboard/Dashboard.tsx:220` (⚖️ mit `aria-hidden` ✓)
- `src/components/dashboard/Dashboard.tsx:306` (📋 ohne `aria-hidden` ✗)
- `src/components/dashboard/VarianteDiffModal.tsx:152, 168, 179` (📅 💰 🏛 🏦 🏠 🏢 alle ohne `aria-hidden`)
- `src/components/dashboard/MassnahmenListe.tsx:129` (💰 ohne `aria-hidden`)
- `src/app/print/page.tsx:247` (📄 ohne `aria-hidden`)

Severity: **A**
Screenreader sprechen Emojis aus ("Geldsack Emoji Optimierungs-Potenzial"). Inkonsistente Anwendung von `aria-hidden`.
Fix: Alle dekorativen Emojis konsistent `aria-hidden="true"` markieren oder durch Lucide-Icons ersetzen.

---

### 1.3.1 Info and Relationships (Level A)

**F-1.3.1.a — Heading-Hierarchie übersprungen**
Files:
- `src/components/dashboard/StressTests.tsx:72, 120` — `<h3>` ohne übergeordnetes `<h2>` (Dashboard hat zwar `<h2>` "Live-Dashboard" auf Top-Level, aber zwischen Dashboard-h2 und Stress-Tests-h3 fehlt h3 oder h2-Ebene durchgängig)
- `src/components/dashboard/Dashboard.tsx:198` — h2 "Live-Dashboard", aber EinnahmenAusgabenChart, VermoegensChart etc. nutzen `<div className="text-base font-semibold">` statt `<h3>`

Severity: **AA**
Screenreader-Outline springt: h1 (Wizard) → h2 (Dashboard) → h3 (StressTests) übersprungen für Plausibility, KPIs, Charts.
Fix: `<header>`-Divs in `EinnahmenAusgabenChart`, `VermoegensChart`, `SteuerChart`, `SankeyChart` mit `<h3>` versehen. PlausibilityPanel hat aktuell auch nur `<div>` als Titel.

**F-1.3.1.b — Tabellen fehlen `<caption>` und `scope`**
Files:
- `src/components/dashboard/VarianteDiffModal.tsx:84-113` — `<table>` ohne `<caption>`, `<th>` ohne `scope="col"`
- `src/components/dashboard/DetailLiquiditaetTable.tsx` — wahrscheinlich gleiches Problem
- `src/app/print/page.tsx:485` — Eckdaten-Tabelle ohne caption

Severity: **A**
Fix: `<caption className="sr-only">Vergleich Plan A vs. Plan B</caption>` + `scope="col"` auf allen `<th>`-Headern.

**F-1.3.1.c — KpiCard nutzt visuelles Layout statt semantischer Struktur**
File: `src/components/dashboard/Dashboard.tsx:368-420`
Severity: **AA**
`<div className="cui-kpi-label">Nettovermögen heute</div>` + `<div className="cui-kpi-value">CHF 1'854'826</div>` — Screenreader liest "Nettovermögen heute" und "1854826 CHF" als zwei zusammenhanglose Textfetzen.
Fix: `<dl>` / `<dt>` / `<dd>`-Struktur, oder `aria-labelledby` zwischen Label und Value mit gemeinsamer ID. Zusätzlich `aria-label={`${label}: ${value} Franken im Jahr ${jahr}`}` am Wrapper.

---

### 1.4.1 Use of Color (Level A)

**F-1.4.1.a — PlausibilityPanel SchwereDot ist nur Farbe**
File: `src/components/dashboard/PlausibilityPanel.tsx:118-129`
Severity: **A**
`<span className="bg-rose-500 size-2">` als einziges visuelles Unterscheidungsmerkmal Fehler/Warnung/Info. Bei farbenblinden Beratern (Deuteranopie ~6% Männer) ununterscheidbar. CountPills haben zwar Text-Label "1 Fehler", aber die Detail-Liste hat nur den Punkt.
Fix: Icons (`AlertCircle`, `AlertTriangle`, `Info` aus lucide-react) statt nur farbiger Punkte. Oder Text-Präfix "Fehler:", "Warnung:", "Info:" im Liste-Item.

**F-1.4.1.b — Plan A/B/C nur über Farb-Dots unterscheidbar**
Files:
- `src/components/layout/CuiraHeader.tsx:159-231` — `<span className="cui-scenario-dot a">` / `b` / `c`
- `src/components/wizard/Wizard.tsx:528-535` — `borderLeft: 4px solid ${aktiverPlan === "a" ? blue : b ? violet : amber}`
- `src/components/dashboard/VarianteDeltaPanel.tsx:104-107` — Plan-Slot-Farben

Severity: **AA**
Wenn der Berater zwischen Plan A/B/C wechselt, ist die Unterscheidung nur Farbe (blau/violett/gelb). Tab-Label sagt "Plan A" — ok für aktiven Tab. Aber die `borderLeft` im ActiveBlock-Wrapper ist farb-only.
Fix: Aktiver-Plan-Indikator zusätzlich mit Text "Sie bearbeiten Plan B" (existiert nur als Banner für B/C, nicht A) + Pattern (z.B. doppelter Border bei B, gestrichelt bei C).

**F-1.4.1.c — KpiCard Diff-Pill nur grün/rot**
File: `src/components/dashboard/Dashboard.tsx:399-411`
Severity: **AA**
`background: diff >= 0 ? "var(--pos-soft)" : "var(--neg-soft)"` — die "+" und "−" Zeichen retten die Erkennung partiell. Aber für Farbblinde mit roter/grüner Sehschwäche reicht das eventuell nicht. ↑/↓ Pfeile wie in `VarianteDeltaPanel.tsx:194` wären besser.

---

### 1.4.3 Contrast (Minimum) (Level AA) — **Kritischer Bereich**

**F-1.4.3.a — `--ink-3` (#8390a3) auf weiss = 3.4:1 — FAIL für Text < 18pt**
Files: 144+ Treffer in Code. Beispiele:
- `src/components/wizard/Wizard.tsx:308` — `text-slate-500` auf weiss (sehr ähnliche Range)
- `src/components/dashboard/Dashboard.tsx:209, 214, 230` — `text-slate-400` (#94a3b8) auf weiss = **2.8:1 — FAIL**
- `src/components/dashboard/SankeyChart.tsx:392-398` — `text-slate-400`
- `src/components/dashboard/EinnahmenAusgabenChart.tsx:77` — `text-xs text-slate-400` Subline

Severity: **AA (Fehler)**
WCAG 1.4.3 erfordert 4.5:1 für Text < 18pt regular oder < 14pt bold. `--ink-3` und `text-slate-400` sind verbreitet für Sublines, Hints, Footers — genau dort wo Berater 60+ am ehesten Probleme haben.
Fix:
- `--ink-3` von `#8390a3` auf `#6b7689` anheben (≈4.6:1 auf weiss, behält Hierarchie).
- `text-slate-400` ersetzen durch `text-slate-500` (#64748b = 4.6:1).
- `--ink-4` (#a9b3c1, 2.3:1) nur für dekorative Elemente verwenden, nicht für Text.

**F-1.4.3.b — `text-emerald-700/80` und `text-rose-500/80` auf weiss = unterschritten**
File: `src/components/dashboard/EinnahmenAusgabenChart.tsx:302-365`
Severity: **AA (Fehler)**
`text-emerald-700/80` = effektiv emerald-700 mit Alpha 0.8 → ~3.8:1 statt 4.7:1. `text-rose-500/80` ≈ 3.0:1 — deutlich FAIL.
Fix: `/80` Suffix entfernen, Volldeckungs-Farben verwenden. Hierarchie via Schriftgrösse statt Opacity.

**F-1.4.3.c — Background `/30` und `/40` Overlays reduzieren Kontrast unvorhersehbar**
Files:
- `src/components/dashboard/PlausibilityPanel.tsx:36` — `bg-amber-50/30`
- `src/components/dashboard/VarianteDeltaPanel.tsx:104-106` — `bg-blue-50/30` etc.
- `src/components/dashboard/DreiSaeulenKpi.tsx:133-135` — `bg-emerald-50/40`

Severity: **AA**
30%-Hintergrund-Opacity verändert effektiven Text-Hintergrund je nach Page-Background. Auf weiss noch ok, aber bei verschachtelten Cards problematisch.
Fix: Solide Pastel-Farben statt `/30`-Overlay (`bg-amber-50` ohne Opacity).

**F-1.4.3.d — Sankey-SVG-Text `#64748b` für CHF-Werte**
File: `src/components/dashboard/SankeyChart.tsx:491, 525, 560`
Severity: **AA**
`fill="#64748b"` für Datenbeschriftung in 9px Font — **9px ist generell zu klein** und 4.6:1 in der Theorie OK, aber bei kleiner Schrift braucht's praktisch mehr. WCAG 1.4.3 fordert **3:1 für Large Text ≥ 18pt/14pt bold**, aber 9px ist im Gegenteil **klein** = 4.5:1 Pflicht.
Fix: Schrift auf min. 11px hochskalieren und `fill="#475569"` (5.5:1).

**F-1.4.3.e — Verdict-Box im Print bei amber/yellow Variante**
File: `src/app/print/page.tsx:336-353`
Severity: **AA**
`color: "#854d0e"` auf `background: "#fefce8"` = ~7:1 ✓ — aber Body-Text `#4b566b` auf `#fefce8` = ~4.4:1, leicht unter 4.5:1.

**F-1.4.3.f — Print-Footer und Page-Numbers**
File: `src/app/print/page.tsx:1152, 1157` — `color: #8390a3` in 9pt
Severity: **AA**
Auf Print-Output ist 9pt minimal lesbar, Kontrast 3.4:1 = Fail. Da Print-PDF aber rein optional ist und nicht für interaktive Use Cases zwingend, niedrigere Priorität.

---

### 1.4.4 Resize Text (Level AA)

**F-1.4.4.a — Massive Verwendung von hartcodierten Pixel-Werten**
Files: ~38 Stellen mit `text-[10px]`, `text-[10.5px]`, `text-[11px]`, `text-[11.5px]`. Beispiele:
- `src/components/wizard/Wizard.tsx:484, 489, 501` — `text-[10px]` für Status-Labels
- `src/components/layout/CuiraHeader.tsx:129, 261, 348, 367` — Tag-Labels, Mode-Switcher
- `src/components/dashboard/PlausibilityPanel.tsx:46, 70` — CountPills und Block-Labels
- `src/components/dashboard/Dashboard.tsx:201, 308` — Detail-Liq-Description

Severity: **AA**
Hardcoded `px` skaliert nicht mit Browser-Zoom 200% in der gleichen Form wie `rem`. Bei 200% Zoom werden 10px = 20px gerendert, aber Layout-Container haben fixe Breiten — Text bricht. Pragmatischer: für Berater 60+ ist 10px = 7.5pt schlicht unleserlich.
Fix:
1. Minimum `text-xs` (12px) für Body-Text setzen.
2. Tailwind v4-Token einführen `text-cu-tiny: 11px`, `text-cu-mini: 13px` und konsistent verwenden.
3. Globale `--cuira-density="comfortable"` Setting hinzufügen, das alle Fontgrößen +10% skaliert (für Berater-Endkunden 60+).

---

### 1.4.10 Reflow (Level AA)

**F-1.4.10.a — ResizableSplit kein responsive Reflow bei 320px**
File: `src/components/layout/ResizableSplit.tsx:8-9, 117-136`
Severity: **AA**
`MIN_LEFT_PX = 320`, `MIN_RIGHT_PX = 480` → Mindestbreite 800px für Split. WCAG 1.4.10 fordert kein horizontales Scrollen bei 320px CSS-Pixel-Viewport-Breite (entspricht 1280px @ 400% Zoom).
Fix: Bei `width < 1024px` (lg) wird bereits gestapelt — gut. Aber bei 320-1023px sollte ein automatischer Fallback auf `viewMode="wizard"` mit Tab-Switch zu Dashboard greifen.

---

### 1.4.11 Non-text Contrast (Level AA)

**F-1.4.11.a — Form-Borders und Focus-Indikatoren**
Files: `src/components/ui/styles.ts:12-15`
Severity: **AA**
`border-[var(--border)]` = `#e7eaee` auf weiss = 1.4:1 — **deutlich unter** den geforderten 3:1 für UI-Komponenten.
Fix: `--border` von `#e7eaee` auf `#d1d5db` anheben (3:1 Minimum).

---

### 2.1.1 Keyboard (Level A)

**F-2.1.1.a — VarianteDiffModal Overlay-Click ohne Keyboard-Äquivalent (mit ESC ok)**
File: `src/components/dashboard/VarianteDiffModal.tsx:45-53`
Severity: **A** (Click-on-Outside ok, ESC ok)
Status: Mostly compliant — ESC funktioniert via `useEffect`-Hook.

**F-2.1.1.b — KiHinweis ESC works, aber Tab-Order in Popover unklar**
File: `src/components/ui/KiHinweis.tsx:103-111`
Severity: **A**
ESC schliesst, aber kein Focus-Trap im Popover. Nach Tab springt Focus zur nächsten Wizard-Komponente, Popover bleibt offen.

**F-2.1.1.c — Confirm-Dialoge `window.confirm()`**
Files:
- `src/components/layout/CuiraHeader.tsx:59, 176, 208, 220`
- `src/components/layout/PlanVersionen.tsx:81, 93`

Severity: **A** (toleriert)
`window.confirm()` ist Browser-nativ und barrierearm. Aber das Cuira-eigene Pattern für Dialoge wäre konsistenter. Native dialog ist accessibility-stark, daher OK.

---

### 2.1.2 No Keyboard Trap (Level A)

**F-2.1.2.a — Modals haben KEINEN Focus-Trap**
Files:
- `src/components/dashboard/VarianteDiffModal.tsx` — Modal ohne Focus-Trap. Tab führt aus dem Modal heraus.
- `src/components/layout/PlanVersionen.tsx` — Modal ohne Focus-Trap.

Severity: **A**
Inverse von 2.1.2: Hier kein Trap = Focus kann aus dem Modal raus auf darunter liegende Wizard-Inputs. Verwirrt, aber kein Fail von 2.1.2 selbst. Trotzdem schlechte UX und FAIL für 2.4.3 (Focus Order).
Fix: focus-trap-react oder eigenes `useFocusTrap`-Hook implementieren.

---

### 2.4.1 Bypass Blocks (Level A)

**F-2.4.1.a — Kein Skip-Link**
File: `src/app/page.tsx` (alle Routen)
Severity: **A**
Bei 10-Block-Wizard mit ~150 Inputs muss Tab durch alles, um zum Dashboard zu kommen. Kein "Skip to main content"-Link.
Fix: In `layout.tsx` oder pro Page `<a href="#dashboard" className="sr-only focus:not-sr-only">Direkt zum Dashboard</a>` ganz am Anfang.

---

### 2.4.3 Focus Order (Level A)

**F-2.4.3.a — ResizableSplit-Drag-Handle in Tab-Order ohne Keyboard-Bedienung**
File: `src/components/layout/ResizableSplit.tsx:124-132`
Severity: **A**
`role="separator"` aber keine `tabIndex` und keine ArrowLeft/Right-Handler. Screenreader-User können Trennlinie nicht verschieben.
Fix: `tabIndex={0}` + `onKeyDown` mit ArrowLeft/Right (z.B. 10% pro Pfeiltaste) + `aria-valuenow`/`aria-valuemin`/`aria-valuemax`.

---

### 2.4.4 Link Purpose (Level A)

**F-2.4.4.a — PDF-Download nur Icon, kein Text**
File: `src/components/layout/CuiraHeader.tsx:275-283`
Severity: **A**
`<a href="/print"><Download /></a>` mit nur `title="PDF-Export der Auswertung"`. `title` ist nicht zuverlässig für Screenreader. Kein `aria-label`.
Fix: `aria-label="PDF-Export der Auswertung"` ergänzen. Gleiches für `<RotateCcw />` (Reset), `<GitBranch />` (Versionen), Avatar.

---

### 2.4.6 Headings and Labels (Level AA)

**F-2.4.6.a — Date-Input-Parts haben `aria-label` ✓ — vorbildlich**
File: `src/components/wizard/Block1Personen.tsx:402, 413, 424`
Status: Compliant.

**F-2.4.6.b — `<Field>` Label gilt nur über visuellen `<label>`-Wrapper**
File: `src/components/ui/Field.tsx:24-43`
Severity: **AA**
Das `<label>` umschliesst alles → impliziter Label-Bezug. Funktioniert wenn nur **ein** Input drin ist. Wenn `children` mehrere Inputs/Selects enthält (in Block1 PLZ + Ort als 2 Felder mit eigenem Field): jedes Field hat aber sein eigenes label-Wrapper. OK.
Aber: Pflichtfeld-Markierung nur über Text "*" — nicht via `aria-required="true"` auf Input.

---

### 2.4.7 Focus Visible (Level AA) — **Kritischer Bereich**

**F-2.4.7.a — `focus:outline-none` ohne sichtbaren Ersatz**
Files:
- `src/components/wizard/OrtKantonPicker.tsx:10` — focus:outline-none + focus:ring-2 ✓ (ok)
- `src/components/wizard/SzenarioPanel.tsx:356, 358` — focus:outline-none **ohne Ersatz** ✗
- `src/app/app/mandant/[id]/page.tsx:952` — focus:outline-none **ohne Ersatz** ✗
- Tailwind `cui-input` Klasse: hat focus-Styling via box-shadow (gut)

Severity: **AA**
Fix: Globaler CSS-Rule `*:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` und dann nur dort `focus:outline-none` wo bewusst ein Ring-Pattern vorhanden ist.

**F-2.4.7.b — `.cui-btn` Klasse hat keinen `:focus-visible` Stil**
File: `src/app/globals.css:180-219`
Severity: **AA**
Keine `:focus`/`:focus-visible` Regel definiert. Verlässt sich auf Browser-Default-Outline, der oft `outline: none` auf custom buttons mit `border` bekommt.
Fix:
```css
.cui-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.cui-seg-btn:focus-visible { ... }
```

---

### 3.3.1 Error Identification (Level A)

**F-3.3.1.a — Wizard-Warning ohne `role="alert"`**
File: `src/components/wizard/Wizard.tsx:348-355`
Severity: **A**
`<div className="border-amber-200 bg-amber-50">` mit "Block 1 vervollständigen, um weiterzugehen" — hat keinen `role="alert"` und kein `aria-live`. Screenreader-User merken nicht, dass die Warnung erschienen ist.
Fix: `role="alert" aria-live="assertive"` für Block-Erforderlich-Hinweis.

**F-3.3.1.b — PlausibilityPanel kein `aria-live`**
File: `src/components/dashboard/PlausibilityPanel.tsx:35-90`
Severity: **A**
Plausibilitäts-Hinweise erscheinen dynamisch je nach Eingabe. Kein `aria-live="polite"` auf dem `<div>`. Screenreader bekommt neue Hinweise nicht mit.
Fix: `<div role="region" aria-live="polite" aria-label="Plausibilitäts-Hinweise">` auf Wrapper.

---

### 3.3.2 Labels or Instructions (Level A)

**F-3.3.2.a — Pflichtfelder nicht `aria-required`**
Files: Alle `<Field label="Vorname *">` (Block1Personen, etc.)
Severity: **A**
Visueller "*" — aber kein `aria-required="true"` auf Input. Manche Screenreader interpretieren Stern als Buchstabe.
Fix: Field-Prop `required: boolean` einführen und an Input weiterreichen.

---

### 4.1.2 Name, Role, Value (Level A)

**F-4.1.2.a — Modals fehlen `role="dialog"` + `aria-modal="true"` + `aria-labelledby`**
Files:
- `src/components/dashboard/VarianteDiffModal.tsx:46-52`
- `src/components/layout/PlanVersionen.tsx:107-216`

Severity: **A (Fehler)**
Aktuell:
```tsx
<div className="fixed inset-0 ...">
  <div onClick={(e) => e.stopPropagation()}>
    <h2>Plan A vs. Plan B</h2>
    ...
```
Screenreader liest das als generischen DIV-Bereich, nicht als Modal-Dialog.
Fix:
```tsx
<div role="dialog" aria-modal="true" aria-labelledby="diff-modal-title">
  <h2 id="diff-modal-title">Plan A vs. Plan B</h2>
```

**F-4.1.2.b — Dropdown-Menu in CuiraHeader nur via Hover sichtbar**
File: `src/components/layout/CuiraHeader.tsx:311-396`
Severity: **A**
Das `group-hover` Menu öffnet nur per Mouse-Hover. Kein Click-Handler, kein Focus-Open. Tastatur-User kommen nicht ran. Touch-Devices haben gar kein Hover.
Fix: Headless-UI Menu-Pattern oder manueller State (`useState` + `onClick` / `onBlur`).

**F-4.1.2.c — Plan-Tabs `<button>` ohne `role="tab"` + `aria-selected`**
File: `src/components/layout/CuiraHeader.tsx:151-233`
Severity: **A**
Plan-A/B/C-Tabs sind echt Tabs, sollten Tab-Pattern haben.
Fix: Container `role="tablist"`, jeder Button `role="tab" aria-selected={aktiverPlan === "a"}`. Aktiver-Plan-Block dann `role="tabpanel"`.

---

### 4.1.3 Status Messages (Level AA)

**F-4.1.3.a — AutoSaveToast hat `role="status"` ✓**
File: `src/components/layout/AutoSaveToast.tsx:57`
Status: Compliant. Vorbildlich.

**F-4.1.3.b — KPI-Werte ändern sich live ohne `aria-live`**
File: `src/components/dashboard/Dashboard.tsx:239-275`
Severity: **AA**
Eingaben im Wizard ändern KPIs in Echtzeit. Screenreader-User merkt das nicht. Bei jedem Tastendruck eine Ansage wäre Overhead. Aber bei Block-Wechsel oder nach Pause sollte ein Update angekündigt werden.
Fix: KPI-Card-Wrapper `aria-live="polite" aria-atomic="true"` oder einen einzelnen Live-Region-Container, der nach Idle-Timeout (z.B. 500ms nach letzter Eingabe) eine Zusammenfassung ansagt.

---

## Schriftgrössen-Audit (Tooltips/Hints für 60+ Berater)

| Klasse | Pixel | Bewertung 65+ User | Empfehlung |
|---|---|---|---|
| `text-[10px]` | 10px | **Unleserlich** | Min. 11px für Labels, sonst Element entfernen |
| `text-[10.5px]` | 10.5px | **Unleserlich** | dito |
| `text-[11px]` | 11px | Grenzwertig | 12px (text-xs) |
| `text-xs` | 12px | OK | OK |
| `text-sm` | 14px | OK | Body-Default |

**Empfehlung Globale Density-Setting:** Toggle "Standard / Komfortabel" im Header → bei "komfortabel" alle `text-[10px]→11px`, `text-[11px]→12.5px`, `text-xs→13px`. User-Präferenz in LocalStorage.

---

## Cuira-spezifische Empfehlungen

### Quick-Win-Reihenfolge (Pareto)

1. **`--ink-3` Color-Token anheben** auf `#6b7689` — 144 Stellen profitieren ohne Code-Änderung
2. **`text-slate-400` durchsuchen + ersetzen** auf `text-slate-500` — direkter Token-Sweep
3. **Modals mit `role="dialog"` + `aria-modal`** ergänzen — 2 Dateien
4. **`focus-visible` Global-Rule** in `globals.css` ergänzen
5. **`role="alert"` auf PlausibilityPanel + Wizard-Warning** + `aria-live` auf Dashboard-KPIs
6. **Skip-Link** in `layout.tsx`
7. **Density-Toggle** im Header (`data-density="comfortable"` setzt alle 10px-Tokens hoch)
8. **PDF-SVG-Charts:** `<desc>` mit Datenauflistung für Print/Screenreader

### Mittelfristig (Refactor)

- Headless-UI oder Radix-Primitives für Dialog, Menu, Tabs einführen — bringt Accessibility quasi gratis.
- `aria-required` + `aria-invalid` + `aria-describedby` Pattern für `Field`-Komponente.
- Print-PDF: Tagged PDF generieren statt Browser-Print (würde `puppeteer-pdf` oder `react-pdf` voraussetzen — aktuell nicht im Stack).
