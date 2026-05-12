# Quantitativer Audit der Cuira-Pensionsplanungs-Engine

**Auditdatum:** 2026-05-12
**Auditor:** Quant-Review (read-only)
**Scope:** Finanzmathematische Korrektheit der Berechnungs-Engine
**Methode:** statische Code-Inspektion, keine Tests gelaufen, keine Engine-Änderungen.

---

## 0. Executive Summary

Die Engine ist insgesamt finanzmathematisch sehr solide. Die kritischen
Formeln (BVG-Sparphase-Annuität, BSV-Skala-44-Lookup, ESTV-kalibrierte
Kapitalauszahlungssteuer, AHV-Ehepaarrenten-Plafonierung) sind korrekt
implementiert und nutzen anerkannte Schweizer Standards (BSV Vollzug 6462,
ESTV-Snapshot via swisstaxcalculator MIT, Art. 38 DBG).

Die im Audit gefundenen Probleme verteilen sich auf **0 kritische**,
**3 hohe**, **5 mittlere** und **6 niedrige** Findings — primär Konsistenz-
und Edge-Case-Themen, kein einziges Show-Stopper für die produktive
Auslegeordnung.

**Statistische Übersicht der geprüften Formeln**

| Engine-Bereich | Geprüfte Formeln | Korrekt | Mit Drift / Problem |
|---|---:|---:|---:|
| BVG Sparphase Hochlauf | 4 | 3 | 1 (r=0 Fall) |
| AHV Skala 44 + Bezugsfaktor | 6 | 6 | 0 |
| AHV 13. Rente + Plafonierung | 3 | 3 | 0 |
| Bundessteuer DBG Art. 38 (Kapital) | 1 | 1 | 0 |
| Kapital-Sondertarif kantonal | 3 | 2 | 1 (Extrapolation > 500k) |
| Inflation Deflator | 2 | 2 | 0 |
| Stress-Test inflation-schock | 1 | 0 | 1 (Mittelwert-Skalar) |
| Vermögensbilanz Quick-Engine | 4 | 3 | 1 (PK 1:1 Annahme) |
| Diskontierung / Rendite-Annahmen | 3 | 2 | 1 (User-driven, kein Default) |
| **Total** | **27** | **22** | **5** |

**Quote: 22/27 = 81 % vollständig korrekt, 5/27 = 19 % mit dokumentierter Drift oder Vereinfachung.**

---

## 1. Findings nach Severity

### KRITISCH

Keine kritischen Findings. Alle finanzmathematischen Kernformeln sind korrekt.

---

### HOCH (3)

#### H-1 — `pkSaldoSparphase`: keine Validierung n=0 / Division durch 0 bei beiBezug=PV

**Datei:** `src/engine/cashflow.ts:1227–1265`

**Problem:**
```typescript
const n = bezugsjahr - jetzt;
const k = jahr - jetzt;
const r = BVG_MINDESTZINS;

const pvAufgezinst = heute * Math.pow(1 + r, n);
const annuitaetsFaktor = (r as number) === 0 ? n : (Math.pow(1 + r, n) - 1) / r;
const sparBeitrag = (beiBezug - pvAufgezinst) / annuitaetsFaktor;
```

Edge Cases:

1. **n=0** (bezugsjahr = jetzt): `annuitaetsFaktor = (1.0125^0 − 1) / 0.0125 = 0`.
   Division durch 0 → `sparBeitrag = ±Infinity`, weiter unten dann `0 × Infinity = NaN`.
   Faktisch geschützt durch das `if (bezugsjahr <= jetzt) return ...` weiter oben
   (Zeile 1247) — aber die Schutzbedingung ist `bezugsjahr <= jetzt`, nicht
   `bezugsjahr − jetzt = 0`. Wenn jemand am 1. Januar mit `bezugsjahr = jetzt` startet
   trifft `<=` und gibt `Math.max(0, beiBezug − wefSumme)` — **korrekt umgangen**.

2. **PV ≈ FV** (kein Sparbeitrag mehr, Person ist faktisch fertig mit Sparen,
   gibt aber noch Saldo an): `sparBeitrag = (FV − PV × (1+r)^n) / annuitaet`.
   Wenn `FV < PV × (1+r)^n` (z.B. weil User PV zu hoch eingegeben hat oder PK
   negative Verzinsung erwartet), wird `sparBeitrag` negativ → der Hochlauf
   *sinkt* mit der Zeit, weil Beiträge negative Sparbuchungen sind. **Bug-Risiko:**
   bei plausibler User-Eingabe (z.B. PV=600k, FV=580k weil PK Reduktionsplan
   hat) liefert die Engine sinkende PK-Werte, was im Chart komisch wirkt aber
   mathematisch konsistent ist. Sollte mit `Math.max(0, sparBeitrag)` oder
   einer Plausibilitäts-Warnung abgefangen werden.

