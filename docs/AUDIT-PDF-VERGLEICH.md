# Audit: Cuira-PDF vs. SSM-PDF — Output-Qualitäts-Vergleich

**Audit-Datum:** 12. Mai 2026
**Audit-Scope:** Read-only Vergleich zwischen Cuira-Print-Output (Quelle: `src/app/print/page.tsx`) und zwei Referenz-SSM-PDFs:
- SSM Muster (Ralph + Stephanie, Paar, ZH, 23 Seiten, Stand 12.09.2024)
- SSM Werrn Franziska (Einzelperson geschieden, Niederglatt ZH, 22 Seiten, Stand 05.05.2026)

**Resultat in einem Satz:** Cuira liefert deutlich mehr **Analyse-Tiefe und Entscheidungs-Hilfen** als SSM (Stress-Tests, KI-Empfehlungen, Sankey, Plan-Varianten, Tragbarkeit), während SSM mit der **Jahres-Detail-Tabelle und der konkreten Massnahmen-Liste** zwei wichtige Karten ausspielt, die im Cuira-PDF entweder fehlen oder hinter einem Toggle versteckt sind.

---

## 1. Side-by-Side Section-Vergleich

Reihenfolge folgt der SSM-Logik (linear lesbar von vorne nach hinten). "✓" = vorhanden, "—" = fehlt, "○" = teilweise/anders.

