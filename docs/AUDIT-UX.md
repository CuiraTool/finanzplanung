# UX/UI-Audit Cuira Pro-Tool — Findings

**Datum:** 2026-05-12
**Scope:** Berater-Workflow Pro-Tool, Desktop-only (Wizard + Dashboard + PDF)
**Methode:** Statische Code-Analyse + UX-Heuristik

## Abgedeckte Komponenten (Read-Only)

- `src/components/wizard/Wizard.tsx`
- `src/components/wizard/Block1-Block10*.tsx` (Stichproben Block 1/2/3/5/10)
- `src/components/dashboard/Dashboard.tsx`
- `src/components/dashboard/SankeyChart.tsx`
- `src/components/dashboard/MassnahmenListe.tsx`
- `src/components/dashboard/PlausibilityPanel.tsx`
- `src/components/dashboard/VarianteDeltaPanel.tsx`
- `src/components/dashboard/VarianteDiffModal.tsx`
- `src/components/dashboard/DreiSaeulenKpi.tsx`
- `src/components/dashboard/HinterlassenenCard.tsx`
- `src/components/dashboard/KiMassnahmen.tsx`
- `src/components/layout/CuiraHeader.tsx`
- `src/components/layout/PlanVersionen.tsx`
- `src/components/cockpit/CockpitSidebar.tsx`
- `src/app/print/page.tsx`

---

## 1. Wizard-Flow

### Stärken
- Block-Reihenfolge (Personen → Ziele → Budget → AHV → BVG → 3a → Vermögen → Immobilien → Firma → Nachlass) ist logisch und folgt dem Schweizer Beratungs-Standard.
- Glance-Texte pro Block in der Linksspalte mit echten Eckwerten statt Defaults sind ein starkes UX-Detail — Berater sieht im Vorbeisehen, was schon erfasst ist.
- ~~Quick-Start (`planLeer && !quickStartSkipped`) ist ein echter Differenziator gegenüber Taxware/Logismata.~~ **HINFÄLLIG:** QuickStart entfernt 2026-05-12.
- Auto-Lock-Mechanik (Blocks 2–10 gesperrt bis Block 1 minimum komplett) ist sauber implementiert via `validation.komplett`.

### Findings

#### **W1 — KRITISCH — Block-Lock-Erklärung versteckt**
**Komponente:** `Wizard.tsx:431-449`
**Problem:** Gesperrte Blöcke zeigen nur ein 🔒-Emoji rechts. Der Berater muss hovern, um zu sehen, dass Block 1 inkomplett ist. Bei einem Berater, der nach 5 Mandanten am Tag schnell scrollt, ist das ein "Warum klickt's nicht?"-Moment.
**Fix:** Wenn Block 1 inkomplett ist, alle gesperrten Blocks sichtbar ausgrauen UND einen einzigen Banner ganz oben statt nur als Warning-Box mit der Liste `fehlend` — z.B. "↓ 3 Pflichtfelder fehlen: Vorname, Geburtsdatum, Wohnort" mit Sprung-Link direkt zum ersten leeren Feld.

#### **W2 — HOCH — Block 5 BVG: zu viele Listen pro Person**
**Komponente:** `Block5Bvg.tsx`
**Problem:** Pro Person 4 Sub-Listen (Altersguthaben, Einkäufe, WEF-Vorbezüge, Freizügigkeit). Bei einem Paar sind das 8 Listen auf einer Seite. Die `fieldset`+`legend`-Struktur hilft, aber visuell wirkt der Block wie ein endloses Scroll-Geschwätz.
**Fix:** Tab-Struktur innerhalb Block 5 pro Person: "Altersguthaben" | "Einkäufe" | "WEF-Vorbezüge" | "Freizügigkeit". Standard-Tab ist "Altersguthaben" — die anderen sind oft leer und versperren nur die Sicht. Tab-Header zeigt Count: "Einkäufe (2)".

#### **W3 — HOCH — Block 5: WEF-Liste auch wenn nie genutzt**
**Komponente:** `Block5Bvg.tsx:608-760`
**Problem:** Die `WefListe` rendert immer (auch wenn `items.length === 0`), mit dem grossen KI-Hinweis-Block. Bei den ~70 % Mandanten ohne WEF-Vorbezug ist das visueller Lärm.
**Fix:** Collapse auf eine schmale Zeile "WEF-Vorbezüge — 0 Einträge [+ hinzufügen]". Erst öffnen bei Klick.

