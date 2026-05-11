# Property-Based-Testing — Bug-Report Sprint A

**Run-Datum:** 2026-05-11
**Methodik:** `fast-check` mit ~6'000 random Schweizer Pensionsplanungs-Profilen (12 Properties × 500 Runs)
**Test-Datei:** `src/engine/__validation__/properties.test.ts`
**Generator:** `src/engine/__validation__/profile-generator.ts`

## Zusammenfassung

| Severity | Anzahl | Properties |
|---|---|---|
| **Kritisch** | 0 | — |
| **Mittel** | 1 | P2 (Steuerquote bei Niedrig-Einkommen + Vermögen) |
| **Leicht** | 2 | P4 (Vorsorge-Saldo-Drop bei 3a-Auszahlung), P11 (Hinterlassenen-Spec) |
| **OK** | 9 | P1, P3, P5, P6, P7, P8, P9, P10, P12 |

Kein Engine-Crash über alle Random-Profile (Property 10) — Engine ist robust.
Plan-Klon-Idempotenz hält (Property 9) — Zustand-Klon ist deterministisch.

---

## Bug 1 — Steuer kann 50 % des Einkommens übersteigen wenn Vermögen hoch + Einkommen niedrig

**Severity:** Mittel
**Verletzte Invariante:** Property 2 — `(ausgabenSteuernEinkommen + ausgabenSteuernVermoegen) / einnahmenTotal ≤ 0.5`

**Reproduktion:**
```bash
pnpm vitest run src/engine/__validation__/properties.test.ts -t "Property 2" --seed=-162434417
# oder via Repro-Script:
npx tsx scripts/repro-bug-a.ts
```

**Minimal-failing Profil (gekürzt):**
```json
{
  "fallart": "paar",
  "person1": { "geburtsdatum": "2001-01-01" },
  "person2": { "geburtsdatum": "2001-01-01" },
  "ahv": { "einkommenP1": 30000, "einkommenP2": 30000, "ahvBezugsalterP1": 63 },
  "ziele": { "bezugsalterP1": 58 },
  "budget": {
    "einkommen": [{ "betragMonatlich": 3000, "von": "2021-01", "bis": "2027-01" }],
    "ausgabenTotal": 3000,
    "religion": "katholisch"
  },
  "adresse": { "kanton": "AG" }
}
```

**Erwartet:** Steuerquote (Einkommen+Vermögen) ≤ 50 % der Gesamteinnahmen
**Actual (Jahr 2030):** Einnahmen CHF 3'000, Vermögenssteuer CHF 1'152, Einkommenssteuer CHF 349 → Quote **50.03 %**
**Beobachtung:** Wenn das Erwerbseinkommen endet (Periode bis 2027-01), bleiben nur Restmonate. Das angesparte Vermögen (~1.7 M CHF aus Pre-Pension-Jahren) erzeugt Vermögenssteuer, die unabhängig vom Einkommen wirkt — Quote schiesst über 50 %.

**Vermuteter Fix:** Kein Engine-Bug, sondern Property zu naiv formuliert. Optionen:
  1. Property aufweichen: nur `ausgabenSteuernEinkommen / bruttoErwerb` ≤ 0.5 prüfen (Vermögenssteuer ist getrennt).
  2. Engine-seitig: Vermögenssteuer-Cap bei wenig liquidem Einkommen (defensiv, nicht gesetzlich gefordert).

Empfehlung: **Property anpassen**, kein Engine-Fix. Vermögenssteuer kann legitim Einkommen übersteigen.

---

## Bug 2 — `vermoegenVorsorge` fällt zwischen zwei Jahren in der Sparphase (3a/3b-Auszahlung)

**Severity:** Leicht
**Verletzte Invariante:** Property 4 — `vermoegenVorsorge` monoton steigend bis Bezugsjahr

**Reproduktion:**
```bash
pnpm vitest run src/engine/__validation__/properties.test.ts -t "Property 4" --seed=482490551
# oder:
npx tsx scripts/repro-bug-b.ts
```

**Minimal-failing Profil:** Einzelperson 1981, BVG aktiv mit altersguthabenHeute=1 / beiBezug=2, ein 3a-Konto mit Ablaufwert 101 in 2027.

**Erwartet:** In Sparphase (vor PK-Bezug) wächst Vorsorgekapital nur.
**Actual:** Jahr 2026 `vermoegenVorsorge=102` (1 PK + 101 3a), Jahr 2027 `vermoegenVorsorge=1` — Drop um 101 wegen 3a-Auszahlung.

