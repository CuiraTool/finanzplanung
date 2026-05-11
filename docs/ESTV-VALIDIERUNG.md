# ESTV-Validierung — Cuira Steuer-Engine vs. ESTV-Tarifrechner

**Generiert:** 2026-05-11T14:02:30.592Z  
**Snapshot:** `src/engine/__validation__/estv-snapshot.json`  
**ESTV-API-Version:** 1.0.44  
**Profile gecrawlt:** 104 / 104  

## Zusammenfassung

- **Median |Δ|:** 0.0 %
- **Mittelwert |Δ|:** 2.0 %
- **Max |Δ|:** 76.2 %
- **Toleranz-Ziel:** ±5 % (Phase 1)

## Top 5 Kantone mit grösster Drift

| # | Kanton | Mittel \|Δ\| | Max \|Δ\| | Tendenz (signed) |
|---|--------|--------------|------------|------------------|
| 1 | VS | 33.4 % | 76.2 % | +33.4 % |
| 2 | GE | 7.5 % | 8.4 % | +7.5 % |
| 3 | SZ | 4.5 % | 10.6 % | +4.5 % |
| 4 | VD | 3.0 % | 3.6 % | +3.0 % |
| 5 | SO | 2.0 % | 2.4 % | -2.0 % |

## Drift pro Kanton (alle Einkommensstufen)

### AG (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 11'404 | 11'403 | 1 | +0.0 % | OK |
| 150'000 | 30'732 | 30'732 | 0 | +0.0 % | OK |
| 250'000 | 63'792 | 63'791 | 1 | +0.0 % | OK |
| 500'000 | 150'495 | 150'494 | 1 | +0.0 % | OK |

### AI (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 9'738 | 9'738 | 0 | +0.0 % | OK |
| 150'000 | 24'936 | 24'936 | 0 | +0.0 % | OK |
| 250'000 | 49'903 | 49'903 | 0 | +0.0 % | OK |
| 500'000 | 113'303 | 113'303 | 0 | +0.0 % | OK |

### AR (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 13'151 | 13'151 | 0 | +0.0 % | OK |
| 150'000 | 33'471 | 33'472 | -1 | -0.0 % | OK |
| 250'000 | 67'359 | 67'359 | 0 | +0.0 % | OK |
| 500'000 | 148'699 | 148'699 | 0 | +0.0 % | OK |

### BE (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 16'766 | 16'765 | 1 | +0.0 % | OK |
| 150'000 | 40'307 | 40'308 | -1 | -0.0 % | OK |
| 250'000 | 80'314 | 80'313 | 1 | +0.0 % | OK |
| 500'000 | 185'377 | 185'376 | 1 | +0.0 % | OK |

### BL (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 14'505 | 14'505 | 0 | +0.0 % | OK |
| 150'000 | 39'877 | 39'878 | -1 | -0.0 % | OK |
| 250'000 | 81'755 | 81'754 | 1 | +0.0 % | OK |
| 500'000 | 191'051 | 191'050 | 1 | +0.0 % | OK |

### BS (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 18'178 | 18'178 | 0 | +0.0 % | OK |
| 150'000 | 38'576 | 38'576 | 0 | +0.0 % | OK |
| 250'000 | 74'347 | 74'347 | 0 | +0.0 % | OK |
| 500'000 | 177'309 | 177'309 | 0 | +0.0 % | OK |

### FR (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 15'558 | 15'557 | 1 | +0.0 % | OK |
| 150'000 | 39'694 | 39'695 | -1 | -0.0 % | OK |
| 250'000 | 78'903 | 78'903 | 0 | +0.0 % | OK |
| 500'000 | 171'303 | 171'303 | 0 | +0.0 % | OK |

### GE (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 15'539 | 14'338 | 1'201 | +8.4 % | WARN |
| 150'000 | 40'770 | 37'879 | 2'891 | +7.6 % | WARN |
| 250'000 | 83'275 | 77'782 | 5'493 | +7.1 % | WARN |
| 500'000 | 197'831 | 185'280 | 12'551 | +6.8 % | WARN |

### GL (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 12'130 | 12'130 | 0 | +0.0 % | OK |
| 150'000 | 31'066 | 31'066 | 0 | +0.0 % | OK |
| 250'000 | 64'531 | 64'530 | 1 | +0.0 % | OK |
| 500'000 | 155'102 | 155'102 | 0 | +0.0 % | OK |