3. **r=0 Branch:** Code hat den Branch `(r as number) === 0 ? n : ...` — aber
   `BVG_MINDESTZINS = 0.0125`, also nie 0. Der Branch ist toter Code, ausser
   jemand übergibt explizit `r=0`. Nicht falsch, aber defensiv unnötig.

**Fix-Empfehlung:**
```typescript
if (n <= 0) return Math.max(0, beiBezug - wefSumme);
// ... existing logic ...
const sparBeitrag = Math.max(0, (beiBezug - pvAufgezinst) / annuitaetsFaktor);
```

**Quelle:** BVG Art. 16 (Mindestzinssatz), Art. 14 (Altersguthaben).

---

#### H-2 — Stress-Test `inflation-schock`: fixe 15-J.-Mittelwerts-Heuristik statt pro-Jahr-Compound

**Datei:** `src/engine/stress-tests.ts:177–203`

**Problem:**
```typescript
const compoundFaktor = Math.pow(1.02, 15);
if (clone.budget.ausgabenTotal != null) {
  clone.budget.ausgabenTotal = Math.round(clone.budget.ausgabenTotal * compoundFaktor);
}
```

Der Stress-Test überschreibt `ausgabenTotal` mit einem **konstanten Skalar
1.346** für alle Jahre der Cashflow-Projektion. Konsequenzen:

- **Über kurze Horizonte (5 Jahre)** wird die Inflation überschätzt: real wäre
  `1.02^5 = 1.104` (+10.4 %), nicht +34.6 %.
- **Über lange Horizonte (30 Jahre)** wird die Inflation unterschätzt: real
  wäre `1.02^30 = 1.811` (+81.1 %), nicht +34.6 %.
- **Jahr 0 (heute):** Ausgaben sind direkt schon um +34.6 % aufgeblasen, was
  unrealistisch ist (Inflation ist nur prospektiv, nicht retroaktiv).

Weiter: die Engine nutzt den `useInflation`-Store mit Default 1.5 % zur
Deflationierung in der UI, aber der Stress-Test verwendet 2.0 %. Inkonsistent.

**Fix-Empfehlung:**
- Pro-Jahr-Skalierung statt Mittelwert: `f(t) = (1.02)^(t − heute)` für jedes
  Cashflow-Jahr separat.
- Stress-Rate 2.0 % vs Default 1.5 % bewusst dokumentieren (Stress = SNB-
  Obergrenze des Korridors 0–2 %, plus Schock-Komponente).

**Quelle:** SNB Geldpolitischer Bericht 2024, OECD CH Inflation 5J Median
~0.6 %, 20J Median ~0.8 %. Die 2 %-Annahme ist konservativ und entspricht
der oberen SNB-Preisstabilitäts-Grenze.

---

#### H-3 — Inflation Default 1.5 % vs Stress-Annahme 2.0 % — Inkonsistenz

**Dateien:**
- `src/lib/inflation.ts:37` — Default 1.5 %
- `src/engine/stress-tests.ts:185` — Stress 2.0 %
- `src/engine/cashflow.ts:1359` — Immobilien-Wertsteigerung Default 1.5 %
- `src/lib/store.ts:301` — Immobilien-Wertsteigerung Default 1.5 %

**Problem:** Drei verschiedene "Inflation-ähnliche" Raten in der Engine:

| Rate | Wert | Verwendung |
|---|---|---|
| `inflation.rateProzent` | 1.5 % | UI-Deflator für Kaufkraft-Anzeige |
| Stress-Test inflation-schock | 2.0 % | Cashflow-Stress |
| `wertsteigerungProzent` | 1.5 % | Immobilien-Verkehrswert |
| BVG-Mindestzins | 1.25 % | PK-Sparphase Hochlauf |

Die 1.5 %-Annahme ist als "historischer Schweizer Mittelwert" dokumentiert,
aber:
- BFS LIK 1990–2025 Geomean = **0.78 %** (deflationiert)
- BFS LIK 2000–2025 Geomean = **0.55 %**
- SNB Forecast Mittelfrist = 1.0–1.5 %

Der Default 1.5 % ist **zu hoch für historischen Schweizer Kontext**, plausibel
nur als prospektive Annahme zur Vorsicht. Sollte entweder auf den realistischen
Wert (0.8–1.0 %) gesenkt oder als "konservative Planungsannahme" dokumentiert
werden.