| # | Section | SSM hat | Cuira hat | Bewertung |
|---|---|---|---|---|
| 1 | **Cover-Seite** | Adresse, Berater-Name + Funktion ("Eidg. Finanzplaner FA"), Logo "SSM Your Value in Life" | Adresse, Berater-Name am Ende, Cuira-Logo, **Verdict-Box** (good/warn/neg), "Vertraulich"-Footer | Cuira gewinnt: Verdict-Box gibt Mandant sofort einen Status-Indikator. Aber: **Berater-Funktion fehlt auf der Cuira-Coverseite** — wird erst auf Seite "Ihr Cuira-Berater" gezeigt. |
| 2 | **Inhaltsverzeichnis** | ✓ einfache Tabelle mit Seitenzahlen | — fehlt | **Lücke Cuira.** Bei 15+ Sektionen wäre ein TOC für den Berater (Navigation) und Mandant (Übersicht) hilfreich. |
| 3 | **Persönliche Angaben + Ziele** | Strukturierte 2-Spalten-Tabelle (Person 1/2), Adresse, **Standard-Ziel-Text** ("Pensionsplanung Werrn umfasst eine Gesamtübersicht...") + **Liste der "Wichtigsten Fragen"** in gelber Box | Eckdaten-Tabelle (Fallart, Zivilstand, Wohnort, Pensionsalter, Wunschverbrauch, Religion) | SSM gewinnt knapp: Die "Wichtigsten Fragen" geben dem Mandanten direkt eine Antwort-Erwartungshaltung. Cuira-Eckdaten sind trockener. **Quick-Win:** Bei Cuira einen "Was Sie auf den nächsten Seiten finden"-Block einfügen. |
| 4 | **Beschreibung der Szenarien** | 2-Spalten-Layout (Ausgangslage / Finanzplanung), je 5-7 Bullet-Blöcke (Szenarien, langfristiges Einkommen, Ausgaben, Eigenheim/Hypothek, Bezug Vorsorge, Parameter), **klar lesbar in 30 Sekunden** | Plan-Varianten Δ-Vergleich (Tabelle mit KPI-Boxen + Diff-Liste) — nur wenn ≥2 Pläne | Cuira gewinnt **strukturell** (KPIs werden quantifiziert), aber SSM ist in der **Narrativ-Beschreibung** überlegen. Cuira zeigt was sich ändert, SSM zeigt **was ist und was wird**. |
| 5 | **Einnahmen + Ausgaben (Stichtag)** | Saubere 2-Spalten Tabelle Einnahmen/Ausgaben mit Totalen, Mini-Bar-Chart links unten, Saldo prominent | Cashflow-Chart (Bar-Stack mit Zeitachse) + Steuer-Detail-Card | SSM gewinnt klar: für den Mandanten ist der **Heute-Snapshot** in CHF-Werten leichter zu verstehen als ein 30-Jahres-Stack-Chart. **Cuira fehlt eine "Heute-Budget"-Seite.** |
| 6 | **Vermögensbilanz** | 2-Spalten Aktiva/Passiva-Liste + **2 Donut-Charts (Aktiva/Passiva)** mit Prozent + Totale | 3 KPI-Boxen "Heute / Pensionierung / +20 Jahre" — keine Donut, keine Aktiva/Passiva-Aufschlüsselung | **SSM gewinnt deutlich.** Cuira zeigt nur Netto, kein Bruttovermögen, keine Passiva-Quote (Hypothek/Nettovermögen-Split). **Strategische Lücke** — Donut-Chart macht 60% des Wertes der Bilanz aus. |
| 7 | **Entwicklung Einnahmen + Ausgaben (Jahres-Tabelle)** | 2 Tabellen (2024-2036, 2037-2049), je Jahr Einnahmen/Ausgaben/Saldo für Ausgangslage UND Finanzplanung + **Differenz-Zeile grün** + 2 Liniencharts (Ausgangslage / Finanzplanung) | EinnahmenAusgaben-Chart als Bar-Stack, keine Jahres-Tabelle (nur in optionalem `DetailLiquiditaetTable` mit User-Toggle) | **SSM gewinnt klar.** Berater nutzen die Jahres-Tabelle um konkrete Punkte zu erklären ("Hier 2032 sehen Sie..."). Im Cuira nur möglich wenn User Toggle aktiviert (Default off). |
| 8 | **Entwicklung Vermögen (Jahres-Tabelle)** | 2 Tabellen + 2 Stacked-Bar-Charts mit Vermögens-Komponenten | VermögensChart (Stacked-Bar mit Komponenten) — guter Chart, aber ohne Jahres-Werte-Tabelle daneben | Cuira-Chart ist visuell ansprechender (mit Pensions-Marker), aber **Berater kann keine Punkt-für-Punkt-Diskussion** machen ohne die Zahlen daneben zu haben. |
| 9 | **Entwicklung Steuern** | Tabelle nach Kategorien (Eink/Verm/Kap/GGSt) pro Jahr, beide Szenarien + Linienchart | SteuerChart + SteuerDetailCard | Cuira gewinnt für **Erkenntnisgewinn** (Detail-Card zeigt Treiber). SSM gewinnt für **Berater-Nachvollziehbarkeit** der Jahres-Werte. |
| 10 | **Massnahmen-Tabelle** | 3-Spalten Wann/Wer/Was, **chronologisch, sehr konkret**: "01.2026 / Beide / Einzahlung Säule 3a-Konto: CHF 7'056 p.a." — bei Muster über 50 Items über 13 Jahre | Optimierungen-Liste (CHF-Wirkung pro Jahr) + Termine-Tabelle (SSM-Style 3-Spalten, mit `MassnahmenTabelle printMode`) | **Cuira gewinnt sogar leicht** — Optimierungen mit CHF-Wirkung sind quantifizierter als SSM. Die Termine-Tabelle ist ähnlich strukturiert. |
| 11 | **Steuer-Detail Ausgangslage** (S.16-18 SSM) | 3 dichte Tabellen: Liquiditätsansicht, Vermögen, Steueransicht (Reineinkommen + Abzüge + Bund/Kanton + Steuerbares Vermögen + Grenzsteuersatz) | **fehlt vollständig** (User-Wunsch laut Auftrag) | Bewusste Design-Entscheidung — OK so. SSM nutzt das v.a. zur Validierung gegen Steuererklärung. |
| 12 | **Steuer-Detail Finanzplanung** (S.19-22 SSM) | Identische 4 Tabellen für Plan-Szenario | **fehlt vollständig** (User-Wunsch laut Auftrag) | Wie oben. |
| 13 | **Grundlagen + Rahmenbedingungen / Disclaimer** | 1-Seite Fliesstext, ~7 Absätze, technisch (Renditen, Versicherungen, Steuern, Anpassung) | 5 Absätze: Datenquellen, EMV-Hinweis, FIDLEG, Art. 100 OR, Datenschutz/DSG | **Cuira gewinnt rechtlich.** SSM-Disclaimer ist eher Fachsprache, Cuira deckt FIDLEG + DSG explizit ab. |

### Sections die NUR im Cuira-PDF sind (Cuira-Vorteil):