#### **W4 — HOCH — Block 5: Einkauf "Serie" vs. "Einzel" Toggle missverständlich**
**Komponente:** `Block5Bvg.tsx:484-520`
**Problem:** Der Modus-Toggle hat zwei gleich grosse Buttons mit Sub-Text "nur im Startjahr" vs. "jährlich gleicher Betrag". "Einzel-Einkauf" klingt nach Personenbezug, nicht nach Zeitlogik.
**Fix:** Labels umbenennen: "**Einmalig**" (statt "Einzel-Einkauf") und "**Mehrjährig**" (statt "Serie"). Sub-Text: "z.B. Bonus Q4 2026" vs. "z.B. 20'000/J über 5 Jahre".

#### **W5 — MITTEL — Block 10 Nachlass: 3-State-Toggle gut, aber Anwartschaften-Sub-Block verdrängt das eigentliche Thema**
**Komponente:** `Block10Nachlass.tsx`
**Problem:** Anwartschaften (Erbschaft erwartet?) wird OBEN angezeigt vor den Nachlass-Dokumenten. Aber der Block-Titel ist "Nachlass" — der Berater erwartet zuerst die Dokumente. Die 3-State-Buttons "Gemacht / Nicht gemacht / Nicht nötig" sind super klar gestaltet (Farben emerald/amber/slate matchen die Semantik).
**Fix:** Reihenfolge umkehren: Vorsorge-Dokumente zuerst (Hauptzweck des Blocks), Anwartschaften unter einer eigenen Sub-Section. Block-Titel evtl. präzisieren: "Nachlass & Anwartschaften".

#### **W6 — MITTEL — Block 10: "Anwartschaften" als Label ist Beraterjargon**
**Komponente:** `Block10Nachlass.tsx:65`
**Problem:** "Anwartschaften" verstehen Endkunden nicht. Der Berater versteht's, aber im Affiliate-/B2C-Pfad gilt das nicht. Auch im Pro-Modus: präzisere Sprache hilft beim Vor-Lesen mit dem Mandanten.
**Fix:** Legend-Text "Anwartschaften" durch "Erwartete Erbschaften & Schenkungen" ersetzen. Den Begriff "Anwartschaft" nur als kleinen Untertitel in Klammern lassen.

#### **W7 — MITTEL — Block 2: ReadCell für "Ordentlich" wirkt wie ein Eingabefeld**
**Komponente:** `Block2Wuensche.tsx:178-188`
**Problem:** Die `ReadCell` ist als `<input readOnly>` styled — sieht aus wie ein Input, ist aber nicht editierbar. User probiert reinzuklicken und ist verwirrt.
**Fix:** Stattdessen als `<div>` mit gleicher Padding/Border darstellen, aber ohne Input-Cursor. Z.B. background `var(--surface-2)` und text `var(--ink-3)`, ohne Input-Frame.

#### **W8 — NIEDRIG — Action-Pills im Header (Doc-Upload, Geführter Flow, Import) drei vertikal gestapelt**
**Komponente:** `Wizard.tsx:310-334`
**Problem:** Bei breiterem Screen (Pro-Tool ist desktop-only) bleiben die Pills vertikal gestapelt. Das verschwendet Header-Höhe.
**Fix:** `flex-col sm:flex-row` umstellen, sodass auf Desktop die 3 Pills horizontal nebeneinander sitzen. Schon im Tailwind-Klassen-Block (`sm:w-auto sm:items-end`) angelegt, aber `flex-col` bleibt — dass müsste auf `flex-row` umgestellt werden.

#### **W9 — NIEDRIG — "Geführter Flow"-Modus parallel zum klassischen Wizard**
**Komponente:** `Wizard.tsx:283-301`
**Problem:** Es gibt einen separaten `mode === "flow"`-Renderer (`FlowRenderer`). Das ist eine zweite Eingabe-Logik — Risiko von Drift zwischen den beiden. Berater wird selten zwischen Modi wechseln; der Pill kostet kognitive Last.
**Fix:** Discoverability prüfen — wenn der Flow tatsächlich verwendet wird, behalten. Wenn nicht, in ein Settings-Menü verschieben oder ganz entfernen (eigener Use-Case "Beratungs-Termin Live-Eingabe").

---

## 2. Dashboard

### Stärken
- Die Hauptreihenfolge (KPI → Plausi → Δ-Panel → 3-Säulen → Hinterlassen → Charts → Steuer → Sankey → Stress → KI → Massnahmen) folgt einer logischen "vom Big-Picture zum Detail"-Hierarchie.
- KPI-Cards mit `diff`-Pill bei aktivem Plan B/C sind elegant (Dashboard.tsx:399-411).
- `ESTV-validiert`-Pill im Header ist ein starkes Trust-Signal — gehört direkt zur Marketing-Story Cuira.
- Inflation-Toggle mit klarer Anzeige ("in heutiger Kaufkraft 1.5 % p.a.") ist transparent.