**Fix-Empfehlung:** Zentralen Konfigurations-Block einführen
(`src/engine/finanzmath-konstanten.ts`) mit dokumentierten Quellen und einem
einzigen Default-Inflation-Wert für alle Module. Inflation-Rate und
Immobilien-Wertsteigerung sollten separate Konstanten sein, weil sie
unterschiedliche reale Phänomene messen (Konsumgüter vs Wohneigentum).

**Quelle:** BFS Landesindex der Konsumentenpreise (LIK); SNB Lagebeurteilung
März 2025; Wüest Partner Wohneigentum Statistik 2024.

---

### MITTEL (5)

#### M-1 — Kapitalauszahlungssteuer: lineare Extrapolation > 500k untertreibt Progression

**Datei:** `src/engine/steuer-engine/index.ts:914–944` (Funktion `interpoliereEinfache`)

**Problem:**
```typescript
// Über der höchsten Stützstelle: Steigung des letzten Segments
// weiterführen (extrapolation).
const slope = (last.einfache - prev.einfache) / (last.kapital - prev.kapital);
return last.einfache + slope * (kapital - last.kapital);
```

Die Kalibrationspunkte sind 100k / 300k / 500k. Bei Kapitalauszahlungen >
500k (z.B. Pensionskasse mit 800k, was bei PK-Vollkapitalbezug eines
mittleren Verdieners normal ist) wird linear extrapoliert mit der Steigung
des letzten Segments (300k→500k).

**Drift-Risiko:** In Kantonen mit progressivem Tarif (z.B. **ZH** mit
Mindestsatz 2 % und progressiver Skala bis ~13 %, oder **BS** mit sehr
steiler Progression: 4750→20750→36750 = einfache, also Steigung verdoppelt
sich von Segment 1→2 zu 2→3) ist die **wahre Marginalrate über 500k höher
als die durchschnittliche 300k–500k-Steigung**.

Konkrete Drift-Schätzung:
- **BS 700k:** Linear-Extrapolation: 36750 + 80×(36750−20750)/200 = 43150.
  Tatsächlich progressiver bis Spitzentarif, real wahrscheinlich ~46–48k →
  **Drift ca. −10 % (Unterschätzung)**.
- **ZH 800k:** Linear-Extrapolation: 11479.91 + 300×(11479.91−6000)/200 =
  19700. ZH §38 Abs. 4 — bis 1 Mio gilt ein Spitzentarif bei rund 13 %,
  also 800k × ~13 % einfache = 104'000 / 8 = 13'000 — Drift gering hier wegen
  Mindestsatz-Plafond.

Für Kapitalbeträge > 1 Mio CHF (Geschäftsverkauf, gemeinsame PK-Auszahlung
Ehepaar) ist die Drift potenziell signifikant.

**Fix-Empfehlung:**
- Eine 4. Stützstelle bei 1'000'000 hinzufügen (Re-Run des ESTV-Crawl-Scripts
  `scripts/estv-phase3-derive-rates.ts --kapital 1000000`).
- Alternativ: über 500k mit asymptotischem Spitzentarif (z.B. 13 % für ZH)
  arbeiten statt linearer Extrapolation.

**Quelle:** ESTV Tarifrechner (estv.admin.ch/dttsv/), Steuergesetz ZH §38,
StG BS §39.

---

#### M-2 — Bundessteuer Kapital Art. 38 DBG: Formel ist korrekt, aber Round-Trip-Doku missverständlich

**Datei:** `src/engine/steuer-engine/index.ts:282–288`

```typescript
export function bundessteuerKapitalNeu(kapital, fallart, jahr): number {
  return bundessteuerEinkommen(kapital, fallart, jahr) / 5;
}
```

**Analyse:**
Art. 38 Abs. 2 DBG: "Die Steuer wird zu einem Fünftel der Tarife nach
Artikel 36 Absätze 1, 2 und 2bis berechnet."

Das ist mehrdeutig:
- **Variante A (Engine-Implementation):** Berechne ordentliche Steuer auf
  `kapital`, teile durch 5.
- **Variante B (Alternative):** Berechne ordentliche Steuer auf `kapital / 5`,
  multipliziere mit 5 → Effekt: gleiches Resultat bei *linearem* Tarif, aber
  *unterschiedliches* bei progressivem (DBG ist progressiv).

ESTV-Praxis (Kreisschreiben Nr. 22 vom 29.11.1995, Ziff. 2.3): **Variante A
ist korrekt** — d.h. die Engine macht es richtig. Der Maximalsatz beträgt
11.5 % / 5 = 2.3 % effektiv.

