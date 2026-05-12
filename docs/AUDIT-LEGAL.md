# AUDIT — Rechts-Konformität Cuira Pensionsplanungs-Tool

**Auditdatum:** 2026-05-12
**Auditgegenstand:** Cuira Finanzplanungstool, Branch `main`, Commit `34bb5a0`
**Aufgaben­stellung:** Read-only Prüfung gegen Schweizer Recht (AHVG, BVG, DBG, StHG, OR, DSG, FIDLEG, kantonale Steuergesetze, Reform-2030-Vorlage).
**Auditor:** Legal Advisor (Tech Law / CH Tax & Pension)

> **Wichtig.** Dies ist ein interner Audit-Befund für die Cuira Partners GmbH zur weiteren Beurteilung. Es ist eine technische und rechtliche Einschätzung, keine abschliessende Rechtsberatung. Insbesondere die Findings mit Severity **R-Risiko** sollten vor produktivem Berater-Einsatz mit einer im Schweizer Vorsorge- und Steuerrecht spezialisierten Anwältin/Anwalt validiert werden (z.B. Kantonale Bar Association, Treuhandkammer / EXPERTsuisse).

---

## Zusammenfassung der Findings

| Severity | Anzahl | Bedeutung |
|---|---|---|
| **R-Risiko** | 3 | rechtlich heikel — Tool könnte rechtswidrig oder irreführend wirken, Haftung möglich |
| **Empfehlung** | 8 | technisch korrekt, aber präzisierungs­bedürftig |
| **Hinweis** | 5 | rechtlich sauber, Doku-/Wording-Optimierung empfohlen |

Gesamtbeurteilung: **Tool ist für den Berater-Modus (B2B) freigabe­fähig, sofern die R-Risiko-Punkte (insbesondere R-1 Disclaimer-Wording und R-3 Datenschutz-Erklärung) adressiert werden.** Die fachliche Substanz der Engines (AHV-Skala 44, BVG-UWS, Hinterlassenen­leistungen, Kapital­auszahlungs­steuer, GGSt) ist solide und entspricht dem Stand der Rechtslage. Vereinfachungen sind dokumentiert.

---

## 1. R-Risiko — Findings mit Rechtsrisiko

### R-1 — Disclaimer Art. 100 OR: Formulierung zu eng, Geltungsbereich unklar

- **Datei:** `src/app/print/page.tsx`
- **Zeilen:** 1098–1108
- **Problem:**
  Der aktuelle Wortlaut "Haftung … für Schäden aus leichter Fahrlässigkeit ausgeschlossen" + Hinweis auf Art. 100 Abs. 1 OR ist technisch korrekt, **aber unvollständig**:
  1. **Art. 100 Abs. 2 OR** wird nicht erwähnt. Bei einer **obrigkeitlich konzessionierten** oder einer im Auftrag des Konzessionärs ausgeübten Tätigkeit (z.B. Berater mit BVG- oder FINMA-Bewilligungen) kann der Richter eine Wegbedingung auch für leichte Fahrlässigkeit als nichtig erklären. Cuira ist gemäss CLAUDE.md "kein FIDLEG-Anlageberater" — das Risiko ist daher gering, sollte aber explizit adressiert werden.
  2. Die Klausel adressiert **nur die Cuira Partners GmbH**, nicht aber die selbstständigen Cuira-Berater (Lizenz-Modell). Wenn ein Berater unter Cuira-Brand arbeitet aber rechtlich selbstständig ist, fehlt ihm der Haftungs­ausschluss.
  3. Es fehlt **eine Hilfspersonen-Klausel (Art. 101 Abs. 2 OR)** — gerade beim Einsatz von Subunternehmen (z.B. KI-Dienste, Hosting) wichtig.
- **Quelle:** OR Art. 100 (Wegbedingung der Haftung), Art. 101 (Haftung für Hilfspersonen), BGE 132 III 519 (Geltung Konzessionierte Tätigkeit).
- **Fix-Empfehlung:**

  ```
  Haftungsausschluss (Art. 100/101 OR). Soweit gesetzlich zulässig wird
  jede Haftung der Cuira Partners GmbH, ihrer Organe, Mitarbeitenden,
  selbstständigen Vertriebspartner sowie der von ihr eingesetzten
  Hilfspersonen (Art. 101 Abs. 2 OR) für leichte Fahrlässigkeit aus-
  geschlossen. Eine Haftung für Schäden aus rechtswidriger Absicht
  oder grober Fahrlässigkeit (Art. 100 Abs. 1 OR) bleibt unberührt.
  Soweit gestützt auf Art. 100 Abs. 2 OR ein vollständiger Aus-
  schluss als unzulässig erscheint, wird die Haftung auf den ein-
  fachen Schaden begrenzt, der bei sorgfältiger Berater-Tätigkeit
  vorhersehbar war.
  ```

  Zusätzlich: Klausel auf Lizenz-Partner ausdehnen oder im Cuira-Berater-Vertrag eine separate Haftungs­klausel verlangen.

---

### R-2 — Reform 2030 (Eigenmietwert): Inkrafttretedatum unsicher, Engine könnte zu früh "abschalten"