### Findings

#### **D1 — KRITISCH — Information Overload: alles sichtbar gleichzeitig**
**Komponente:** `Dashboard.tsx:193-358`
**Problem:** Das Dashboard rendert 11 Sektionen untereinander unbeschränkt. Bei einem Paar mit Plan B+C aktiv sind das easy 8000px+ Scrolltiefe. Der Berater verliert die Übersicht. Konkurrenz: VZ baut PDF-only auf, Logismata schaltet Tabs. Cuira: alles auf einer langen Seite.
**Fix:** **Tab-Navigation im Dashboard** (sticky am oberen Rand): "Überblick" (KPI + Plausi + 3-Säulen + Hinterlassen) | "Charts" (Vermögen/Cashflow/Steuer/Sankey) | "Stress & KI" | "Massnahmen". Jede Tab passt auf einen Viewport ohne Scroll. Plan-Switch global oben. **Empfehlung: 4 Tabs max.**

#### **D2 — HOCH — Plausibility-Panel optisch zu schwach**
**Komponente:** `PlausibilityPanel.tsx:36-42`
**Problem:** Das Panel sitzt zwischen KPIs und Δ-Panel, ist aber als amber `border-amber-200 bg-amber-50/30` gestylt — die meisten Plausi-Warnungen sind kritisch für die Beratungs-Qualität. Wenn der Berater einen Fehler-Hinweis übersieht, geht ein falsches PDF raus.
**Fix:**
- Bei `counts.fehler > 0`: rote Border, dickerer Stroke, "Fehler" prominenter.
- Sticky-Top des Dashboards solange Fehler vorhanden, mit "X Fehler vor PDF-Versand prüfen".
- Klick auf Hinweis → Sprung in den entsprechenden Block (nicht nur "Block 5" als Label).

#### **D3 — HOCH — Δ-Vergleichs-Panel zeigt zu viel Detail vorab**
**Komponente:** `VarianteDeltaPanel.tsx:111-176`
**Problem:** 6 Delta-KPIs auf einmal sind viel. Im Beratungs-Setting will der Berater oft nur **eine** Kernfrage beantworten: "Welcher Plan ist besser?". 6 Pfeile mit ↑↓ + Prozentwerten zwingen zur Mathematik.
**Fix:**
- Oben einen **Gesamt-Verdict** ergänzen: "Plan A ist netto besser (+CHF 234'000 mit 85, −CHF 12'000 Steuern)" mit klarem Daumen-hoch/runter.
- Die 6 KPI-Boxen darunter als Detail-Ansicht behalten — aber Default-collapsed mit "Details anzeigen ↓".

#### **D4 — MITTEL — KPI-Cards "Heute / Pension / 85" kommunizieren keine "ist es gut?"-Wertung**
**Komponente:** `Dashboard.tsx:238-275` (KpiCard)
**Problem:** Cards zeigen reine CHF-Zahlen ohne Kontext. Ein Berater weiss, dass CHF 2.4 Mio mit 85 super sind. Der Mandant (bei gemeinsamer Bildschirm-Beratung) versteht es nicht.
**Fix:** Pro KPI-Card eine ganz dezente Status-Linie ergänzen: bei Mit-85-Card ein "✓ Reicht komfortabel" / "⚠ Knapp" / "✗ Vermögen aufgebraucht mit Alter X". Verwendet die schon vorhandene `verdict`-Logik aus `print/page.tsx`.

#### **D5 — MITTEL — Detail-Liquidität-Dropdown: Subtext "im PDF aktiv" / "nicht im PDF" ist subtil**
**Komponente:** `Dashboard.tsx:297-325`
**Problem:** Der Toggle steuert zwei Dinge: (1) Anzeige im Dashboard, (2) Aufnahme ins PDF. Die Doppelfunktion ist im Subtext versteckt.
**Fix:** Zwei separate Toggles in der Detail-Liq-Card: "Im Dashboard zeigen" + "Ins PDF aufnehmen". Aktuell kostet ein versehentlicher Klick eine PDF-Seite (oder umgekehrt).

#### **D6 — MITTEL — Massnahmen-Sektion und KI-Massnahmen-Sektion separat — redundanz-Risiko**
**Komponente:** `Dashboard.tsx:348-356`
**Problem:** `KiMassnahmen` und `MassnahmenListe` sind zwei eigene Cards, mit überlappenden Themen (3a-Lücke kann in beiden auftauchen). Der Berater muss zwei Mal lesen, was zu tun ist.
**Fix:** Eine gemeinsame Massnahmen-Card mit zwei Tabs/Sub-Sections: "Automatisch (regelbasiert)" + "✨ KI-vorgeschlagen". Total-Optimierungs-Banner (`Optimierungs-Potenzial CHF X / Jahr`) müsste beide Quellen aggregieren.