| Section | Wert |
|---|---|
| **3-Säulen-Übersicht KPI** | Quick-Read für Mandant — sofort sichtbar wo die Vorsorge-Lücke ist |
| **Hinterlassenen-Leistungen** (bei Paar) | Witwen/Witwer + Waisen — emotionales Argument, das SSM nicht bedient |
| **Sankey-Geldfluss-Diagramme** (heute + Pension) | Innovativ, modern. Aber: Berater muss Mandanten kurz erklären was er sieht |
| **Tragbarkeit Eigenheim** (heute + Pension) | Banken-relevant — SSM zeigt das nur als Text-Bullet ("Tragbarkeit nicht gegeben") |
| **Stress-Tests** | Drei Was-wäre-wenn-Szenarien — Verkaufsargument gegenüber VZ |
| **KI-Empfehlungen** | Bei Generation aus Dashboard — personalisiert, prioritäts-sortiert |
| **Reform-Hinweis Eigenmietwert 2030** | Politisch aktuell, professionell |
| **Plausibilitäts-Hinweise** | Berater-Hilfe vor Versand |
| **Ihr Cuira-Berater Box** | Dunkler Kontakt-Block — branding stark |
| **Plan-Varianten Δ-Tabelle** | Wenn Plan B/C — quantifiziert was die Alternative bringt |

### Sections die NUR im SSM-PDF sind (Cuira-Lücken):

| Section | Wert | Quick-Win? |
|---|---|---|
| **Inhaltsverzeichnis** | Navigation bei 15+ Sections | ja, 30min |
| **Beschreibung der Szenarien (Narrativ)** | Mandant versteht in 30 Sek. was die Empfehlung ist | ja, 1-2h |
| **Aktiva/Passiva-Tabelle + Donut-Charts** | Bilanz-Verständnis — wo steht der Mandant? | strategisch, halber Tag |
| **Einnahmen+Ausgaben Stichtag-Tabelle** | Heute-Snapshot in CHF, leichter zu greifen als Chart | ja, halber Tag |
| **Jahres-Tabellen (Einnahmen/Ausgaben/Vermögen/Steuern)** | Berater-Werkzeug für Punkt-Diskussion | strategisch, 1-2 Tage |
| **Wichtigste Fragen-Box** | Zielgruppen-Erwartung schaffen | ja, 30min |

---

## 2. Berater-Perspektive: Welcher PDF überzeugt Mandanten mehr?

### Szenario A: Mandant ist "Zahlen-Mensch" (Banker, Tech, Ingenieur)
**Sieger: Cuira.** Stress-Tests, Sankey, Plan-Varianten-Δ und die quantifizierte Optimierungs-Liste mit CHF-Wirkung sprechen direkt diese Persona an. SSM wirkt für sie wie ein Excel-Ausdruck — funktional aber visuell flach.

### Szenario B: Mandant ist "Geschichten-Mensch" (Lehrer, Verkauf, Handwerk, Pensionierte)
**Sieger: SSM.** Die Narrativ-Beschreibung "Ausgangslage" vs. "Finanzplanung" mit Bullet-Punkten ("100% Rentenbezug ... Kapitalbezug ... Verkauf Eigenheim 2038") ist greifbarer. Cuira wirft viele Diagramme rein, aber **erklärt zu wenig in Klartext was als nächstes konkret passiert**.

### Szenario C: Berater bereitet sich auf das Gespräch vor
**Klares Unentschieden.** Cuira gibt dem Berater Plausibilitäts-Warnungen + KI-Vorschläge (super als Vorbereitung). SSM gibt dem Berater die Jahres-Tabellen, um konkrete Jahre zeigen zu können ("Hier 2032..."). **Idealfall: Cuira behält seine Stärken + integriert die Jahres-Tabellen.**

### Szenario D: Mandant liest den PDF zu Hause alleine ohne Berater
**Sieger: SSM.** Lineare Lesbarkeit, klare Section-Titel, narrative Beschreibung. Cuira's stärken (Sankey, Stress-Tests, KI-Vorschläge) brauchen oft Berater-Begleitung. **Ohne Lese-Reihenfolge-Hilfe (TOC) und Cliffhangers (Verdict-Box ist gut, reicht aber nicht) verliert der Mandant zwischen Seite 5 und 8.**

### Insgesamt für Cuira's Verkaufsthese (Markt-Disruption vs. VZ bei CHF 300):
**Cuira-PDF wirkt heute schon premiumer als SSM**, aber **wirkt nicht 10x teurer**. Das ist insofern OK, als die Cuira-Disruption nicht über Premium-Look funktioniert, sondern über **Preis + Tempo**. Aber: ein Mandant der Cuira mit VZ vergleicht, würde im VZ-PDF (vermutlich SSM-Style) die **Standard-Erwartungen** (Bilanz mit Donut, Jahres-Tabellen, klare Narrative) sehen — wenn die im Cuira-PDF fehlen, entsteht **Vertrauensverlust trotz besserer Analyse-Tiefe**.