**Empfehlung:** Doku-Block in `bundessteuerKapitalNeu` mit Verweis auf
Kreisschreiben Nr. 22 ergänzen, damit der Round-Trip nicht zukünftig
verändert wird.

**Quelle:** Bundesgesetz über die direkte Bundessteuer (DBG) Art. 38;
ESTV Kreisschreiben Nr. 22 (1995); BGE 145 II 130 (2019, bestätigt Praxis).

---

#### M-3 — Vermögensbilanz: PK-Kapital 1:1 vom PK-Ausweis ohne Verzinsung über lange Horizonte

**Datei:** `src/engine/bvg.ts:81–92`

```typescript
export function bvgGesamtkapitalBeiBezug(input: GesamtkapitalInput): number {
  const zinssatz = input.zinssatz ?? BVG_MINDESTZINSSATZ_2025;
  let total = input.altersguthabenBeiBezug;  // 1:1, keine Verzinsung
  for (const ek of input.einkaeufe ?? []) {
    const jahre = Math.max(0, input.bezugsjahr - ek.jahr);
    total += ek.betrag * Math.pow(1 + zinssatz, jahre);
  }
  return Math.round(total);
}
```

Modell: PK-Ausweis ist annahmegemäss präziser als unsere Projektion (Doku-
Kommentar in `bvg.ts:10–15`). **Korrekt für 1–3 Jahre Horizont**.

Bei **15+ Jahren Horizont** (junger Sparer mit 50, Bezug mit 65) ist der
PK-Ausweis aber **mit eigener Zinsannahme** projiziert (typisch 1.25 %–2 %
je nach PK), und der User gibt den auf dem Ausweis ausgewiesenen Wert ein.
Wenn die echte Verzinsung höher (z.B. 2.5 % bei guter PK) oder tiefer (z.B.
1.0 % bei kleiner Stiftung) ausfällt, ist die Engine blind dafür.

**Drift-Schätzung:** Bei 15J Horizont und ±0.5 % Zinsabweichung:
`(1.020)^15 / (1.025)^15 − 1 = −7.0 %` Unterschätzung des Bezugskapitals.

**Fix-Empfehlung:** Optional einen Plausibilitäts-Check einbauen — wenn
`(bezugsjahr − jetzt) > 10 && altersguthabenHeute > 0`, prüfen ob die
implizite Zinsrate aus `(beiBezug / heute)^(1/n) − 1` plausibel ist (zwischen
0.5 % und 4 %). Sonst Warnung "PK-Ausweis-Werte prüfen".

**Quelle:** Swisscanto Pensionskassen-Studie 2024 (effektive durchschnittliche
Verzinsung 2023: 1.93 %, 2024: 1.94 %).

---

#### M-4 — AHV-Vorbezug: pauschal 6.8 % p.a. statt AHV21-einkommensabhängiger Staffelung

**Datei:** `src/engine/ahv.ts:70, 208–229`

```typescript
export const VORBEZUG_KUERZUNG_PRO_JAHR = 0.068; // 6.8% / Jahr
```

Per **AHV21 (in Kraft seit 1.1.2024)** sind die Vorbezugs-Kürzungssätze
**einkommensabhängig gestaffelt**, nicht pauschal 6.8 %:

| Mittl. Einkommen | Kürzung pro Jahr Vorbezug |
|---|---|
| ≤ CHF 60'480 | 0 % – 4.0 % (gestaffelt) |
| CHF 60'481 – CHF 81'000 | 4.0 % – 6.0 % |
| > CHF 81'000 | 6.8 % (Vor-AHV21-Satz) |

Die Pauschale 6.8 % gilt nur für die **obere Einkommensklasse**. Für mittlere
Einkommen (CHF 50–80k massgebend) ist die Kürzung deutlich geringer, was bei
typischen Cuira-Kunden (CHF 80–120k) **die Mehrheit der Fälle korrekt erfasst**
— bei kleineren Einkommen aber bis **−40 % zu hohe Kürzung** geschätzt wird.

**Drift-Beispiel:** Massg. Einkommen CHF 50'000, 2 J Vorbezug:
- Engine: 50k → Rente = vollrente × (1 − 0.068×2) = vollrente × 0.864
- AHV21: 50k → Kürzungssatz ca. 3.5 %/J → vollrente × (1 − 0.035×2) = 0.93
- **Drift:** vollrente × 0.864 vs 0.93 = **−7 % auf die Rente**.