#### **D7 — NIEDRIG — Inflation-Toggle: ohne aktiv-Status kein klares "off"-Signal**
**Komponente:** `Dashboard.tsx:229`
**Problem:** Wenn Inflation aus ist, fehlt der `inflationEnabled`-Hinweis in der Header-Subline komplett. Berater fragt sich: "Sind die Zahlen nominal oder real?".
**Fix:** Im inaktiven Zustand stehen lassen: "· in nominalen CHF (vor Inflation)" als Subtext, sodass die Annahme immer transparent ist.

---

## 3. Sankey-Chart

### Stärken
- Custom-SVG-Lösung ohne d3-sankey ist eine sehr saubere Engineering-Entscheidung — schnell, klein, keine Lib-Abhängigkeit.
- Defizit-Visualisierung (`Vermögensentnahme` als gestricheltes Band rot) löst ein hartes Problem clever.
- Pro Jahr → richtig — Sankey für 30 Jahre macht keinen Sinn.

### Findings

#### **S1 — HOCH — Jahr-Selector unauffällig**
**Komponente:** `SankeyChart.tsx:402-414`
**Problem:** Der Jahr-Dropdown sitzt rechts oben als klassisches `<select>` — kein visueller Hinweis, dass mehrere Jahre interessant sind. Berater verpasst es leicht.
**Fix:**
- Stattdessen Pill-Tabs: "Heute (2026)" | "Bei Pension (2030)" | "Mit 75" | "Mit 85" — visuell statt Dropdown.
- Default-Selection könnte intelligent sein: wenn Heute = aktuell, dann Vergleich automatisch "Bei Pension" anzeigen (eine zweite Sankey untereinander).

#### **S2 — MITTEL — Defizit-Label "Vermögensentnahme" — wenig anschaulich**
**Komponente:** `SankeyChart.tsx:216-223, 583`
**Problem:** Das Label `Vermögensentnahme (Defizit)` ist korrekt, aber neutral. Bei einem Berater-Termin ist das ein Verkaufs-Argument: "Sie müssen jährlich 35k vom Ersparten anbrechen".
**Fix:** Defizit-Label kontextsensitiv: bei Vermögen > 0 zeigen "Vom Vermögen entnommen — CHF 35'000". Im Hover/Title: "Heisst: das Vermögen schrumpft in diesem Jahr um diesen Betrag".

#### **S3 — MITTEL — Sankey-Beschriftungen können bei vielen Quellen/Zielen überlappen**
**Komponente:** `SankeyChart.tsx:473-495`
**Problem:** Bei 5 Quellen + 10 Zielen kann es eng werden, vor allem bei kleinen Beträgen (`px(value)` < 12px). Beschriftung und Wert (12px Y-Offset) überlappen.
**Fix:** Wenn `px(value) < 14`: nur Label rendern, Wert in Tooltip. Oder Labels mit "..." kürzen.

#### **S4 — NIEDRIG — Legende minimal — Saldo/Defizit-Erklärung unten klein**
**Komponente:** `SankeyChart.tsx:570-589`
**Problem:** Die Mini-Legende klärt Saldo + Defizit, aber Skip-Lesern fehlt das Verständnis "Saldo → Vermögen = was Sie sparen". Ist eher implizit.
**Fix:** Eine Zeile Eingangstext: "Wie wird Ihr Cashflow in diesem Jahr verteilt? Übrig bleibt → Vermögen. Reicht's nicht → Vermögen wird angebrochen."

---

## 4. Massnahmen-Liste

### Stärken
- View-Toggle Liste / Tabelle ist eine elegante Anpassung an Berater-Geschmack — Persistenz via localStorage perfekt.
- Optimierungs-Sektion oben mit `Optimierungs-Potenzial`-Banner adressiert den Verkaufs-Hebel sofort.
- SSM-Style Tabelle (Wann/Wer/Was) ist Berater-konform und PDF-tauglich.

### Findings

#### **M1 — HOCH — Optimierungs-Cards und Reminder visuell nicht klar getrennt**
**Komponente:** `MassnahmenListe.tsx:142-189`
**Problem:** Optimierungen sind als gradient-Box gestylt, Reminder als reguläre Liste — aber beide sitzen sehr nah beieinander, kein grosser visueller Bruch zwischen den Sektionen. Der Berater scrollt drüber.
**Fix:** Zwischen "✨ Optimierungen" und "📅 Termine & Reminder" eine echte Trennung: dicker Border, mehr Abstand (mb-6 statt mb-4), evtl. mit "ODER" / Toggle "Beide anzeigen".