- **Datei:** `src/engine/steuer.ts`
- **Zeilen:** 106–114
- **Problem:**
  Tool verwendet `EIGENMIETWERT_LETZTES_JAHR = 2029`, d.h. ab Steuerjahr 2030 entfallen Eigenmietwert + Schuldzinsabzug automatisch.
  Rechtsstand 2026-05:
  - Volksabstimmung **28.09.2025 angenommen** (Bundesbeschluss zur Änderung der Bundesverfassung über die Abschaffung der Besteuerung des Eigenmietwerts). ✓
  - **ABER:** Es handelt sich um eine **Verfassungsbestimmung** + zwingend nachfolgendes Ausführungs­gesetz. Das Inkrafttreten ist nicht direkt 2030, sondern abhängig vom Inkrafttreten des Bundesgesetzes über die Besteuerung von Wohneigentum (Ausführungs­erlass).
  - Bundesrat hat in der Botschaft vom 17.06.2024 (BBl 2024 1700ff) **frühestens 2028, realistisch 2030–2032** als Inkrafttretens­fenster genannt. Die Wahl von "2030" als Cuira-Cutoff ist plausibel aber **nicht durch BBl gesichert**. Das Bundesgesetz wurde von den Räten noch nicht endgültig verabschiedet (referendums­fähig).
  - **Risiko:** Wenn das Inkrafttreten auf 2031 oder 2032 verschoben wird (sehr wahrscheinlich), schaltet Cuira die Eigenmietwert-Logik 1-2 Jahre zu früh ab → **strukturelle Unterschätzung der Steuerlast 2030/31**, mit ev. **Vermögens­auslegeordnung-Differenzen im 5-stelligen Bereich** über die Modell­laufzeit.
- **Quellen:**
  - Bundesbeschluss zur Änderung der BV vom 22.12.2023 (BBl 2024 92, 24.083)
  - Botschaft BR 17.06.2024 (BBl 2024 1700)
  - Volksabstimmung 28.09.2025 (Bundesblatt-Bestätigung der Annahme)
  - Stand der Beratung Ausführungsgesetz: nicht in Kraft per 05/2026
- **Fix-Empfehlung:**
  1. Konstante `EIGENMIETWERT_LETZTES_JAHR` **konfigurier­bar** machen (Default 2029, aber UI-Override im Berater-Mode).
  2. Disclaimer-Text in `src/app/print/page.tsx` Zeile 1077–1083 anpassen: "Reform 2030 (geplant, abhängig vom Inkrafttreten des Bundesgesetzes — voraussichtlich frühestens Steuerjahr 2030, ggf. später)."
  3. Plausibilitäts-Hinweis bei Wahl von Steuerjahr 2030+: "Annahme: Reform 2030 in Kraft. Falls noch nicht in Kraft, manuell zurücksetzen."

---

### R-3 — DSG-Konformität: Aufbewahrungsfrist und Auskunftsrecht unpräzise

- **Datei:** `src/app/print/page.tsx`
- **Zeilen:** 1109–1116
- **Problem:**
  Der Datenschutz-Disclaimer im PDF erwähnt:
  - "DSG, Stand 1.9.2023" ✓ (revDSG korrekt datiert)
  - "Server-Standort: Schweiz oder EU (Frankfurt)" ✓ (DSG-konform für EU als angemessenes Schutz­niveau gemäss FDPIC-Liste)
  - "Aufbewahrungsfrist: 10 Jahre (OR Art. 958f)" ⚠ **rechtlich nicht korrekt**

  Art. 958f OR regelt die Aufbewahrung der **Geschäfts­bücher** (Buchhaltungs­belege). Eine Pensions­planung im Cuira-Tool ist **kein Geschäfts­buch** im Sinne dieser Norm. Die korrekte rechtliche Grundlage:
  - **Auftrags­recht (Art. 394ff OR):** keine zwingende Aufbewahrungs­frist, aber Beweis­sicherung praxis­üblich 5–10 Jahre.
  - **revDSG Art. 6 Abs. 4:** Daten dürfen "nur so lange aufbewahrt werden, wie es für den Zweck erforderlich ist".
  - **GwG Art. 7:** wenn Vorsorge­planung in Kombination mit Vermögens­management → 10 Jahre nach Beendigung der Geschäfts­beziehung. Trifft hier wohl nicht zu (Cuira ist nicht Finanz­intermediär im GwG-Sinn).
- **Quellen:**
  - revDSG (SR 235.1, in Kraft seit 1.9.2023), Art. 5 lit. a, Art. 6 Abs. 4
  - VDSG (SR 235.11)
  - OR 394, 958f, 962
  - GwG Art. 7 (falls anwendbar)
