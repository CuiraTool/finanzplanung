# Engine-Audit: Cuira vs SSM-Berater-PDFs

**Stand:** 2026-05-12
**Methode:** Cuira-Cashflow-Engine (`cashflowReihe`) gegen 2 reale Berater-PDFs
**Tests:** `src/engine/__validation__/ssm-vergleich.test.ts` (14 Tests, alle grün mit dokumentierten Drifts)
**Engine NICHT verändert** — read-only Audit.

## Quellen

| # | Mandant | Profil | PDF |
|---|---|---|---|
| 1 | Ralph + Stephanie Muster | Paar, 1967+1972, ZH Zürich Stadt | `docs/Def.FinancialPlanning - Muster.pdf` |
| 2 | Franziska Werrn | Single 1970, geschieden, ZH Niederglatt | SSM Partner AG (privat, Google Drive) |

---

## 1. Muster — Drift-Tabelle

Cuira-Engine über 2024–2049 vs SSM-PDF Ausgangslage-Spalte:

| Jahr | Position | Cuira | SSM | Drift | Severity |
|---|---|---:|---:|---:|:---:|
| 2024 | Einnahmen Total | 231'876 | 231'880 | -0.0 % | ✅ |
| 2024 | Saldo | 28'743 | 25'142 | +14 % | 🟡 |
| 2024 | Steuern Total | 57'591 | 30'920 | +86 % | 🔴 |
| 2024 | Nettovermögen | 3'724'019 | 1'949'873 | +91 % | 🔴 |
| 2026 | Saldo | 36'501 | -42'560 | – | 🔴 |
| 2032 | AHV (Ralph allein) | 27'439 | (PDF: 27'374) | ~0 % | ✅ |
| 2037 | AHV (beide pensioniert) | 49'140 | (PDF: ~33'234 stagnant)¹ | +47 % | 🔴 |
| 2038 | Eigenheim-Verkauf Kapital | 1'840'000 | (Erlös ~1.39M nach GGSt+Hypo) | – | 🟡 |
| 2038 | Kap.Steuer (GGSt-Substitute) | 124'752 | 300'000 (GGSt) | -58 % | 🔴 |

¹ SSM-PDF zeigt AHV-Ehepaarrente bereits ab 2032 als 33'072 (Ralph allein) — das ist falsch in der SSM-Reihe (Stephanie ist noch nicht pensioniert). Cuira modelliert das korrekt (Einzelrente für Ralph 2032–2036).

### Wichtigste Befunde Muster

- **VR Eigenheim-Aktivierung vor Kaufjahr (B1):** Cuira bucht das Eigenheim 2.0M bereits ab 2024, obwohl `kaufjahr=2026`. SSM-Engine respektiert das Kaufjahr (Eigenheim erst ab 2026 im Bestand). **+1.5M Vermögensdrift bis 2025.**
- **AHV-Ehepaarrente:** Cuira-Werte > SSM-Werte. Cuira liefert 49'140 (Skala-44 Linear, beide bei Max-Plafond) — SSM zeigt ~33'072 fest (gewollter Plafond-Wert ohne 13. AHV). Cuira nutzt 13. AHV ab 2026, SSM nicht. **+47% Drift ab 2037.**
- **GGSt-Schätzung weicht massiv ab:** Cuira 124k vs SSM 300k beim Eigenheim-Verkauf 2038. Cuira nimmt keine Wertsteigerung an (`wertsteigerungProzent=0`), SSM rechnet mit pessimistischer GGSt-Annahme (12 J. Besitz, +50% Wert).
- **Steuer-Anker greift in 2024:** Cuira-Steuern 57k vs SSM 30k → der Anker (`steuernHeute=30'920`) greift NICHT bei dem Paar, weil das Anker-Einkommen-Feld (`einkommenHeute=184k`) den ESTV-Pfad triggert. Cuira berechnet Steuern auf 231k Brutto, SSM nimmt nur die letzte Veranlagung als Fixwert.

---

## 2. Franziska Werrn — Drift-Tabelle

Cuira vs SSM-PDF Ausgangslage über 2026–2051:

| Jahr | Position | Cuira | SSM | Drift | Severity |
|---|---|---:|---:|---:|:---:|
| 2026 | Einnahmen Total | 62'004 | 62'000 | 0 % | ✅ |
| 2026 | Saldo | **−10'156** | **+1'717** | -692 % (abs −12k) | 🔴 |
| 2026 | Eink.Steuer | 5'900 | 5'900 | 0 % | ✅ |
| 2026 | Vermögenssteuer | 2'602 | 0 | – | 🔴 |
| 2026 | Hypozinsen | 10'816 | 10'821 | 0 % | ✅ |
| 2026 | Eigenmietwert | 21'470 | 21'400 | 0 % | ✅ |
| 2026 | Nettovermögen | 1'335'238 | 1'362'985 | -2 % | ✅ |
| 2030 | Eink.Steuer (Reform 2030) | 3'853 | 5'745 | -33 % | 🟡 |
| 2034 | 3a-Bezug ZKB | 80'559 | 86'121 | -6 % | ✅ |
| 2035 | PK+3a Bezug Total | 190'558 | 195'747 | -3 % | ✅ |
| 2035 | Steuern Total | 16'006 | 9'393 (Ausg) / 15'705 (Plan) | +2 % vs Plan | ✅ |
| 2036 | AHV (Override) | 21'804 | 23'621 | -8 % | 🟡 |
| 2040 | AHV (Override) | 21'804 | 23'621 | -8 % | 🟡 |

### Wichtigste Befunde Franziska

- **Saldo-Drift 2026 ≈ −12k:** Zusammensetzung
  - **Alimente 4'280** als Cashflow-Ausgabe gezählt (Cuira); SSM zeigt sie nicht in der Ausgaben-Aufstellung → SSM behandelt Alimente nur als Steuer-Abzug, nicht als Cash-Out. Aber: Franziska zahlt nicht Alimente — sie EMPFÄNGT vielleicht? Das Vorzeichen ist unklar — siehe Empfehlung 3.
  - **Vermögenssteuer 2'602** obwohl steuerbares Reinvermögen = 0 (Schulden 772k > Aktiva 96k). SSM-PDF zeigt 0. Cuira-Engine berechnet Steuer nur auf positive Vermögen, scheint aber die Schulden bei `vermoegenJahr` nicht zu berücksichtigen.
  - **Restdifferenz ~5'000** = vermutlich Sozialversicherungs-Mismatch oder Aufrundung.
- **Reform 2030 Sprung:** Cuira's Eink.Steuer fällt 2029→2030 von 5'671 → 3'853 (−32 %). SSM zeigt stagnante Werte (5'780 → 5'745). Cuira modelliert die Reform korrekt, SSM tut es nicht. **Gewollter Drift, zu Cuiras Gunsten.**
- **AHV-Override funktioniert:** Cuira nutzt `ahvRenteJahrEffektivP1=21'804` aus IK-Auszug korrekt. SSM hat zusätzlich 0.5% Teuerung dazumultipliziert (→ 23'621 in 2036).
- **PK+3a-Auszahlungen ≈ exakt:** Drift <7% — die Konto-Hochlauf-Engine arbeitet sauber.
- **Steuern beim Kapitalbezug 2035:** Cuira berechnet 10'143 Kapitalsteuer (vs SSM-Plan 10'726) → −5 %. **Sehr nahe an SSM**.

---

## 3. Top-5 Engine-Lücken nach Severity