#### **M2 — MITTEL — Reminder-Liste max-height 480px, dann scrollbar — Scroll-Trap**
**Komponente:** `MassnahmenListe.tsx:169`
**Problem:** Innerhalb einer langen Dashboard-Seite einen scrollbaren `<ul>` zu haben ist ein klassischer Scroll-Hijack: User scrollt mit Mausrad und kann's nicht weiter, weil der Cursor auf der inneren Liste ist.
**Fix:** Default ohne `max-h-[480px]` rendern. Statt Scroll: nach 10 Einträgen "20 weitere anzeigen ↓" Button. Oder bei vielen Einträgen Tabelle-View als Default vorschlagen.

#### **M3 — MITTEL — Wer-Spalte zeigt manchmal "—" statt sinnvollem Default**
**Komponente:** `MassnahmenListe.tsx:289-292`
**Problem:** `wer === "beide"` && `fallart === "einzel"` → "—". Für einen einzelnen Mandanten ist "—" verwirrend. Ein Massnahme ist nicht "für beide", weil's keine zwei gibt.
**Fix:** Bei einzel-Fallart: "beide" sollte gar nicht vorkommen — Engine-seitig korrigieren ODER fallback auf den Vornamen P1.

#### **M4 — NIEDRIG — Tabellen-Tooltip "SSM-Style 3-Spalten" ist Internal-Slang**
**Komponente:** `MassnahmenListe.tsx:106`
**Problem:** `title="SSM-Style 3-Spalten Wann/Wer/Was"` — "SSM" ist Cuira-intern (Standard Strukturierte Massnahmen?). Nicht für Berater verständlich.
**Fix:** Tooltip ändern auf "Tabellen-Ansicht: Wann / Wer / Was — chronologisch sortiert".

---

## 5. PDF Output

### Stärken
- Native Browser-Print statt Puppeteer ist die richtige Architektur (offline, klein).
- Page-Numbers im Footer + `@page :first` für Cover ist korrekt umgesetzt.
- Querformat-Trick für Detail-Liquidität (`@page detail-liq { size: A4 landscape }`) ist clever.
- Disclaimer-Sektion juristisch sauber strukturiert (Grundlage, Eigenmietwert-Reform, FIDLEG, Art. 100 OR, DSG).

### Findings

#### **P1 — KRITISCH — 22+ Seiten ist für Mandant überwältigend**
**Komponente:** `print/page.tsx` Gesamtaufbau
**Problem:** Cover + Plan-Varianten-Diff (1-3 Seiten) + KPI/Eckdaten + 3-Säulen + Hinterlassen + Vermögensentwicklung + Cashflow + Detail-Liq (Querformat) + 2× Sankey + Steuer + Tragbarkeit + Stress + KI + Optimierungen + Termine + Berater + Plausi + Disclaimer = realistisch 18-25 Seiten. Berater wird nicht alles vorlesen — Mandant liest's auch nicht.
**Fix-Strategie:**
- **Executive Summary nach dem Cover** (1 Seite): Verdict + 3 KPIs + Top-3-Massnahmen + Quick-Empfehlung. So hat der Mandant nach Seite 2 alles Wesentliche.
- **PDF-Profile** als Print-Option: "Kurz" (Cover + Exec Summary + Massnahmen = 4 Seiten), "Standard" (heutiger Stand minus Detail-Liq), "Vollständig" (mit Detail-Liq + Diff). Toggle im Print-Header.
- **Detail-Liquidität standardmässig OFF** im PDF (User-Toggle wird vermutlich oft "aus" stehen).

#### **P2 — HOCH — Plan-Varianten-Diff vor den Haupt-KPIs ist verwirrend**
**Komponente:** `print/page.tsx:368-425`
**Problem:** Wenn Plan B+C aktiv sind, kommt die Vergleichsseite VOR den Hauptzahlen Plan A. Mandant sieht zuerst "Plan A vs. Plan B" ohne zu wissen, was Plan A überhaupt aussagt.
**Fix:** Reihenfolge:
1. Cover + Verdict
2. **Hauptzahlen aktiver Plan** (KPI + Eckdaten + 3-Säulen)
3. **Varianten-Vergleich** (mit kurzer Einleitung "Was passiert, wenn Sie stattdessen Plan B/C wählen?")
4. Charts, Stress, Massnahmen