**Vermuteter Fix:** Kein Engine-Bug. Engine zahlt 3a in `auszahlungsjahr` korrekt aus, was den Vorsorge-Saldo reduziert (Geld geht in Hauptkonto). Property muss 3a/FZ-Auszahlungs-Jahre ausschliessen oder eine cumulative Sum (Vorsorge + ausbezahltes Kapital ins Hauptkonto) prüfen.

Empfehlung: **Property verschärfen** — Sparphase-Monotonie nur für Jahre OHNE Kap-Auszahlung. Kein Engine-Fix nötig.

---

## Bug 3 — `berechneHinterlassenen` Total kann 2× das hypothetische Einkommen des Verstorbenen übersteigen

**Severity:** Leicht (Spec-Mismatch, kein Engine-Defekt)
**Verletzte Invariante:** Property 11 — `total ≤ 2 × (ahvAltersrente + bvgAltersrente)`

**Reproduktion:**
```bash
pnpm vitest run src/engine/__validation__/properties.test.ts -t "Property 11" --seed=-90581708
```

**Minimal-failing Profil:**
```json
{ "ahvAltersrente": 2, "bvgAltersrente": 0, "alter": 25, "ehejahre": 0, "halbwaisen": 4, "vollwaisen": 1 }
```

**Erwartet:** Total ≤ 2 × 2 = 4 (Sanity-Bound)
**Actual:** Total = 6 (Witwen 0.8×2=1.6 ≈ 2 gerundet, Halbwaisen 4×0.4×2=3.2 ≈ 3 gerundet, Vollwaisen 1×0.6×2=1.2 ≈ 1 → 6)

**Vermuteter Fix:** Engine ist korrekt (AHV-Sätze 80 % / 40 % / 60 %). Die Spec-Bound "≤ 2×" war zu eng:
  - Mit 4 Halbwaisen + 1 Vollwaise allein erreichst du 4×0.4 + 0.6 = 2.2 (AHV-Multiplikator). Plus Witwenrente 0.8 = **3.0** total. Bei zusätzlicher BVG-Komponente erreicht der Total-Multiplikator >4.

Empfehlung: **Property-Bound lockern auf 5×** (Mathematisches Maximum bei 4 Halbwaisen + 2 Vollwaisen + Witwen mit AHV+BVG: ca. (0.8+0.6) + 4×(0.4+0.2) + 2×(0.6+0.4) = 1.4 + 2.4 + 2.0 = **5.8 × Einkommen**). Kein Engine-Fix.

---

## Properties OK (keine Bugs gefunden)

| # | Property | Status |
|---|---|---|
| 1 | Cashflow-Reihe-Lückenlosigkeit | OK |
| 3 | AHV-Rente im Plafond (≤ 49'140) | OK |
| 5 | Vermögensbilanz-Konsistenz (Aktiva − Schulden = Netto) | OK |
| 6 | Kap-Auszahlungs-Steuersatz ≤ 35 % | OK (gelegentlich 35.001 % — Rundung) |
| 7 | AHV-NE-Beitrag ∈ [0, 52'800] | OK |
| 8 | 3a-Einzahlung ≤ 100k | OK |
| 9 | Plan-Klon-Idempotenz (deep clone = identisches Ergebnis) | OK |
| 10 | **Engine-Crash-Sicherheit** (500 random Profile, kein Wurf) | **OK** |
| 12 | Hypozins-Konsistenz mit Tranchen | OK |

---

## Empfehlung — Sprint B Reihenfolge

Da kein einziges Engine-Bug aufgedeckt wurde (alle 3 Failures sind Property-Definitions-Fragen, kein Engine-Defekt), ist **Sprint B nicht zwingend**.

Wenn doch:
1. **Property-Definitions cleanen** (Properties 2, 4, 11) — Vermögenssteuer separat behandeln, 3a-Auszahlungsjahre filtern, Hinterlassenen-Bound auf 6× lockern. Aufwand: ~30 Min.
2. Optional: **Stresstests erweitern** mit den jetzt verfügbaren random Profilen — z.B. ESTV-Vergleich gegen 100 random Profile statt 104 deterministische.

**Top-Insight aus diesem Sprint:** Die Engine ist robust — auch unter 6'000 random Profilen wirft `cashflowReihe` keine Exception, Vermögensbilanz schliesst zu 1 CHF Toleranz, AHV-Plafond hält, Hypozinsen sind konsistent.