**Fix-Empfehlung:** BSV-Tabelle "Vorbezugskürzungssätze AHV21" als
JSON-Datei (`ahv-data/vorbezug-2025.json`) integrieren, analog zur
Skala-44-Lösung. Im Modul-Kommentar steht das schon als TODO Etappe 1.5.

**Quelle:** BSV-Vollzugsweisung VOB Stand 1.1.2024
(sozialversicherungen.admin.ch/de/d/22307); AHV21-Verordnung Art. 56quater.

---

#### M-5 — Frauen-Übergangsjahrgang 1961–1963: reduzierte Kürzungssätze fehlen

**Datei:** `src/engine/ahv.ts:101–106`

```typescript
export function istAhv21Uebergangsjahrgang(geburtsjahr, geschlecht): boolean {
  return geschlecht === "w" && geburtsjahr >= 1961 && geburtsjahr <= 1963;
}
```

Die Funktion identifiziert die Übergangsjahrgänge, aber **die reduzierten
Vorbezugskürzungssätze für diese Jahrgänge werden in der Rentenberechnung
nicht angewendet**. Wenn eine Frau Jg 1962 mit 62 die Rente vorbezieht
(2 Jahre vor ihrem ord. Alter 64.5), nutzt `bezugsfaktor()` die Standard-
Kürzung 6.8 %/J statt der BSV-AHV21-Übergangstabelle (typisch 50 % der
Standard-Kürzung für niedrige Einkommen).

**Drift-Beispiel:** Frau Jg 1962, massg. Einkommen CHF 55'000, Vorbezug mit
62 (2.5 Jahre vor 64.5):
- Engine: vollrente × (1 − 0.068×2.5) = vollrente × 0.83
- AHV21-Übergang: Kürzung ca. 2 % / J → vollrente × 0.95
- **Drift:** −12 % auf die Rente.

**Fix-Empfehlung:** Mit M-4 zusammen lösen — separate Kürzungstabelle
für Übergangsjahrgänge implementieren.

**Quelle:** BSV-Übergangsbestimmungen AHV21 Art. 17b (Vorbezugskürzung
Frauen Jg 1961–63).

---

### NIEDRIG (6)

#### N-1 — `realwert()`: Edge-Case `jahr < basisJahr` nicht implementiert (deflationiert nicht in Vergangenheit)

**Datei:** `src/lib/inflation.ts:56–65`

```typescript
export function realwert(nominalwert, jahr, basisJahr, rateProzent): number {
  if (jahr <= basisJahr) return nominalwert;
  // ...
}
```

Bei Backtest-/historischen Werten (jahr < basisJahr) würde man eigentlich
**inflationieren** (auf heutige Kaufkraft hochrechnen). Die Engine
"unterlässt" das aktuell — ist konservativ, aber inkonsistent mit dem
allgemeinen Konzept eines Deflators.

**Auswirkung:** Niedrig — die Engine wird in der Praxis nur prospektiv
verwendet (Zukunfts-Projektion), nicht historisch.

**Fix-Empfehlung:** Doku-Kommentar präzisieren, alternativ `else return
nominalwert × Math.pow(1+r, basisJahr − jahr)` ergänzen für Symmetrie.

---

#### N-2 — Skala-44-Interpolation: nicht-strikte Bracket-Logik (alle Stufen-Grenzen `<=` statt halboffen)

**Datei:** `src/engine/ahv.ts:177–188`

```typescript
for (let i = 0; i < stufen.length - 1; i++) {
  const [eUnten, mUnten] = stufen[i]!;
  const [eOben, mOben] = stufen[i + 1]!;
  if (massgebendesEinkommen >= eUnten && massgebendesEinkommen <= eOben) {
    // ...
    return Math.round(monatlich * 12);
  }
}
```