#### **P3 — HOCH — Berater-Block ohne Foto/Branding-Tiefe**
**Komponente:** `print/page.tsx:935-993`
**Problem:** "Ihr Cuira-Berater"-Block ist dunkelblauer Banner mit Initialen-Avatar + Name + Email. Für ein CHF 300+-Beratungs-Produkt zu nüchtern. Konkurrenz VZ macht das mit Berater-Foto + Telefon + Office-Adresse.
**Fix:**
- Berater-Foto (rund, 80×80, optional fallback Initialen-Avatar).
- Telefon-Nummer ergänzen.
- Office-Adresse mit Map-Link.
- Möglich auch Kalender-Link "Termin buchen" als QR-Code für mobile Mandanten.

#### **P4 — HOCH — Stress-Tests-Seite zeigt Annahmen, aber keine Massnahmen**
**Komponente:** `print/page.tsx:698-809`
**Problem:** Der Mandant liest "Aktien-Crash −40 %, Vermögen mit 85: −350'000" und versteht: "Risk hoch". Aber WAS soll er tun? Antwort fehlt.
**Fix:** Pro Stress-Test eine Zeile "Vorschlag" am Ende: "Liquiditätspuffer von CHF 200k aufbauen" oder "Aktienquote auf 40 % reduzieren bei Pension". Engine-seitig ergänzen oder als statischer Text pro Stress-ID.

#### **P5 — MITTEL — KI-Empfehlungs-Sektion erscheint nur, wenn LocalStorage gefüllt**
**Komponente:** `print/page.tsx:812-884`
**Problem:** Die KI-Empfehlungen werden nur gerendert, wenn der Berater im Dashboard manuell auf "KI generieren" geklickt hat (LocalStorage `cuira-ki-massnahmen-v1`). Vergisst er das, fehlen sie im PDF — ohne Warnung.
**Fix:** Im Print-Header (oder auf der Cover-Seite) ein dezenter Banner: "ℹ KI-Empfehlungen nicht generiert. Möchten Sie sie ins PDF aufnehmen? → zurück und 'KI-Empfehlungen abrufen' klicken." Oder besser: PDF-Button im Dashboard zeigt einen Hinweis "KI-Empfehlungen noch nicht generiert — generieren?" als Modal.

#### **P6 — MITTEL — Verdict-Box auf Cover sehr klein und kann übersehen werden**
**Komponente:** `print/page.tsx:317-356`
**Problem:** Die Verdict-Box (`mt-8 max-w-md`) ist nach unten gedrückt; der grosse Titel bekommt die Aufmerksamkeit. Aber der Verdict ist die wichtigste Aussage des ganzen Dokuments.
**Fix:** Verdict größer und höher platzieren — direkt unter dem Mandant-Namen. Ggf. mit grossem Status-Icon (✓ / ⚠ / ✗) und CHF-Schlüsselwert daneben: "Vermögen reicht bis Alter 92".

#### **P7 — NIEDRIG — Detail-Liquidität: 7.5pt-Font im Querformat sehr klein**
**Komponente:** `print/page.tsx:1241`
**Problem:** `.print-detail-liq table { font-size: 7.5pt }` ist an der Lesbarkeits-Grenze für ältere Mandanten.
**Fix:** Auf 8.5pt erhöhen, dafür weniger Spalten oder Spaltenbreite optimieren. Oder: pro Datenzeile nur die top-relevanten 8 Spalten zeigen (statt aller).

#### **P8 — NIEDRIG — Header pro Seite identisch, kein "Section Header"**
**Komponente:** `print/page.tsx` — alle Seiten haben Cuira-Logo oben rechts + Mandant/Datum
**Problem:** Bei 22 Seiten geht die Orientierung verloren. Was steht auf Seite 11 vs. Seite 7?
**Fix:** In `@page` ein `@top-left` ergänzen, das den aktuellen Section-Titel zeigt (CSS named pages oder statisch pro Section).

---

## 6. Plan A/B/C Mechanik

### Stärken
- Plan-Tabs im Header mit Plan-Dot-Farbe (blue/violet/amber) ist konsistent und erkennbar.
- Klick auf "+ Plan B" klont Plan A — guter Default.
- Plan C kann auf A oder B basieren — sinnvolle Flexibilität.
- Block 1 wird global mit Plan A geteilt, mit klarem Hinweis-Banner im ActiveBlock (`Wizard.tsx:540-563`).
- Δ-KPI-Panel im Dashboard und Detail-Diff-Modal sind technisch elegant umgesetzt.

### Findings