- **Fix-Empfehlung:**
  ```
  Datenschutz. Die im Tool erfassten Personendaten werden gemäss
  revidiertem Bundesgesetz über den Datenschutz (revDSG, SR 235.1,
  in Kraft seit 1. September 2023) bearbeitet. Bearbeitungs-Zweck:
  Erstellung der Pensionsplanung im Auftrag des Mandanten.
  Server-Standort: Schweiz oder EU (Frankfurt) — kein US-Hosting
  von Personendaten. Aufbewahrung: solange das Mandat besteht
  zzgl. 5 Jahre für Beweis-Sicherung im Auftragsverhältnis
  (Art. 6 Abs. 4 revDSG i.V.m. Art. 127 OR). Berechtigung des
  Mandanten gemäss Art. 25 revDSG (Auskunft) und Art. 32
  (Berichtigung/Löschung); Anfragen an datenschutz@cuirapartners.ch.
  ```

  Zusätzlich: ein **Datenschutz-Hinweis im Wizard Block 1** (Personen-Erfassung) — explizite Information vor der Datenerfassung gemäss Art. 19 revDSG.

  **Compliance-Checkliste revDSG für SaaS-Tool:**
  - [ ] Verzeichnis Bearbeitungs­tätigkeiten gem. Art. 12 revDSG (intern)
  - [ ] Auftrags­verarbeiter-Vertrag (DPA) mit Supabase, Vercel, Netlify gem. Art. 9
  - [ ] Datenschutz­erklärung auf Website (Art. 19)
  - [ ] DSFA bei systematischer Hochrisiko-Bearbeitung (Art. 22)
  - [ ] Meldepflicht­prozess Datensicherheits­verletzungen (Art. 24)
  - [ ] Auskunfts­prozess (Art. 25): max 30 Tage Reaktion

---

## 2. Empfehlungen — Findings die zu Ungenauigkeit / Wording führen

### E-1 — AHV21: Reduzierte Vorbezugs­kürzungs­sätze für Frauen Jg 1961–63 nicht modelliert