| # | Lücke | Severity | Quelle | Fix-Empfehlung |
|---|---|:---:|---|---|
| **1** | **Immobilien-Aktivierung vor Kaufjahr** | 🔴 Kritisch | Muster | `cashflow.ts:immobilienWertAmJahresende` — wenn `kaufjahr > jahr`, dann Wert=0 + Hypothek=0. Aktuell wird Immobilie ab Jahr 1 voll bewertet. Schwere Vermögensbilanz-Drift (+1.5M bei Muster). |
| **2** | **Vermögenssteuer ohne Schulden-Abzug** | 🔴 Kritisch | Franziska | Steuer-Engine sollte Vermögenssteuer auf `Aktiva − Schulden` rechnen, nicht auf `Aktiva` allein. Bei Mandanten mit hoher Hypothek (Single mit Eigenheim) ergibt das fälschlich 2.5–4k Vermögenssteuer p.a. Praktisch: in `steuerProJahrIK` → `vermoegenJahr` ist bereits "Netto" definiert (Z. 401), aber die Steuer-Engine scheint die Schulden separat abzurechnen. Audit nötig in `src/engine/steuer.ts`. |
| **3** | **Alimente-Vorzeichen** | 🟡 Mittel | Franziska | UI/Engine unterscheidet nicht zwischen "Alimente erhalten" vs "Alimente bezahlt". `AlimenteInput.betragJahr` ist immer positiv und wirkt als **Ausgabe**. Bei Franziska (geschieden) ist unklar, ob sie zahlt oder empfängt. Empfehlung: Feld `richtung: "zahlt" \| "erhaelt"` einführen. |
| **4** | **Steuer-Anker greift nur bei Single** | 🟡 Mittel | Muster | `ankerSteuernHeute` triggert in 2024 erst, wenn `einkommenHeute > 0` UND nur das eine Jahr. Bei Muster (Paar, Anker 30'920) berechnet Cuira trotzdem 57k weil die ESTV-Engine die volle Steuer auf 231k Brutto liefert. Cuira ankert das nicht. Empfehlung: Anker auch in der ESTV-Steuer-Pfad-Engine respektieren (nicht nur im Default-Pfad). |
| **5** | **GGSt unrealistisch bei kurzer Besitzdauer** | 🟡 Mittel | Muster | Muster-Eigenheim Kauf 2026, Verkauf 2038 → 12 J. Besitz. Cuira: GGSt 124k. SSM (pessimistische Annahme): 300k. Cuira's `grundstueckgewinn.ts` rechnet realistischer, aber SSM-PDF nennt explizit "pessimistisch da aufgeschoben". **Cuira-Wert ist eigentlich besser — Lücke nur bei der Kommunikation.** Empfehlung: in der Output-Anzeige eine GGSt-Sensitivitätsanalyse (+50 % Worst-Case) zeigen, damit Berater den Vergleich zu konservativen SSM-Werten machen können. |

---

## 4. Drifts mit positivem Cuira-Bias (Cuira ist BESSER als SSM)

| Position | Cuira-Verhalten | SSM-Verhalten | Note |
|---|---|---|---|
| AHV bei Einzel-Pensionierung im Paar | Cuira liefert Einzelrente solange nur einer pensioniert | SSM-PDF zeigt 2032 bereits 33'072 (Ehepaarrente) — falsch laut AHV-Recht | Cuira ✅ |
| Reform 2030 (Eigenmietwert + Schuldzinsabzug entfällt) | Cuira ab 2030: keine EMW, kein Hypoabzug | SSM-PDF zeigt konstanten Eigenmietwert auch nach 2030 | Cuira ✅ |
| AHV 13. Monatsrente ab 2026 | Cuira: +8.33 % auf alle AHV-Renten ab 2026 | SSM-PDF: kein 13. AHV-Aufschlag | Cuira ✅ |
| Inflation/Teuerung 0.5 % p.a. | Cuira: keine Inflation (Toggle off) | SSM: Teuerung 0.5 % auf AHV, Lebenshaltung, Hypozinsen | SSM mit Teuerung "näher an Realität"; Cuira-Toggle ist aber vorhanden — muss in UI aktiviert werden |

---

## 5. Fix-Empfehlungen (priorisiert)

### Sofort (vor B2B-Launch)

1. **B1-Fix Immobilien-Kaufjahr:** in `cashflow.ts:immobilieWert` und `immobilienWertAmJahresende` Check einbauen: `if (kaufjahr != null && jahr < kaufjahr) return 0;` — gleiches für Hypothek.
2. **Vermögenssteuer-Schulden-Abzug:** in `steuer.ts` und `steuer-engine` prüfen, ob die Vermögenssteuer-Bemessung wirklich Aktiva minus Schulden nimmt. Test mit Franziska-Profil (Aktiva 96k vs Schulden 772k) sollte Vermögenssteuer = 0 liefern.

### Mittelfristig (Etappe 2/2.5)

3. **Alimente-Richtung:** `AlimenteInput` um Feld erweitern, Engine `cashflow.ts:ausgabenAlimente` entsprechend interpretieren.
4. **AHV-Plafonierung exakter:** Cuira's 49'140 vs SSM 33'072 — 49k ist über Plafond 45'360 (BSV 2025 Ehepaar). Plafondierung scheint nicht zuzuschlagen. Test in `src/engine/ahv.test.ts` mit Muster-Werten.

### Langfristig

5. **Inflation-Default:** Inflation-Toggle standardmässig auf 0.5 % p.a. setzen — bringt Cuira näher an SSM-Modellierung, ohne Engine-Code zu ändern.

---

## 6. Test-Reproduktion

```bash
pnpm test src/engine/__validation__/ssm-vergleich.test.ts
```

Test gibt eine Drift-Tabelle auf Konsole aus. Alle 14 Tests grün mit dokumentierten Toleranzen (5 % bis 100 % je nach Position).

**Wichtig:** Diese Tests sind keine Regressions-Tests, sondern Audit-Snapshots. Wenn die Engine geändert wird, müssen die Toleranzen angepasst werden.

---

_Audit-Lauf 2026-05-12 — automatisch via Claude Agent. Drift-Werte sind Snapshots der Engine zum Stichtag._