#### **PL1 — HOCH — Plan-Switch ohne Daten-Verlust-Signal nicht klar genug**
**Komponente:** `CuiraHeader.tsx:154-232`
**Problem:** Berater erstellt Plan B → editiert in Block 5 → wechselt zurück zu Plan A. Die Änderungen aus Plan B sind weg aus der Eingabe-Sicht. Es gibt **keinen visuellen Confirmer** ("Plan B-Stand wurde gespeichert"). Die kleine Plan-Variante-Badge im Block-Inhalt (Wizard.tsx) sagt nur "Sie bearbeiten Plan B" — nicht "wechseln ist sicher".
**Fix:**
- Beim Plan-Switch ein kurzes Toast-Feedback: "✓ Plan B gespeichert. Sie sind jetzt in Plan A."
- Im Header pro Plan ein "Last edited 12:34" als Tooltip.
- Auto-Save-Dot im Header bei Plan-Switch kurz pulsieren lassen.

#### **PL2 — HOCH — Detail-Diff-Modal nur durch Klick "Detail-Diff anzeigen →" — Berater findet's nicht**
**Komponente:** `VarianteDeltaPanel.tsx:127-133`
**Problem:** Der "Detail-Diff anzeigen →"-Link ist ein klassischer blauer Text-Link rechts in der Header-Zeile des Δ-Panels. Visuell kompetitionsschwach gegenüber den 6 KPI-Boxen.
**Fix:** Den Link als Button stylen — z.B. Outline-Button "Alle Unterschiede zeigen (12)" mit der Anzahl der Diffs in Klammern. Mehr Signal, weniger Banner.

#### **PL3 — MITTEL — Plan C basiert auf A oder B — über `confirm()`-Dialog gewählt**
**Komponente:** `CuiraHeader.tsx:217-227`
**Problem:** Der Browser-`confirm()` für "OK = Plan A / Abbrechen = Plan B" ist mental verwirrend (Abbrechen bedeutet hier nicht "abbrechen", sondern "B wählen").
**Fix:** Stattdessen ein kleines Dropdown unter dem "+ Plan C"-Button: "Basis: [Plan A] [Plan B]" als zwei Buttons. Oder ein Mini-Modal mit der Frage und zwei expliziten Button-Labels.

#### **PL4 — MITTEL — Plan-Löschen ohne Undo**
**Komponente:** `CuiraHeader.tsx:175-181`
**Problem:** Klick auf "×" → `confirm("Plan B wirklich löschen?")` → weg ist Plan B. Wenn das versehentlich passiert, ist die Arbeit weg (außer Plan-Versionen wurde manuell gespeichert).
**Fix:** Snackbar/Toast mit "Plan B gelöscht — rückgängig?" für ca. 8 Sekunden. State des gelöschten Plans im memory halten, nicht direkt persisten. Cancelbar.

#### **PL5 — NIEDRIG — Plan-Versionen-Modal nicht entdeckbar genug**
**Komponente:** `CuiraHeader.tsx:247-262`
**Problem:** Das GitBranch-Icon mit Counter-Badge ist klein. Berater, der Plan-Versionen nicht kennt, klickt's nicht.
**Fix:**
- Beim ersten Mal nach Wizard-Abschluss: Onboarding-Tooltip "Snapshot speichern? Klicken Sie hier, um Stände festzuhalten."
- Alternativ als Text-Button: "Versionen (3)" statt nur Icon.

---

## 7. Globale UX-Beobachtungen

#### **G1 — HOCH — Keine globale Suche / Sprung-Funktion über Blöcke**
**Komponente:** Wizard
**Problem:** Berater sucht "AHV-Einkommen" und muss raten, welcher Block. Bei ändernden Mandant-Daten (z.B. Korrekturen): unbequem.
**Fix:** Cmd+K-Palette mit Feld-Suche ("Einkommen" → "Block 4 AHV / Block 3 Budget"). Bei Klick: Block aktivieren + Feld scrollen + highlight.

#### **G2 — MITTEL — "Modi"-Dropdown im Header zeigt 3 externe Modi mit unterschiedlicher Zielgruppe**
**Komponente:** `CuiraHeader.tsx:310-396`
**Problem:** Berater hat im Pro-Modus selten Bedarf, "/erfassung" oder "/kunde" zu öffnen. Diese Links sind primär für Internas. Sie nehmen aber Header-Real-Estate.
**Fix:** "Modi"-Dropdown nur im Developer-Mode anzeigen oder in ein ⋯-Menu verbergen.

#### **G3 — MITTEL — Reset-Button neben PDF-Export — gefährliche Nachbarschaft**
**Komponente:** `CuiraHeader.tsx:264-283`
**Problem:** Reset-Icon (RotateCcw) sitzt direkt neben PDF-Download (Download). Beide gleiche Größe, gleicher Style. Berater könnte versehentlich Reset statt Download klicken — verliert den ganzen Plan.
**Fix:**
- Reset rechts vom Avatar verschieben oder in ein Settings-Menu.
- Reset mit anderer Hintergrundfarbe (rose-tint) als Danger-Style.
- Reset hinter Cmd-/Ctrl-Modifier verstecken ("Cmd-Klick = Reset, Klick = nichts").