- **Datei:** `src/engine/ahv.ts`
- **Zeilen:** 18–22, 70, 101–106
- **Problem:**
  Tool erkennt zwar Übergangs­jahrgang (`istAhv21Uebergangsjahrgang`), wendet aber für alle Personen einheitlich `VORBEZUG_KUERZUNG_PRO_JAHR = 0.068` (6.8 %) an. Frauen Jg 1961–63 haben gemäss AHV21 **reduzierte Kürzungs­sätze nach Einkommen** (BSV Skala AHV21-Übergang):
  - tiefes Einkommen (< CHF 60'780 mE): 0 % Kürzung (Übergangsschutz)
  - mittleres Einkommen: 2.5 %/Jahr Kürzung
  - hohes Einkommen: 4.5 %/Jahr Kürzung
  Code-Kommentar erkennt das ("hier nicht im Detail abgebildet, der User kriegt einen Hinweis im Wizard") — der Hinweis im Wizard war im Grep aber nicht auffindbar.
- **Quelle:** AHVG (SR 831.10) Art. 40 Abs. 4 (AHV21-Übergang), BSV Kreis­schreiben über Renten (KSR), Ziff. 6403–6405
- **Fix-Empfehlung:**
  - Kurzfristig: **expliziter Plausibilitäts-Hinweis** in `src/lib/plausibility.ts`, wenn `gj1 ∈ [1961, 1963]` und `gj1 === "w"` und Vorbezug gewählt: "AHV21-Übergangs­jahrgang — tatsächliche Vorbezugs­kürzung ist einkommens­abhängig reduziert (0–4.5 % statt 6.8 %). Override im Feld 'AHV-Jahresrente direkt' empfohlen."
  - Mittelfristig: **BSV-Tabelle AHV21-Vorbezug** als Lookup einbauen.

---

### E-2 — AHV-Splitting: Berechnung deckt die Realität nur ungenau ab

- **Datei:** `src/engine/ahv.ts`
- **Zeilen:** 308–353 (Funktion `ahvCouplePension`)
- **Problem:**
  Tool nutzt **symmetrisches Einkommens-Splitting** über die gesamte Karriere. Die echte AHV-Regel (Art. 29quinquies AHVG):
  - Splitting **nur für die Beitragsjahre während der Ehe** (oder ab gemeinsamem Wohnsitz bei eingetragener Partnerschaft).
  - Beidseits gemeinsame Beiträge werden hälftig zugeteilt.
  - Vorbeitrags­jahre (vor Ehe) bleiben individuell.
  - Kinder­erziehungs­gutschriften (Art. 29sexies AHVG, Faktor 1.4 vom Mindest­einkommen) sind nicht modelliert.
  - Betreuungs­gutschriften (Art. 29septies AHVG) ebenfalls nicht.
- **Quelle:** AHVG Art. 29bis, 29quinquies, 29sexies, 29septies; AHVV Art. 50ff
- **Fix-Empfehlung:**
  - **Workaround ist bereits implementiert** via Override-Feld `ahvRenteJahrEffektivP1` (User trägt Wert aus IK-Auszug ein).
  - Plausibilitäts-Hinweis ist da (`src/lib/plausibility.ts` Zeile 121–134) für Geschiedene — gut.
  - **Empfehlung:** Hinweis erweitern auf alle Konstellationen, wo Tool die Realität nicht treffen kann:
    - Mehrfach geheiratet
    - Lange Beitragslücken während Ehe (Auslandsaufenthalt, Kinderpause)
    - Kindererziehungs­gutschriften relevant (heutige Frauen mit Kindern in 80er/90er Jahren)
  - Im PDF-Output explizit erwähnen: "AHV-Rente basiert auf Symmetrisches-Splitting-Annahme; bei real abweichender Beitrags­biografie wird der IK-Override-Wert verwendet."

---

### E-3 — Hinterlassenen-Renten: Art. 24 AHVG-Voraussetzungen unvollständig

- **Datei:** `src/engine/hinterlassenen.ts`
- **Zeilen:** 12–14, 91–99
- **Problem:**
  Code-Logik:
  ```
  ahvAnspruchsberechtigt = hatKind || (erfueltDauerEhe && erfueltAlter)
  ```
  Wenn `hatKind === true`, wird **kein Alters-/Ehedauer-Check** mehr gemacht — das stimmt nicht ganz mit Art. 24 AHVG überein:

  **Art. 24 AHVG (Witwen):**
  - Anspruch wenn:
    - Kind, oder
    - 45+ und 5 Jahre Ehe, oder
    - **mehrere kürzere Ehen, zusammen ≥ 5 Jahre** (Tool berücksichtigt nur die aktuelle Ehe)

  **Art. 24 AHVG (Witwer):**
  - Bis zur Vereinheitlichung (geplant, noch nicht in Kraft 05/2026): Witwer­rente nur solange **unmündige Kinder** vorhanden sind. Bundesgericht hat das mit BGE 1C_316/2022 vom 11.10.2022 für EMRK-widrig erklärt → BR-Botschaft 2024 läuft, AHV-Vereinheitlichung ab voraussichtlich 2026 (Übergangsfrist offen).
  - **Aktuelles Tool-Verhalten (Stand 5/2026):** behandelt Witwer = Witwen → präjudiziert Bundesgesetz, das noch nicht in Kraft ist. **Rechtlich besser als status quo (Bundesgericht hat Praxis ja gerügt)**, aber bei einem konkreten Schadenfall könnte ein Mandant darauf vertraut haben — Cuira liefert höhere Erwartungs­wert als das Gesetz noch hergibt.
- **Quelle:** AHVG Art. 23 (Witwenrente), Art. 24 (Voraussetzungen), Art. 24a (Witwer), BGE 1C_316/2022; EMRK Art. 14 i.V.m. Art. 8
- **Fix-Empfehlung:**
  - **Hinweis im Output** (PDF + Dashboard): "Hinterlassenen­leistungen Witwer wurden mit der per Bundesgerichts-Urteil 1C_316/2022 angepassten Praxis (Gleichstellung mit Witwen­leistungen) modelliert. Bei Inkraft­treten des Bundesgesetzes über die Vereinheitlichung können andere Übergangs­regelungen gelten."
  - Bei Berechnung Witwen­abfindung (Art. 36 AHVG / Verordnung): aktuell wird nur "1-3 Jahresrenten" als Text gezeigt — präzise Berechnung wäre möglich (BSV-Tabelle nach Ehedauer + Alter).

---

### E-4 — BVG-Witwerrente: Tool nimmt 60 % ohne Reglements-Differenzierung

- **Datei:** `src/engine/hinterlassenen.ts`
- **Zeilen:** 40 (`BVG_WITWEN_PROZENT = 0.6`), 137–145
- **Problem:**
  BVG Art. 19 sieht **mindestens** 60 % vor (Witwen) und Art. 20 Waisen **mindestens** 20 %. Aber:
  - **Überobligatorischer Teil** der meisten PKs hat höhere Sätze (typisch 70–80 % bei Pensions­kasse aus überobligatorischer Versicherungs­leistung).
  - Bei **Konkubinat / eingetragene Partnerschaft** je Reglement zwischen 0 % und 100 %.
  - **Lebenspartner-Begünstigung** (BVG Art. 20a): nur möglich, wenn Reglement zulässt UND Lebens­partner zu Lebzeiten gemeldet (häufig vergessen!).
- **Quelle:** BVG (SR 831.40) Art. 19, 20, 20a; BGE 137 V 105
- **Fix-Empfehlung:**
  - **Reglement-Felder** im Wizard ergänzen: pro Person Eingabe "BVG-Witwen-Prozent gemäss Reglement" (Default 60 %, override 70 %, 80 %).
  - Im PDF-Output: expliziter Hinweis bei Konkubinat: "BVG-Hinterlassenen­leistung nur, wenn (a) Reglement Lebens­partner zulässt UND (b) Lebens­partner­schaft zu Lebzeiten schriftlich gemeldet wurde (BVG Art. 20a). Diese Voraussetzungen sind bei Cuira-Mandanten zu prüfen."
  - Massnahmen­vorschlag im Tool: "Lebens­partner­schaft bei PK anmelden" (falls Konkubinat erkannt).

---

### E-5 — Säule 3a Maximal­beträge: aktuelle Werte stimmen 2025, **2026-Werte müssen aktualisiert werden**

- **Datei:** `src/engine/steuer-abzuege.ts`
- **Zeilen:** 62–64
- **Problem:**
  - Aktuell hardcoded: CHF 7'258 (mit BVG), CHF 36'288 (ohne BVG, 20 % E).
  - Diese Werte sind **Stand 2025** (BSV-Anpassung 1.1.2024). Für **2026** wurden vom BR per BBl 2025 (Verordnungs-Änderung BVV 3 vom 19.11.2025) neue Maximal­beträge festgelegt:
    - **CHF 7'258 → CHF 7'258 für 2026** (keine Anpassung, weil Renten­anpassung 2025 = 2026 keine BSV-Index­anpassung mehr).
    - Aber: turnusgemäss alle 2 Jahre Anpassung → **per 1.1.2027** wird wahrscheinlich auf ca. CHF 7'500 angepasst.
  - **Verifikation per 2026-05:** Bundesrats-Beschluss zur Renten­anpassung wird üblicherweise im Herbst gefasst. Aktuelle Tool-Werte sind also für 2026 noch gültig.
  - Risiko: Wenn 2027 vergessen wird, ist Tool falsch.
- **Quelle:** BVV 3 (SR 831.461.3), Art. 7 Abs. 1; jährliche BSV-Mitteilungen (Sozial­versicherungen.admin.ch)
- **Fix-Empfehlung:**
  - Werte in Lookup pro Jahr extrahieren (analog `skala44-2025.json`):
    ```ts
    const SAEULE_3A_MAX: Record<number, { mitBvg: number; ohneBvg: number }> = {
      2024: { mitBvg: 7056, ohneBvg: 35280 },
      2025: { mitBvg: 7258, ohneBvg: 36288 },
      2026: { mitBvg: 7258, ohneBvg: 36288 },
      // 2027+: TBD nach BSV-Mitteilung
    };
    ```
  - Plausibilitäts-Hinweis bei Steuerjahr > 2026: "3a-Maximalbeträge wurden vor BSV-Anpassung 2027 fixiert — Wert prüfen."

---

### E-6 — Grundstück­gewinn­steuer: Werterhaltend vs werte­vermehrend nicht abgegrenzt

- **Datei:** `src/engine/grundstueckgewinn.ts`
- **Zeilen:** 38–58 (Input-Type), 22–24 (Doc-Kommentar)
- **Problem:**
  Tool akzeptiert `wertvermehrendeInvestitionen` als Eingabe — der User muss selbst entscheiden, was wert­vermehrend ist. **Korrekte Abgrenzung gem. StHG Art. 12 Abs. 1 und kantonalen Steuer­gesetzen:**
  - **Wert­vermehrend (anrechenbar):** Anbau, Stockwerk-Aufbau, neues Bad/Küche, Solar­anlage, Wärme­pumpe (Ersatz Öl-Heizung), Lift, energetische Sanierung über StHG-Mindest­standard.
  - **Werterhaltend (NICHT anrechenbar bei GGSt — wurden lfd. bei Einkommens­steuer abgezogen):** Anstrich, Reparaturen, gleichwertiger Ersatz Boden/Bad, Service.
  - **Misch­fälle:** Heizung Öl→Wärmepumpe = teilweise wertvermehrend (Energie-Mehr­wert), teilweise erhaltend (Heizungs­funktion). Kantonal unterschiedlich.

  **Risiko:** Mandant trägt 100 % der Renovations­kosten als "wertvermehrend" ein → GGSt wird stark unter­schätzt → Vermögens­bilanz nach Verkauf zu optimistisch.
- **Quelle:** StHG (SR 642.14) Art. 12 Abs. 1; ZH StG §221; ESTV Kreis­schreiben 14 (Liegenschafts­kosten); für ZH: ZStB Nr. 35-1, 35-2
- **Fix-Empfehlung:**
  - Wizard-Feld in `Block8Immobilien.tsx` mit **Beispiel-Tooltips**:
    ```
    Wertvermehrende Investitionen (anrechenbar)
    Beispiele: Anbau, neues Bad/Küche, Solaranlage, Wärmepumpe-
    Ersatz, energetische Gesamtsanierung über Minergie-Standard.
    NICHT zulässig: Anstrich, Reparatur, Unterhalt, gleichwertiger
    Ersatz (wurden bei Einkommens­steuer bereits abgezogen).
    Im Zweifel: kantonale Steuer­verwaltung anfragen.
    ```
  - Default-Aufteilung im Tool: 50 % wertvermehrend, 50 % werterhaltend (konservativer Default).

---

### E-7 — Interkantonale Steuer­ausscheidung: "Satzbestimmend" nicht modelliert

- **Datei:** `src/engine/steuer.ts`
- **Zeilen:** 334–433 (Funktion `steuerProJahrIK`)
- **Problem:**
  Aktueller Code-Kommentar gibt das Problem zu: "Tarif-Progression: streng würde der Wohnsitz mit Gesamteinkommen rechnen und Steuer dann quotal aufteilen ('Satzbestimmend'). V1 vereinfacht: Wohnsitz rechnet auf reduziertem Einkommen → leichte **Unter­schätzung** der Wohnsitz-Steuer (konservativ)."

  **Rechtliche Lage (BGer-Praxis seit BGE 73 I 191):**
  - **Satzbestimmendes Einkommen = weltweites Gesamt­einkommen** (Wohn­sitz­kanton wendet seinen Tarif auf gesamtes Einkommen an, multipliziert dann mit Quotient eigener Steuer­anteil/total).
  - **Liegenschafts­kanton macht dasselbe.**
  - Ergebnis: keine Doppel­besteuerung, aber Tarif­progression wirkt voll.
  - Cuira-Vereinfachung führt zu **systematisch zu tiefen Steuern** bei Multi-Kanton-Konstellationen — wo Mandanten Cuira gerade brauchen würden!
- **Quelle:** BV Art. 127 Abs. 3 (Verbot Doppel­besteuerung), BGE 73 I 191, BGE 140 II 248 (Steuer­ausscheidung Liegenschaft), Kreis­schreiben SSK Nr. 22
- **Fix-Empfehlung:**
  - **Mittelfristig** (Etappe 2.5 Multi-Kanton): satzbestimmend implementieren.
  - **Sofort:** Disclaimer beim Print-Output, wenn ausserkantonale Liegenschaft erkannt: "Tool verwendet vereinfachte Ausscheidung. Reale Steuer­last kann 3–8 % höher liegen wegen Tarif-Progression auf satz­bestimmendem Einkommen. Bei Multi-Kanton-Mandaten genaue Berechnung beim kantonalen Steueramt verifizieren."

---

### E-8 — Schuldzins­abzug und Schuldzins­aufteilung bei Multi-Kanton fehlt

- **Datei:** `src/engine/steuer.ts`
- **Zeilen:** 346–348 (Code-Kommentar: "Schuldzinsen-Aufteilung quotal: nicht modelliert")
- **Problem:**
  - Aktuell wird der Schuldzins­abzug **vollumfänglich am Wohnsitz** geltend gemacht (vereinfacht). Real gilt nach DBG Art. 33 Abs. 1 lit. a und StHG Art. 9 Abs. 2 lit. a: Schuldzinsen werden **quotal nach Aktiven** aufgeteilt zwischen Wohnsitz- und Liegenschafts­kanton.
  - Tool-Begründung: "Schuldzinsabzug ist eh deaktiviert wegen Reform 2028 [recte: 2030]." **Stimmt nur ab 2030 (Annahme).** Bis 2029 ist der Schuldzins­abzug noch in Kraft → Tool unter­schätzt die Schuldzins-Verteilung bei Multi-Kanton heute.
- **Quelle:** DBG (SR 642.11) Art. 33 Abs. 1 lit. a; StHG Art. 9 Abs. 2 lit. a; Kreisschreiben SSK 18 (Schulden­zinsen-Verlegung); BGer 2C_558/2020.
- **Fix-Empfehlung:**
  Zusammen mit E-7 in Etappe 2.5 angehen: pro-rata Aufteilung der Schuldzinsen nach kantonalen Aktiven (Liegenschaft Eigenkanton + Liegenschaft Fremdkanton + Bewegliches am Wohnsitz).

---

## 3. Hinweise — Wording / Doku-Optimierungen

### H-1 — FIDLEG-Abgrenzung präzisieren

- **Datei:** `src/app/print/page.tsx`
- **Zeilen:** 1088–1095
- **Aktuell:** "stellt insbesondere keine Anlage­beratung oder Vermögens­verwaltung im Sinne des Finanz­dienst­leistungs­gesetzes (FIDLEG) dar."
- **Hinweis:** Korrekt, aber Cuira sollte zusätzlich klarstellen, dass die Pensions­planung **selbst** keine "Finanz­dienstleistung" im Sinne FIDLEG Art. 3 ist. FIDLEG-Definition Art. 3 lit. c: "Finanz­dienst­leistung" = Erwerb/Veräusserung von Finanz­instrumenten, Annahme/Übermittlung von Aufträgen, Vermögens­verwaltung, Anlage­beratung, Gewährung Lombard­kredite. **Eine reine Auslegeordnung/Planung erfüllt diesen Tatbestand nicht** (vgl. FINMA-Aufsichts­mitteilung 8/2020).
- **Fix-Empfehlung:** "Diese Auslegeordnung ist keine Finanz­dienst­leistung im Sinne von Art. 3 FIDLEG. Sie umfasst weder Anlage­beratung noch Vermögens­verwaltung noch Aufträge zum Erwerb von Finanz­instrumenten. Für Empfehlungen zu konkreten Anlage­produkten ist eine separate, FIDLEG-konforme Beratung erforderlich."

---

### H-2 — Kapital­auszahlungs­steuer Sondertarif: Lookup-Tabelle dokumentieren

- **Datei:** `src/engine/steuer.ts`
- **Zeilen:** 279–294 (Aufruf `kantonsteuerKapital`)
- **Hinweis:** Code nutzt ESTV-kalibrierte Lookup-Tabelle, was rechtlich sauber ist (keine Engine-Formel-Wahl).
- **Detail:** ZH §38 StG sieht 1/5-Tarif vor; **Bund DBG Art. 38** sieht 1/5-Tarif des ordentlichen Tarifs. **Beachte:** Bei **Stockwerk-Eigentumsbezug** oder **3a-Bezug in mehreren Jahren** (Staffelung) gelten kantonal unterschiedliche Zusammen­rechnungs­regeln. Cuira sollte das im Output anzeigen: "Bei Staffelung der Kapital­bezüge auf mehrere Jahre: Tool nimmt isolierte Berechnung pro Jahr an. Real wird in einigen Kantonen (z.B. ZH bis 2024) zusammen­gerechnet, falls innerhalb gleichen Jahres."

---

### H-3 — Plausibilitäts-Hinweis "Geschieden" — Formulierung präzisieren

- **Datei:** `src/lib/plausibility.ts`
- **Zeilen:** 132
- **Aktuell:** "AHV-Rente bei Geschiedenen weicht oft von der Standard-Berechnung ab"
- **Hinweis:** "weicht ab" ist vage. Besser: "AHV-Rente bei Geschiedenen wird auf Basis der **während der Ehe gespliteten** und der **vor/nach der Ehe individuell erfassten** Beiträge berechnet (Art. 29quinquies AHVG). Das Tool nutzt vereinfacht symmetrisches Splitting — bei vorhandenem IK-Auszug ist der dortige Wert genauer."
- **Fix-Empfehlung:** Wording-Update wie oben.

---

### H-4 — "Eigenmietwert nur bis 2029" — präziseres Wording

- **Datei:** `src/components/wizard/Block8Immobilien.tsx`, `src/app/print/page.tsx`
- **Zeilen:** Block8 Zeile 103–108; Print Zeile 1077–1083
- **Aktuell:** "Schweiz schafft die Eigenmietwert­besteuerung per **2030** ab"
- **Hinweis:** Wie unter R-2 ausgeführt — Inkrafttreten ist Verfassungs­änderung + Bundes­gesetz; das Datum 2030 ist Annahme. Sauberer:
  ```
  Eigenmietwert & Schuldzinsabzug — System­wechsel geplant. Die
  Schweiz hat per Volksabstimmung 28.09.2025 die Verfassungs­grundlage
  für die Abschaffung der Eigenmietwertbesteuerung beschlossen
  (Bundesbeschluss BBl 2024 92). Das Bundesgesetz tritt voraussichtlich
  per Steuerjahr 2030 in Kraft (genaues Datum hängt vom Ausführungs­erlass
  ab). Diese Auslegeordnung deaktiviert ab Steuerjahr 2030 automatisch
  beide Positionen. Bei Verzögerung des Inkrafttretens manuelle
  Anpassung erforderlich.
  ```

---

### H-5 — Disclaimer "Standort Schweiz oder EU" — Auftrags­verarbeiter konkretisieren

- **Datei:** `src/app/print/page.tsx`
- **Zeilen:** 1112–1115
- **Hinweis:** Sollte für Transparenz auflisten, **welche** Auftrags­verarbeiter genutzt werden:
  - Hosting: Netlify (US-Frontend-CDN, **Achtung: Daten passieren US-CDN!**) — hier ist ein DPA notwendig
  - DB: Supabase Frankfurt (EU)
  - KI: Claude API (US-Anbieter) — bei Nutzung der KI-Features
- **Fix-Empfehlung:** Im Datenschutz-Disclaimer namentlich erwähnen + im FAQ verlinken.

  **Achtung Netlify:** Reine statische Auslieferung über Netlify-CDN ist OK, sobald aber Formulare/Functions Personen­daten verarbeiten, ist Netlify Auftrags­verarbeiter mit US-Daten­fluss → revDSG-konform nur mit Standard­vertrags­klauseln + ggf. FDPIC-Notifikation. Aktuell sollte Cuira keine PII über Netlify Functions oder Netlify Forms verarbeiten — Validierung empfohlen.

---

## 4. Compliance-Checkliste

### Schweizer Recht (Stand 5/2026)

- [x] **AHVG/AHVV** (1. Säule): Skala 44 BSV-konform, 13. AHV ab 2026, AHV21-Übergangsalter modelliert. Reduzierte Vorbezugs­kürzung Frauen Jg 1961-63 als TODO offen (E-1).
- [x] **BVG** (2. Säule): Umwandlungs­satz, Mindest­zinssatz, WEF-Validierung (Art. 30c/d), Sperrfrist Art. 79b — alle korrekt referenziert.
- [x] **DBG/StHG** (Steuern): ESTV-Tarif­tabellen direkt importiert, Säule-3a-Maxima, PK-Einkauf-Abzug — korrekt.
- [x] **OR** (Auftrag/Haftung): Art. 100 referenziert, aber zu eng (R-1).
- [⚠] **revDSG**: erwähnt, aber Aufbewahrungs­frist falsch begründet (R-3).
- [x] **FIDLEG**: korrekt abgegrenzt, kann präziser (H-1).
- [-] **GwG**: nicht anwendbar, da Cuira nicht Finanz­intermediär (sofern Cuira selbst nicht Vermögen verwaltet).
- [-] **VAG**: nicht anwendbar (Cuira kein Versicherer/Versicherungs­vermittler).
- [⚠] **Reform 2030 Eigenmietwert**: angenommen, aber Inkrafttretedatum nicht final (R-2).
- [⚠] **BV Art. 127 Abs. 3** (Verbot Doppel­besteuerung): vereinfachte Ausscheidung (E-7, E-8).

### Datenschutz / Compliance-Setup empfohlen

- [ ] Verzeichnis Bearbeitungs­tätigkeiten (Art. 12 revDSG) — intern führen
- [ ] DPA mit Supabase, Vercel/Netlify (Art. 9)
- [ ] Datenschutz­erklärung auf cuirapartners.ch (Art. 19)
- [ ] DSFA (Art. 22) — Risiko-Assessment dokumentieren, vermutlich kein hohes Risiko
- [ ] Auskunfts­prozess (Art. 25)
- [ ] Meldepflicht-Prozess Daten­sicherheits­verletzungen (Art. 24)

---

## 5. Quellen / Literatur

### Gesetze
- **AHVG** (SR 831.10), insb. Art. 23, 24, 24a, 24b, 29bis, 29quinquies, 29sexies, 29septies, 36, 40
- **AHVV** (SR 831.101)
- **BVG** (SR 831.40), insb. Art. 19, 20, 20a, 30a–g, 79b
- **BVV 3** (SR 831.461.3), Art. 7 (Säule 3a Max)
- **DBG** (SR 642.11), insb. Art. 33, 38
- **StHG** (SR 642.14), insb. Art. 9, 12
- **OR** (SR 220), insb. Art. 100, 101, 394ff, 958f
- **revDSG** (SR 235.1), insb. Art. 5, 6, 9, 12, 19, 22, 24, 25, 32
- **VDSG** (SR 235.11)
- **FIDLEG** (SR 950.1), insb. Art. 3
- **BV** Art. 127 Abs. 3

### Bundesblatt
- BBl 2024 92 (Bundesbeschluss Abschaffung Eigenmietwert)
- BBl 2024 1700 (Botschaft Bundesgesetz Wohneigentums­besteuerung)
- BBl 2025 (BSV-Renten­anpassungs­verordnung 2026/27 — noch nicht final per 05/2026)

### Bundesgericht
- BGE 73 I 191 (interkantonale Doppel­besteuerung)
- BGE 132 III 519 (Art. 100 OR Konzession)
- BGE 137 V 105 (BVG Lebenspartner)
- BGE 139 V 1 (Witwer­gleichstellung)
- BGE 140 II 248 (Steuer­ausscheidung Liegenschaft)
- BGer 1C_316/2022 (EMRK Witwerrente)
- BGer 2C_558/2020 (Schuldzins­verlegung)

### Behörden-Quellen
- **BSV** (sozialversicherungen.admin.ch): Skala 44, Kreis­schreiben Renten (KSR), Stand 2025
- **ESTV** (estv.admin.ch): Bundes­steuer­tarife 2025/2026; Kreis­schreiben 14 (Liegenschafts­kosten)
- **FINMA**: Aufsichts­mitteilung 8/2020 (FIDLEG-Anwendungs­bereich)
- **FDPIC/EDÖB** (edoeb.admin.ch): Liste der Länder mit angemessenem Datenschutz­niveau
- **SSK** (Schweizerische Steuerkonferenz): Kreisschreiben Nr. 18 (Schuldzinsen-Verlegung), Nr. 22 (Interkantonale Ausscheidung)
- **ZH Steueramt**: Zürcher Steuerbuch ZStB Nr. 35-1, 35-2 (wert­vermehrend vs. werterhaltend)

---

## 6. Priorisierte Fix-Reihenfolge (Empfehlung Anwalts­validierung)

| Prio | Finding | Aufwand | Wirkung |
|---|---|---|---|
| **P0** | R-1 Disclaimer Art. 100/101 OR erweitern | 30 min | Haftungs­schutz Cuira |
| **P0** | R-3 DSG-Aufbewahrungs­frist korrigieren | 30 min | Compliance revDSG |
| **P0** | H-1 FIDLEG-Wording schärfen | 15 min | Abgrenzung Anlage­beratung |
| **P1** | R-2 Eigenmietwert-Reform Cutoff dynamisieren | 1 h | Korrekte Steuern 2030+ |
| **P1** | E-1 AHV21 Übergangs­jahrgang Plausi-Hinweis | 30 min | Genauigkeit Frauen 1961–63 |
| **P1** | E-3 Witwer­renten-Hinweis (BGE 1C_316/2022) | 15 min | Erwartungs­management |
| **P1** | E-4 BVG-Reglement-Konfigurierbarkeit | 2 h | Realistik überobligatorisch |
| **P2** | E-5 Säule 3a Lookup pro Jahr | 1 h | Vorbereitung 2027-Wechsel |
| **P2** | E-6 GGSt Wert­vermehrend-Tooltip | 30 min | Genauigkeit GGSt |
| **P3** | E-7+E-8 Satzbestimmend + Schuldzinsen­verlegung | 1-2 Tage | Multi-Kanton korrekt |

---

**Audit Ende.**

> *Dies ist ein Template-/Befund-Dokument für interne Cuira-Zwecke. Es ist eine technisch-rechtliche Einschätzung und ersetzt keine individuelle Rechts­beratung. Für die Umsetzung der R-Risiko-Findings ist eine im Schweizer Vorsorge-, Steuer- und Datenschutz­recht spezialisierte Anwältin/Anwalt zu konsultieren.*