### GR (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 11'908 | 11'908 | 0 | +0.0 % | OK |
| 150'000 | 31'437 | 31'438 | -1 | -0.0 % | OK |
| 250'000 | 64'082 | 64'082 | 0 | +0.0 % | OK |
| 500'000 | 148'471 | 148'470 | 1 | +0.0 % | OK |

### JU (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 15'141 | 15'141 | 0 | +0.0 % | OK |
| 150'000 | 38'927 | 38'928 | -1 | -0.0 % | OK |
| 250'000 | 78'247 | 78'246 | 1 | +0.0 % | OK |
| 500'000 | 179'991 | 179'991 | 0 | +0.0 % | OK |

### LU (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 10'538 | 10'588 | -50 | -0.5 % | OK |
| 150'000 | 26'674 | 26'724 | -50 | -0.2 % | OK |
| 250'000 | 55'473 | 55'523 | -50 | -0.1 % | OK |
| 500'000 | 130'523 | 130'573 | -50 | -0.0 % | OK |

### NE (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 16'597 | 16'597 | 0 | +0.0 % | OK |
| 150'000 | 41'857 | 41'857 | 0 | +0.0 % | OK |
| 250'000 | 82'149 | 82'149 | 0 | +0.0 % | OK |
| 500'000 | 179'604 | 179'604 | 0 | +0.0 % | OK |

### NW (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 10'589 | 10'500 | 89 | +0.8 % | OK |
| 150'000 | 27'271 | 27'130 | 141 | +0.5 % | OK |
| 250'000 | 53'620 | 53'633 | -13 | -0.0 % | OK |
| 500'000 | 120'720 | 120'733 | -13 | -0.0 % | OK |

### OW (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 11'617 | 11'616 | 1 | +0.0 % | OK |
| 150'000 | 26'273 | 26'273 | 0 | +0.0 % | OK |
| 250'000 | 51'498 | 51'498 | 0 | +0.0 % | OK |
| 500'000 | 116'493 | 116'493 | 0 | +0.0 % | OK |

### SG (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 13'967 | 13'966 | 1 | +0.0 % | OK |
| 150'000 | 35'564 | 35'565 | -1 | -0.0 % | OK |
| 250'000 | 70'834 | 70'834 | 0 | +0.0 % | OK |
| 500'000 | 155'788 | 155'788 | 0 | +0.0 % | OK |

### SH (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 10'592 | 10'652 | -60 | -0.6 % | OK |
| 150'000 | 28'676 | 28'737 | -61 | -0.2 % | OK |
| 250'000 | 58'851 | 58'911 | -60 | -0.1 % | OK |
| 500'000 | 131'204 | 131'264 | -60 | -0.0 % | OK |

### SO (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 14'488 | 14'849 | -361 | -2.4 % | OK |
| 150'000 | 36'725 | 37'478 | -753 | -2.0 % | OK |
| 250'000 | 73'418 | 74'745 | -1'327 | -1.8 % | OK |
| 500'000 | 163'280 | 165'955 | -2'675 | -1.6 % | OK |

### SZ (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 8'628 | 8'425 | 203 | +2.4 % | OK |
| 150'000 | 22'106 | 21'904 | 202 | +0.9 % | OK |
| 250'000 | 47'381 | 45'446 | 1'935 | +4.3 % | OK |
| 500'000 | 123'752 | 111'940 | 11'812 | +10.6 % | DRIFT |

### TG (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 12'194 | 12'194 | 0 | +0.0 % | OK |
| 150'000 | 31'118 | 31'118 | 0 | +0.0 % | OK |
| 250'000 | 63'680 | 63'679 | 1 | +0.0 % | OK |
| 500'000 | 147'280 | 147'279 | 1 | +0.0 % | OK |

### TI (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 13'747 | 13'744 | 3 | +0.0 % | OK |
| 150'000 | 36'524 | 36'519 | 5 | +0.0 % | OK |
| 250'000 | 74'608 | 74'601 | 7 | +0.0 % | OK |
| 500'000 | 175'259 | 175'252 | 7 | +0.0 % | OK |

### UR (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 12'454 | 12'524 | -70 | -0.6 % | OK |
| 150'000 | 27'843 | 27'914 | -71 | -0.3 % | OK |
| 250'000 | 54'116 | 54'186 | -70 | -0.1 % | OK |
| 500'000 | 121'728 | 121'798 | -70 | -0.1 % | OK |