#### **G4 — NIEDRIG — Status-Pill `ESTV-validiert` versteckt das Argument**
**Komponente:** `Dashboard.tsx:200-208`
**Problem:** Das ist ein Marketing-Goldstück, aber als emerald-Pill mit 10px-Font passt es schlecht zur Bedeutung.
**Fix:** Klickbar machen → Modal "Was heisst ESTV-validiert?" mit Erklärung der 364 Profile + Validierungs-Methode. Klares Trust-Signal.

---

## 10 Quick-Wins (< 1h pro Stück)

1. **Block 10: Reihenfolge umkehren** — Dokumente vor Anwartschaften (Block10Nachlass.tsx) — 15 min.
2. **Block 10: "Anwartschaften" als Label** durch "Erwartete Erbschaften & Schenkungen" ersetzen — 5 min.
3. **Block 5: Einkauf-Toggle umlabeln** "Einzel-Einkauf" → "Einmalig", "Serie" → "Mehrjährig" — 5 min.
4. **Block 2 ReadCell** als `<div>` statt `<input readOnly>` rendern (verhindert Klick-Frust) — 20 min.
5. **Inflation-Toggle**: bei aus-Zustand zusätzlich Subtext "in nominalen CHF" — 10 min.
6. **Massnahmen-Liste: max-h-[480px] entfernen** + "+ 20 weitere" als Button — 20 min.
7. **Plan-Löschen** Confirm-Dialog präzisieren, evtl. Toast mit "rückgängig" — 30 min.
8. **Sankey Jahr-Selector** als Pill-Tabs statt `<select>` — 40 min.
9. **Plausibility: bei Fehler ≥ 1** roter Border + dickere Visual-Signature — 20 min.
10. **Tooltip "SSM-Style 3-Spalten"** auf Berater-verständliche Sprache umtexten — 2 min.

---

## 3-5 grössere Verbesserungen (4-8h)

### G1 — Dashboard-Tab-Navigation (8h)
**Was:** Sticky-Top-Tabs `Überblick | Charts | Stress & KI | Massnahmen`.
**Warum:** Information-Overload (D1) ist der Hauptkritikpunkt. 11 Sektionen vertikal werden zu 4 Tabs mit je ~3 Sektionen.
**Impact:** Berater-Workflow drastisch entlastet; Mandant-Beratung am Bildschirm fokussierter.

### G2 — Plan-Verdict-Auto-Summary auf Dashboard + PDF (6h)
**Was:** Auto-generierter Verdict-Banner ("Plan A ist netto besser, Plan B spart Steuern aber kostet 200k Vermögen mit 85") basiert auf den 6 Variant-KPIs. Im Dashboard prominent, im PDF auf Seite 2 als Executive Summary.
**Warum:** D3 + P1 + P2 adressieren — der Berater hat eine sofort kommunizierbare Aussage.
**Impact:** Verkaufs-Hebel im Termin; Mandant versteht in 30 Sekunden, was die Auswertung sagt.

### G3 — Block 5 BVG Tab-Restrukturierung (5h)
**Was:** Innerhalb Block 5 pro Person Tabs für Altersguthaben / Einkäufe / WEF / Freizügigkeit. Default-Tab "Altersguthaben"; andere Tabs zeigen Count als Badge.
**Warum:** W2 + W3 — Block 5 ist der komplexeste und braucht Strukturierung.
**Impact:** 50% weniger vertikaler Scroll für den komplexesten Block.

### G4 — Cmd+K Feld-Suche über alle Blöcke (8h)
**Was:** Globale Such-Palette (`<dialog>` mit Fuzzy-Suche) über alle Felder. Klick → Block-Switch + Feld-Highlight + Scroll-Into-View.
**Warum:** G1 — bei mehrmaligem Mandanten-Update / Korrekturen wichtige Power-User-Funktion.
**Impact:** Berater-Effizienz; Differenziator vs. Logismata/Taxware.

### G5 — PDF-Profile mit Length-Toggle (4h)
**Was:** Print-Header mit Dropdown "Kurz (4 Seiten) | Standard (10 Seiten) | Vollständig (22+ Seiten)". Sections via CSS-Class `pdf-profile-{kurz|std|voll}` ein-/ausblenden.
**Warum:** P1 — 22 Seiten überfordern Mandanten. Berater entscheidet pro Situation.
**Impact:** Markt-Disruption-Wow vs. VZ — "Sie bekommen das in der Kurzfassung als Email, das Vollwerk auf Wunsch."