---

## 3. Visuelle Qualität — Layout-Vergleich

| Kriterium | SSM | Cuira | Anmerkung |
|---|---|---|---|
| **Seitenränder A4** | 15-20mm, Standard | 15mm @page + 18mm bottom (siehe `print/page.tsx:1146`) | Cuira leicht enger — moderner |
| **Schriftgrösse Body** | ~10pt | 10pt (`body { font-size: 10pt; }` line 1172) | gleich |
| **Schriftgrösse Tabelle** | ~9pt | 7.5pt für Detail-Liq (line 1241) | Cuira kleiner — kompakter aber weniger lesbar |
| **Farbpalette** | Pastell-Blau (#A0C0E0 ähnlich), Logo-Beige | Cuira-Deep dunkelblau #0a2540, akzent-Farben pro Section, Status-Farben grün/gelb/rot | Cuira deutlich moderner und differenzierter |
| **Charts** | Excel-style Linien/Bars/Donuts | Recharts (Bar-Stack, Sankey, Line) — interaktiver Look | Cuira gewinnt visuell, SSM gewinnt in der "wird beim Drucken nichts verlieren"-Robustheit |
| **Header pro Seite** | "SSM Partner AG/05.05.2026" links + Seitenzahl rechts | Cuira-Logo + Kundenname + Datum oben; Footer "Cuira Partners GmbH — Pensionsplanung" + Seitenzahl unten (`@page` lines 1144-1158) | Cuira professioneller — beide Header + Footer |
| **Logo-Präsenz** | SSM-Logo oben rechts auf Cover | Cuira-Logo oben links jede Seite, gross auf Cover | Cuira stärkere Marken-Präsenz |
| **Section-Trenner** | Hellblau hinterlegt mit weisser Schrift | Unterstrichene UPPER-Titel ohne Hintergrund (line 1309) | Geschmackssache — Cuira minimalistischer/moderner |
| **Page-Break-Handling** | Excel-Export, oft suboptimal | Explizit per `page-break-before` für jede Section + `page-break-inside: avoid` für Charts | Cuira professioneller — Charts brechen nie über 2 Seiten |
| **Print-A4-Tauglichkeit** | Verbesserungsfähig (Tabellen oft zu breit) | Speziell optimiert: Detail-Liquidität im Querformat (`@page detail-liq { size: A4 landscape }` line 1233) | Cuira gewinnt klar |

### Mandant-Verständlichkeit-Score
- **SSM:** 7/10 (klar, aber etwas trocken-buchhalterisch)
- **Cuira:** 6/10 (visuell stärker, aber zu wenig Klartext-Begleitung)

### Berater-Lesbarkeit-Score
- **SSM:** 8/10 (Jahres-Tabellen sind Gold)
- **Cuira:** 7/10 (Plausi-Box ist Gold, fehlende Jahres-Tabellen sind teuer)

---

## 4. Massnahmen-Tabelle — Detail-Vergleich

### SSM Werrn Franziska (S.13)
- 22 Items über 9 Jahre (2026-2035)
- Spalten: Wann (MM.JJJJ) / Wer / Was
- Beispiele:
  - `05.2026 / Franziska Werrn / Einzahlung Säule Maximalbeitrag Säule 3a-Konto ZKB: CHF 7'258 p.a.`
  - `01.2034 / Franziska Werrn / Verlängerung der per 2034 fälligen Festhypothek: CHF 100'000`
  - `08.2035 / Franziska Werrn / 100% Kapitalbezug aus der Pensionskasse: CHF 188'489`

### SSM Muster (S.13-14)
- ~50 Items über 13 Jahre — **deutlich detaillierter** (PK-Einkäufe von Stephanie über 11 Jahre einzeln aufgelistet)
- Identische Struktur Wann/Wer/Was

### Cuira (zwei Listen)
- **Optimierungen** (`optimierungen.filter(m.kategorie === "optimierung")` line 108): mit CHF-Wirkung pro Jahr — **inhaltlich überlegen**
- **Termine + Reminder**: 3-Spalten-Tabelle Wann/Wer/Was (`MassnahmenTabelle printMode` line 921) — **strukturell identisch zu SSM**

### Bewertung
**Cuira ist gleichwertig oder besser** in der Massnahmen-Tabelle. Die `MassnahmenTabelle` wurde explizit "SSM-Style" gebaut (siehe Auftrag X-4). Plus: Cuira-Optimierungen quantifizieren Wirkung in CHF/Jahr, was SSM nicht macht.

**Aber:** Bei Cuira heisst die Section "Termine & Reminder" und ist erst nach den Optimierungen — bei SSM heisst es schlicht "Massnahmen" und ist die zentrale Ergebnis-Seite. **Quick-Win:** Cuira-Section umbenennen + früher platzieren, damit Berater im Gespräch direkt darauf zeigen kann.

---

## 5. Vermögensbilanz — der grösste Cuira-Mangel

### SSM (S.6 Muster, S.6 Werrn)
**Aktiva-Block (links):**
- Konti und Anlagen (Liquidität, Übrige Anlagen, Übriges Vermögen 1+2)
- Lebensversicherungen 3b (gemischt, Leibrente, sonstige)
- Immobilien (Selbstgenutzt, Renditeliegenschaft, Sonstiges Wohneigentum)
- Vorsorgevermögen (BVG P1/P2, Säule 3a P1/P2)
- **Total Aktiva** in CHF

**Donut-Chart Aktiva** (rechts oben) zeigt Prozent-Anteile

**Passiva-Block (links unten):**
- Hypothek, Darlehen, sonstige Kredite
- Nettovermögen
- **Total Passiva** in CHF

**Donut-Chart Passiva** (rechts unten) zeigt Hypothek vs. Nettovermögen

### Cuira (Seite "Vermögen — drei Stichtage")
- 3 KPI-Boxen: Heute, bei Pensionierung, +20 Jahre nach Pension
- **Nur Nettovermögen, keine Aktiva/Passiva-Aufschlüsselung**
- **Kein Donut-Chart**

### Bewertung
Das ist die **klarste Cuira-Lücke**. Der Aktiva-Donut zeigt dem Mandanten in einem Blick: "Du hast 61% Immobilien-Klumpen-Risiko" oder "Du hast 90% Eigenheim, 4% Liquidität". Diese Insight gibt's bei Cuira heute **nirgendwo** — auch nicht im Dashboard.

**Strategischer Vorschlag:** Eine `VermoegensBilanzSection` ergänzen mit:
- 2-Spalten Aktiva/Passiva-Tabelle (Daten kommen aus `vermoegensbilanz.ts`)
- 2 Donut-Charts (Recharts `PieChart`) für Aktiva-Komposition und Passiva-Komposition
- Stichtag heute (oder konfigurierbar)
- Eigene Print-Seite nach Eckdaten, vor 3-Säulen-Übersicht

Aufwand: **~1 Tag.** Impact: hoch.

---

## 6. Disclaimer-Vergleich

### SSM (S.22-23)
~7 Absätze technischer Fliesstext:
- Datenbasis vom Mandanten geprüft (nicht durch Berater)
- Renditeangaben sind keine Garantie
- Anlagedauer wichtig
- Versicherungen mit Überschussbeteiligungen
- Steuergesetzgebung kann ändern
- Keine Haftung für Vollständigkeit/Richtigkeit
- Taxware-Steuerrechner Hinweis
- Anpassung des Planungsberichts bei Änderungen

### Cuira (Footer)
5 Absätze, rechtlich expliziter:
- **Grundlage und Datenquellen** (ESTV, BSV-Skala 44, AHV21, Inflation 1.5%, Hypozins 5%)
- **Eigenmietwert + Schuldzinsabzug-Reform 2030** (politisch aktuell)
- **Keine Beratung im engeren Sinn** (FIDLEG explizit erwähnt)
- **Haftungsausschluss Art. 100 OR** (Rechtsnorm zitiert — sehr professionell)
- **Datenschutz** (DSG revidiert 1.9.2023, Server Schweiz/EU, 10-Jahres-Frist OR Art. 958f)

### Bewertung
**Cuira-Disclaimer gewinnt rechtlich klar.** FIDLEG, Art. 100 OR, DSG, OR 958f — das ist alles **korrekt zitiert** und gibt dem Mandanten + Berater Rechtssicherheit. SSM bleibt allgemein-juristisch.

**Ist es zu viel?** Nein — der Mandant überfliegt den Disclaimer ohnehin. Die Detailtiefe schadet nur, wenn sie auf dem **Cover** stehen würde. Im Footer/Disclaimer-Bereich ist sie ein Premium-Signal: "Wir haben Anwälte angeschaut".

**Mögliche Mikro-Verbesserung:** Den FIDLEG- und Art. 100 OR-Absatz kürzen auf je 2-3 Sätze + eine separate "Annahmen"-Box vor den Charts platzieren (Inflation 1.5%, Rendite x%, Hypozins 5% — als Tabelle, nicht Fliesstext im Footer). Dadurch werden die rechtlichen Absätze prägnanter und die technischen Annahmen sichtbarer.

---

## 7. Top 5 Quick-Wins (je < 1 Tag Aufwand)

1. **Inhaltsverzeichnis-Seite hinzufügen** (~30min)
   - Nach Cover, vor KPI-Seite
   - Static-Liste, da Section-Reihenfolge fix ist
   - Plus: bessere Navigation, Premium-Look

2. **"Wichtigste Fragen Ihrer Planung"-Box auf Eckdaten-Seite** (~30min)
   - 5-7 Bullet-Fragen die Cuira beantwortet ("Wie entwickelt sich Ihre finanzielle Situation bei Pensionierung mit Alter X?", "Welche Lebenshaltungskosten sind tragbar?", "Wann müssen welche Massnahmen umgesetzt werden?")
   - Hellgelbe Box wie SSM
   - Erzeugt Erwartungs-Haltung

3. **"Beschreibung des Szenarios"-Section** (~1-2h)
   - Generiert aus State: "Pensionierung mit Alter X per Datum Y, % Rentenbezug, ..."
   - Standard-Bullets über Vorsorge-Bezug, Ausgaben-Annahme, Liegenschafts-Plan
   - Auf Seite 2 oder 3 vor den Charts

4. **Termine-Section umbenennen + früher platzieren** (~15min)
   - Aktuell heisst sie "Termine & Reminder" — umbenennen auf "Massnahmen" (wie SSM)
   - Vor "Ihr Cuira-Berater"-Section platzieren

5. **Heute-Budget-Tabelle (Stichtag-Snapshot)** (~3-4h)
   - 2-Spalten Einnahmen/Ausgaben aus `cashflow[0]` (oder aktuellem Jahr)
   - SSM-Style mit Mini-Bar-Chart der Ausgaben-Verteilung
   - Vor den Multi-Year-Charts

---

## 8. Top 3 Strategische Verbesserungen (je 0.5-2 Tage Aufwand)

### 1. Vermögensbilanz-Section mit Aktiva/Passiva + Donut-Charts
**Aufwand:** ~1 Tag
**Warum:**
- Grösste Cuira-Lücke (siehe Abschnitt 5)
- Mandant kann sein Risiko-Profil "Klumpen-Risiko Eigenheim" sofort sehen
- Pflichtelement jeder professionellen Pensionsplanung (VZ + alle Banken zeigen das)
- Daten sind in `vermoegensbilanz.ts` schon vorhanden — nur die Visualisierung fehlt

**Was bauen:**
- `<VermoegensBilanzSection />` Komponente
- Aktiva-Liste + Recharts-Donut (Konti, 3b, Immobilien, Vorsorge)
- Passiva-Liste + Recharts-Donut (Hypothek, Darlehen, Nettovermögen)
- Stichtag heute (später: Toggle für Pension)

### 2. Jahres-Tabellen für Cashflow + Vermögen (immer mitdrucken, nicht nur Toggle)
**Aufwand:** ~2 Tage
**Warum:**
- Berater nutzt diese Tabellen im Gespräch ("hier 2032 sehen Sie...")
- Cuira's `DetailLiquiditaetTable` existiert schon (`DetailLiquiditaetTable printMode`) — aber nur hinter LocalStorage-Toggle "cuira-show-detail-liq"
- SSM-Pflicht: Mandant erwartet Jahres-Werte zu sehen, nicht nur Charts
- Eigene Querformat-Print-Page schon vorbereitet (line 1233 `@page detail-liq { size: A4 landscape }`) — Toggle einfach auf Default-On stellen

**Was bauen:**
- 2 weitere Jahres-Tabellen analog SSM: "Entwicklung Vermögen Jahr für Jahr" und "Entwicklung Steuern Jahr für Jahr"
- Beide in Querformat im Print, mit Bar-Stack-Chart darunter
- Default-Toggle auf On stellen (User kann es weiterhin abschalten)

### 3. "Beschreibung der Szenarien"-Generierung (Narrativ + Klartext)
**Aufwand:** ~1.5 Tage
**Warum:**
- SSM's wichtigste Erklär-Section — Mandant versteht in 30 Sek. den ganzen Plan
- Aktuell macht Cuira das nur per Plan-Varianten-Δ (zu technisch)
- KI-Module ist schon da (`kiMassnahmen`) — kann erweitert werden um eine narrative Zusammenfassung

**Was bauen:**
- Template-basierte Narrativ-Generierung aus State (kein KI-Call nötig):
  - "Pensionierung Alter {bezugsalterP1} per Ende {Monat} {Jahr}"
  - "{rentenbezugProzent}% Rentenbezug aus der Pensionskasse"
  - "Langfristiges Pensions-Einkommen total: CHF {x} p.a. (AHV + BVG + Mieten)"
  - "Ausgaben: {tragbarkeitsKommentar}"
  - "Eigenheim: {immobilienKommentar}"
- Section "Beschreibung Ihrer Planung" nach Eckdaten, vor Charts
- 2-Spalten-Layout wie SSM (Ausgangslage / Plan)

---

## 9. Was Cuira nicht ändern soll (bewährte Stärken)

Damit beim Verbessern nicht das Profil verwässert wird:

- **Verdict-Box auf der Cover-Seite** (good/warn/neg) — einzigartig, behalten
- **Stress-Tests** — Differenzierungs-Asset gegenüber VZ und SSM
- **KI-Empfehlungen** — die Cuira-Story, behalten und ausbauen
- **Sankey-Diagramme** — moderner Look, gute Schwerpunkt-Visualisierung
- **Plausibilitäts-Box am Ende** — Berater-Werkzeug Gold, behalten
- **Rechtlich-präziser Disclaimer (FIDLEG, Art. 100 OR, DSG)** — Premium-Signal
- **Reform 2030 Eigenmietwert-Hinweis** — politisch aktuell, professionell
- **Print-Optimierungen (Querformat-Detail-Liq, page-break-avoid, etc.)** — engineering-Sorgfalt sichtbar
- **3-Säulen-Übersicht** — gute Verständlichkeit für Mandanten
- **Tragbarkeit Eigenheim mit kalkulatorischem Zinssatz** — Banken-Standard-Sprache

---

## 10. Zusammenfassung

**Cuira ist heute schon premiumer als SSM in Visualisierung, Innovation und Rechts-Tiefe.**

Es fehlen **drei Pflicht-Elemente**, die jeder Mandant bei einer "richtigen" Pensionsplanung erwartet, weil SSM/Logismata/Taxware/VZ sie alle haben:

1. Aktiva/Passiva-Bilanz mit Donut-Charts
2. Jahres-Tabellen (Einnahmen/Ausgaben/Vermögen/Steuern) — nicht nur Charts
3. Klartext-Narrativ "Was passiert in Ihrer Planung?"

Ohne diese fühlt sich der Cuira-PDF trotz besserer Analyse-Tiefe **leicht unprofessionell-tech-ish** an gegenüber dem SSM-PDF. Mit diesen drei Ergänzungen (~3-4 Tage Gesamt-Aufwand) übernimmt Cuira auf allen Achsen die Führung.

**Empfohlene Reihenfolge zur Umsetzung:**
1. Quick-Wins (Tag 1): TOC + Wichtigste-Fragen-Box + Termine-Section umbenennen
2. Vermögensbilanz mit Donut-Charts (Tag 2)
3. Narrativ-Beschreibung der Szenarien (Tag 3)
4. Jahres-Tabellen Default-On + Vermögens- und Steuer-Jahres-Tabellen (Tag 4-5)

---

**Auditor:** Claude (Cuira-Codebase-Read-only-Audit)
**Status:** Audit abgeschlossen, keine Code-Änderungen vorgenommen
**Quell-Dateien:**
- `src/app/print/page.tsx` (Cuira-Print-Output, 1657 Zeilen)
- `docs/Def.FinancialPlanning - Muster.pdf` (SSM Ralph + Stephanie, 23 Seiten)
- `~/.../Werrn Franzsika (Timo)/Def.FinancialPlanning.pdf` (SSM Werrn, 22 Seiten)