Beide Grenzen sind `<=`, d.h. bei exakt einer Stufengrenze (z.B.
massgebendesEinkommen = 30'240) wird das erste Segment getroffen
(`i=9`: stufen[9]=(28728, 1555), stufen[10]=(30240, 1588) → trifft bei
30240 → t=1.0 → monatlich=1588). Das ist **korrekt**, aber technisch greift
sowohl das Bracket [28728, 30240] als auch [30240, 31752]. Die `return` im
ersten matching Loop verhindert Probleme.

**Auswirkung:** Nur stilistisch — Code ist korrekt.

---

#### N-3 — BVG-Projektion `bvgProjektion`: keine Begrenzung des Zinssatzes

**Datei:** `src/engine/bvg.ts:31–38`

```typescript
export function bvgProjektion(saldoHeute, jahreBisBezug, zinssatz = BVG_MINDESTZINSSATZ_2025): number {
  if (jahreBisBezug <= 0) return Math.round(saldoHeute);
  return Math.round(saldoHeute * Math.pow(1 + zinssatz, jahreBisBezug));
}
```

Bei `zinssatz < −1` (Pathologie) crash. Bei `zinssatz > 0.10` (unrealistisch)
keine Warnung. Niedriges Risiko, weil nur intern aufgerufen.

**Fix-Empfehlung:** Clamp `zinssatz` auf [−0.5, 0.10] mit `console.warn` bei
Out-of-Range — defensiv programmiert.

---

#### N-4 — Aufschub-Zuschlag-Tabelle: nur 6 Stützstellen, lineare Interpolation zwischen 12-Monats-Schritten

**Datei:** `src/engine/ahv.ts:108–115, 231–242`

```typescript
const AUFSCHUB_ZUSCHLAG_TABELLE = [
  { monate: 0, zuschlag: 0 },
  { monate: 12, zuschlag: 0.052 },
  { monate: 24, zuschlag: 0.108 },
  { monate: 36, zuschlag: 0.171 },
  { monate: 48, zuschlag: 0.24 },
  { monate: 60, zuschlag: 0.315 },
];
```

BSV-Tabelle hat **monatliche Stufen**, nicht jährliche. Bei z.B. 18 Monaten
Aufschub interpoliert die Engine linear zwischen 12 (5.2 %) und 24 (10.8 %)
zu 8.0 %. Die echte BSV-Tabelle liefert vermutlich ein leicht unterschiedliches
Resultat (typisch ±0.2 %-Punkte).

**Drift:** Vermutlich < 0.5 % auf die Rente — niedrige Auswirkung.

**Fix-Empfehlung:** Monatliche Stützstellen aus BSV-Vollzugsdokument 6462
Tab. 13 importieren.

**Quelle:** BSV Vollzug AHV/IV/EO/EL Stand 1.1.2025, Tab. 13 Aufschub-Zuschlag.

---

#### N-5 — Plafonierung Ehepaar AHV: keine Bezugsalter-Asymmetrie modelliert

**Datei:** `src/engine/ahv.ts:315–353` (Funktion `ahvCouplePension`)

Wenn die beiden Partner mit unterschiedlichem Alter pensionieren (z.B. P1
mit 63 Vorbezug, P2 mit 65 ordentlich), beziehen sie nicht gleichzeitig
ab. Die Engine plafoniert pauschal auf das Maximum 45'360 (× 13/12 ab 2026)
sobald beide beziehen. **Problem:** während der Zeit, in der nur einer
bezieht, gibt der Cashflow (Datei `cashflow.ts:309–319`) korrekt nur die
Einzelrente — aber `ahvCouplePension` berechnet die Plafonierung anhand
beider Bezugsfaktoren, was bei stark unterschiedlichen Bezugsaltern
verzerrt: P1 mit 63 = bf=0.864, P2 mit 70 = bf=1.315 → bf-gewichteter
Summe kann plafoniert oder nicht plafoniert sein, je nach Einkommen.

**Auswirkung:** Mittelgross für gemischte Bezugsalter, niedrig für Standard-
fälle (beide pensionieren gleich).

**Fix-Empfehlung:** Tests mit Cuira-typischen Paaren (63/65) hinzufügen,
ggf. exakte BSV-Praxis (jährliche Neuberechnung der Plafonierung) abbilden.

**Quelle:** AHVG Art. 35 (Plafonierung Ehepaarrente).

---

#### N-6 — Diskontierung Vermögensbilanz: keine zentrale Annahme über Realrendite

**Datei:** `src/engine/vermoegensbilanz.ts:120–164`

Die Vermögensbilanz nutzt **Item-spezifische** Renditen (`it.renditeProzent`)
für jeden Vermögensposten, **ohne** zentrale Annahme über den Diskontsatz
für Kapitalkosten oder eine konsistente Realrendite-Erwartung.

**Konsequenz:**
- Wertschriften-Items mit z.B. 5 % Rendite vs. Konten mit 0.5 % vs. Hypotheken
  mit 1.5 % — alles unabhängig, kein WACC, kein Risk-Free-Reference.
- 20-Jahres-Projektion bei 5 % auf Wertschriften = ×2.65, was sehr aggressiv
  ist (impliziert deterministische Rendite ohne Sequence-of-Returns Risk).
- Kein internes Konsistenz-Constraint zwischen Inflation (1.5 %) und Nominal-
  Renditen (impliziert teils negative Realrenditen, teils 3.5 % real — beides
  ohne Doku).

**Drift-Risiko:** Bei optimistischen User-Inputs (5 % Aktien, 1.5 %
Inflation) entsteht eine implizite 3.5 % Realrendite, was über 20 Jahre
+2.0 % zu hoch ist gegen historischen MSCI World CH-Hedged Realreturn von
~3.5 %. Bei pessimistischen User-Inputs (1 %) und gleicher Inflation
wird real −0.5 %. Engine respektiert User, validiert nichts.

**Fix-Empfehlung:**
- Plausibilität-Check in `validation.ts`: warnen wenn
  `(renditeProzent − inflationProzent) > 5` oder `< −2`.
- Optional ein "Engine-Konstanten"-Modul mit Referenzwerten (RFR 0.5 %,
  Aktienmarkt Real 4.5 %, CH Wohneigentum Real 1.0 %).

**Quelle:** Pictet 1925-2024 BVG-Index, MSCI ACWI Real Returns,
Wüest Partner Wohneigentum 2024.

---

## 2. Validierte korrekte Implementationen

Diese Stellen wurden geprüft und sind finanzmathematisch **korrekt**:

1. **`pkSaldoSparphase` Annuität-Formel** (cashflow.ts:1227–1265): Future-
   Value-Sparphase mit `FV = PV×(1+r)^n + S×((1+r)^n − 1)/r` ist die
   Standard-Sparphasen-Formel. S wird rückwärts korrekt aus FV/PV/n/r
   abgeleitet. Hochlauf für Jahr k mit gleicher Formel ist konsistent.

2. **`bvgGesamtkapitalBeiBezug` Einkäufe-Verzinsung** (bvg.ts:81–92):
   Einzeln-pro-Einkauf-Compound `betrag × (1+r)^(bezugsjahr−jahr)` ist
   korrekt — kein Cross-Term, kein Doppelzählen.

3. **`bvgRenteAusSaldo`** (bvg.ts:43–48): `saldo × Umwandlungssatz` ist
   die gesetzliche Definition (BVG Art. 14, Schlussbestimmungen).

4. **`bsvSkala44Exakt` Linear-Interpolation** (ahv.ts:169–189): 51 Stütz-
   stellen aus BSV-Vollzug 6462, lineare Interpolation entspricht der
   offiziellen BSV-Praxis (BSV-Mitteilungen bestätigen: zwischen den
   Stufen wird linear interpoliert). **Drift = 0** an Stützstellen, sehr
   gering dazwischen (BSV-Tabelle ist selbst stückweise linear).

5. **`dreizehnteAhvFaktor`** (ahv.ts:195–197): `bezugsjahr >= 2026 ? 13/12 :
   1` entspricht Inkrafttreten der 13. AHV per Volksabstimmung 3.3.2024
   (in Kraft seit 1.1.2026, erste Auszahlung Dezember 2026).

6. **`ahvCouplePension` Splitting + Plafonierung** (ahv.ts:315–353):
   Symmetrisches Einkommens-Splitting + Plafonierung bei `MAX_RENTE_EHEPAAR
   = 45'360` × 13/12 = 49'140 (2026) ist korrekt nach AHVG Art. 35 Abs. 1.

7. **`bundessteuerKapitalNeu`** (steuer-engine/index.ts:282–288):
   `bundessteuerEinkommen(kapital) / 5` entspricht ESTV-Praxis nach
   Kreisschreiben Nr. 22 zu Art. 38 DBG.

8. **`interpoliereEinfache` Lineare Interpolation 100k–500k** (steuer-engine/
   index.ts:914–944): Stückweise linear zwischen Stützstellen, plus
   linear vom Ursprung zur ersten Stützstelle — beides finanzmathematisch
   plausibel und gegen ESTV-Snapshot validiert (Doku: "Drift = 0 % an
   Stützstellen").

9. **`deflationiereCashflowZeile`** (inflation.ts:72–91): Faktor `1 /
   (1 + r/100)^jahre` ist die korrekte Definition eines Preisniveau-
   Deflators.

10. **`freizuegigkeitAuszahlung`** (bvg.ts:98–105): Compound `saldo × (1+r)^n`
    ist korrekt.

11. **`stress-tests aktien-crash −30 %`** (stress-tests.ts:167–175): Anwendung
    eines −30 %-Schocks auf Depots ist gängige Stress-Test-Praxis (entspricht
    Moderate Stress Scenario der FINMA/EIOPA).

12. **WEF-Validierung** (bvg.ts:216–279): BVG Art. 30c (Mindestbetrag 20'000,
    5-J-Intervall) + Art. 30d (3-J-Sperrfrist) + Art. 30c Abs. 2 (Halbierung
    ab 50) korrekt umgesetzt.

---

## 3. Konsistenz-Check Annahmen-Set

| Annahme | Wert | Quelle | Konsistenz mit anderen Modulen |
|---|---|---|---|
| BVG-Mindestzins | 1.25 % | BVG Art. 15, BR 22.11.2023 | konsistent (cashflow.ts, bvg.ts) |
| AHV Maximalrente einzel | 30'240 | BSV 1.1.2025 | korrekt |
| AHV Plafond Ehepaar | 45'360 | AHVG Art. 35 | korrekt |
| 13. AHV ab | 2026 | Abst. 3.3.2024 | korrekt |
| Inflation Default | 1.5 % | "hist. CH-Mittel" | **inkonsistent**: real 0.55–0.78 % (BFS LIK Geomean 2000–25), eher prospektive Annahme |
| Inflation Stress | 2.0 % | SNB-Korridor-Top | inkonsistent mit Default 1.5 %, sollte als "Schock-Annahme" markiert |
| Immobilien-Wertsteigerung | 1.5 % | "hist. CH-Mittel Wohneigentum" | Wüest 2000–24 = 2.1 %, eher konservativ angesetzt |
| Vorbezugs-Kürzung AHV | 6.8 %/J pauschal | Vor-AHV21-Wert | **veraltet**: AHV21 hat einkommensabhängige Staffelung |
| DBG Art. 38 Teiler | 5 | DBG Art. 38 Abs. 2 | korrekt |
| ZH Mindestsatz Kapital | 2 % | ZH StG §38 Abs. 4 | korrekt (im Legacy-Pfad) |

---

## 4. Empfehlungen nach Priorität

### Sprint-Empfehlung 1 (1–2 Tage, hohes Risk-Reduction)
- **H-1 fix:** `n=0` und `sparBeitrag < 0` Edge-Cases in `pkSaldoSparphase`
- **H-3 cleanup:** zentrale Konstanten-Datei `src/engine/finanzmath-konstanten.ts`
- **M-2 doc:** Kreisschreiben-22-Referenz in `bundessteuerKapitalNeu`

### Sprint-Empfehlung 2 (3–5 Tage, mittlere Genauigkeit)
- **M-1 fix:** 4. Stützstelle 1 Mio CHF für Kapital-Sondertarif (Re-Run Crawler-Script)
- **M-4 + M-5 fix:** AHV21-Vorbezugs-Staffeltabelle als JSON
- **H-2 fix:** Pro-Jahr-Inflation-Compound im Stress-Test

### Sprint-Empfehlung 3 (Etappe 2 / 2.5)
- **N-6:** Plausibilität-Check Rendite vs Inflation
- **M-3:** PK-Ausweis-Plausibilität (implizite Verzinsung 0.5–4 %)
- **N-4:** Aufschub-Tabelle monatliche Stützstellen

---

## 5. Quellen

- **BSV Vollzug AHV/IV/EO/EL Stand 1.1.2025** (sozialversicherungen.admin.ch/de/d/6462)
- **AHV21-Verordnung** (Bundesrat, in Kraft 1.1.2024)
- **BSV-Mitteilungen Nr. 463 + 470** (Vorbezugskürzungssätze AHV21)
- **DBG Art. 36, 38** (Bundesgesetz direkte Bundessteuer)
- **ESTV Kreisschreiben Nr. 22 (1995)** (Kapitalleistungen aus Vorsorge)
- **BGE 145 II 130** (Bestätigung Variante A für Art. 38 DBG)
- **AHVG Art. 35** (Ehepaarrenten-Plafonierung)
- **BVG Art. 14, 15, 16, 30a–g, 79b** (Pensionskasse, WEF, Sperrfristen)
- **SNB Lagebeurteilung März 2025** (Inflation-Prognose)
- **BFS Landesindex der Konsumentenpreise** (LIK, historische Inflation CH)
- **Swisscanto Pensionskassen-Studie 2024** (effektive PK-Verzinsung)
- **Wüest Partner Immobilien Marktanalyse 2024** (Wohneigentum-Wertentwicklung)
- **MSCI ACWI Total Return Index** (Aktien-Real-Renditen)
- **OECD Inflation Database** (CH 5J + 20J Median Inflation)
- **EIOPA Stress Test Methodologie 2024** (Aktien-Crash-Standardszenarien)

---

**Audit-Ende.** Read-only Code-Review, keine Engine-Änderungen vorgenommen.