### VD (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 16'299 | 15'803 | 496 | +3.1 % | OK |
| 150'000 | 42'018 | 40'858 | 1'160 | +2.8 % | OK |
| 250'000 | 86'820 | 84'585 | 2'235 | +2.6 % | OK |
| 500'000 | 209'750 | 202'503 | 7'247 | +3.6 % | OK |

### VS (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 23'218 | 13'178 | 10'040 | +76.2 % | DRIFT |
| 150'000 | 50'388 | 39'447 | 10'941 | +27.7 % | DRIFT |
| 250'000 | 93'003 | 79'187 | 13'816 | +17.4 % | DRIFT |
| 500'000 | 199'503 | 177'527 | 21'976 | +12.4 % | DRIFT |

### ZG (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 6'488 | 6'488 | 0 | +0.0 % | OK |
| 150'000 | 20'510 | 20'511 | -1 | -0.0 % | OK |
| 250'000 | 43'338 | 43'338 | 0 | +0.0 % | OK |
| 500'000 | 102'338 | 102'338 | 0 | +0.0 % | OK |

### ZH (Hauptort)

| Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |
|-----------|------:|-----:|------:|----:|:---------:|
| 80'000 | 10'730 | 10'754 | -24 | -0.2 % | OK |
| 150'000 | 30'883 | 30'908 | -25 | -0.1 % | OK |
| 250'000 | 67'976 | 68'000 | -24 | -0.0 % | OK |
| 500'000 | 170'169 | 170'193 | -24 | -0.0 % | OK |

## Empfehlungen

- **VS** mit Drift 33.4 % (max 76 % bei 80k!): VS verwendet im 2026-Tarif `tableType: FREIBURG` mit `group: "ALLE"` und `splitting: 0`. Das bedeutet: derselbe Tarif für Single und Paar, ohne Splitting-Reduktion. Der ESTV-Rechner liefert für 80k Single CHF 13'178, Cuira CHF 23'218 — Cuira rechnet ~76 % zu hoch. Hypothese: VS hat in der Realität separate Splittingfaktoren für Verheiratete (Familienbesteuerung Art. 32 StG-VS), die im aktuellen Tarif-JSON fehlen oder ein splitting-Wert nötig ist. → Tarif-JSON für VS-2026 re-validieren mit kantonaler Wegleitung; ggf. eigenen FREIBURG-Pfad mit Familienquotient.
- **GE** (mittel 7.5 %): konsistent 6-8 % zu hoch über alle Stufen → systematischer Bias. Wahrscheinlich Genève-spezifischer "Bouclier fiscal" (Steuerschild) oder "Rabais d'impôt" (degressiver Abzug nach Art. 35 LIPP) noch nicht modelliert.
- **SZ-500000** (Drift +10.6 %): nur Spitzentarif betroffen, andere Stufen <5 %. Top-Tariftabelle bei SZ wahrscheinlich linearer als ESTV-Tabelle — auf höchste Stufenbreite prüfen.
- **Sondertarif-Teiler/Mindestsatz**: aktuell nicht im Phase-1-Scope (alle Profile haben kapAuszahlungenJahr=0). Phase 3 (Kapitalauszahlung) wird das addressieren.
- **23 von 26 Kantonen** sitzen <5 % Drift, 17 davon <0.5 %. Engine ist insgesamt sehr sauber kalibriert — Fokus auf VS/GE/SZ-Spitze.

## Methodik

ESTV-Tarifrechner-Profile werden via `API_calculateSimpleTaxes` (öffentliche JSON-API von swisstaxcalculator.estv.admin.ch) gecrawlt. Cuira-Engine wird mit identischem `TaxableIncome` und `TaxableFortune` aufgerufen — Abzüge sind schon vor dem Engine-Aufruf weg, sodass nur die Tarif-/Steuerfuss-Logik verglichen wird. Δ % ist signed (Cuira − ESTV) / ESTV.

Quelle: https://swisstaxcalculator.estv.admin.ch/#/home/incomewealthtax  
Crawler:  `scripts/estv-crawl.ts` (Rate-Limit 1.5 s, Resume-fähig)  
Report-Generator:  `scripts/estv-report.ts`  
Profile-Definition:  `src/engine/__validation__/estv-profile.ts`
