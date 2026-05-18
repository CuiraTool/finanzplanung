"use client";

/**
 * V3 — Endkunden-Funnel.
 *
 * Public-facing 8-Schritte-Funnel: "Reicht Ihr Geld in der Pension?"
 * Linear, freundlich, kein Jargon. 1:1 nach Cuira-Design-Handoff May 2026.
 *
 * Schritte:
 *  0 Welcome — Hero, Trust-Signale, "Los geht's"
 *  1 Wer    — Sie allein oder zu zweit + Geburtsjahr/e
 *  2 Beruf  — Bruttoeinkommen + Wunsch-Pensionsalter (Sliders)
 *  3 Vermögen — Konto, Wertschriften, Eigenheim/Hypothek (Module-Cards)
 *  4 Vorsorge — PK Altersguthaben + Rente, 3a-Guthaben (Module-Cards)
 *  5 Wunsch — Heutige + Wunsch-Ausgaben in Pension (Sliders)
 *  6 Ergebnis — Verdict-Card (positiv/warn/negativ) + 3 KPIs + SVG-Chart
 *  7 Termin — Dark-Card Lead-Capture: Name, E-Mail, Telefon → Submit
 *
 * Engine: Lite-Projection im Browser (`project()`) — explizite
 * Vorab-Schätzung mit Schweizer Durchschnittsannahmen, im Termin
 * verfeinert. Keine Persistenz, keine Server-Calls.
 *
 * Theme: warm off-white (#faf8f3) statt cool grey, via data-mode="kunde"
 * Wrapper. Globale Cuira-Tokens bleiben, nur surface/bg/border werden
 * für B2C-freundlicheres Look überschrieben (siehe globals.css).
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";

const HEUTE = new Date().getFullYear();

/* ═══════════════════════════════════════════════════════════════════════
   Engine — vereinfachte Browser-Projektion für B2C-Vorabschätzung.
   Volle Schweiz-Genauigkeit kommt im Beratungsgespräch (Pro-Modus).
   ═══════════════════════════════════════════════════════════════════════ */

interface State {
  paar: boolean;
  geb1: number;
  geb2: number;
  retire1: number;
  retire2: number;
  income1: number;
  income2: number;
  spendNow: number;
  spendRet: number;
  wCash: number;
  wInvest: number;
  hasImmo: boolean;
  immoValue: number;
  immoMortgage: number;
  pk1: number;
  pk2: number;
  pk1Rente: number;
  pk2Rente: number;
  s3a1: number;
  s3a2: number;
  email: string;
  phone: string;
  name: string;
}

interface SeriesPoint {
  year: number;
  age1: number;
  age2: number | null;
  wealth: number;
  income: number;
  ahv: number;
  pkRente: number;
  expenses: number;
  saldo: number;
  isRetired: boolean;
}

interface Result {
  series: SeriesPoint[];
  depleteYear: number | null;
  atRet: SeriesPoint | undefined;
  at85: SeriesPoint | undefined;
  verdict: "good" | "warn" | "neg";
  verdictTitle: string;
  verdictSub: string;
  retYear: number;
}

const INITIAL: State = {
  paar: true,
  geb1: 1967,
  geb2: 1972,
  retire1: 64,
  retire2: 62,
  income1: 168_000,
  income2: 92_000,
  spendNow: 142_000,
  spendRet: 110_000,
  wCash: 85_000,
  wInvest: 220_000,
  hasImmo: true,
  immoValue: 1_200_000,
  immoMortgage: 720_000,
  pk1: 612_000,
  pk2: 218_000,
  pk1Rente: 45_630,
  pk2Rente: 19_440,
  s3a1: 78_000,
  s3a2: 24_000,
  email: "",
  phone: "",
  name: "",
};

function project(s: State): Result {
  const ret1 = s.retire1;
  const ret2 = s.paar ? s.retire2 : null;
  const yearRet1 = s.geb1 + ret1;
  const yearRet2 = s.paar && ret2 ? s.geb2 + ret2 : null;
  const endYear = HEUTE + 60;

  let wealth =
    s.wCash +
    s.wInvest +
    (s.hasImmo ? Math.max(0, s.immoValue - s.immoMortgage) : 0) +
    s.pk1 +
    (s.paar ? s.pk2 : 0) +
    s.s3a1 +
    (s.paar ? s.s3a2 : 0);
  const series: SeriesPoint[] = [];
  let depleteYear: number | null = null;

  for (let y = HEUTE; y <= endYear; y++) {
    const a1 = y - s.geb1;
    const a2 = s.paar ? y - s.geb2 : null;
    const isRetired1 = a1 >= ret1;
    const isRetired2 = s.paar && a2 !== null && ret2 ? a2 >= ret2 : true;
    const bothRetired = isRetired1 && isRetired2;

    let income = 0;
    if (!isRetired1) income += s.income1;
    if (s.paar && !isRetired2) income += s.income2;

    let ahv = 0;
    if (a1 >= 65) ahv += 30_240;
    if (s.paar && a2 !== null && a2 >= 65) ahv += 30_240;
    if (s.paar && a1 >= 65 && a2 !== null && a2 >= 65) {
      ahv = Math.min(ahv, 45_360);
    }

    let pkRente = 0;
    if (isRetired1) pkRente += s.pk1Rente;
    if (s.paar && isRetired2) pkRente += s.pk2Rente;

    const expenses = bothRetired ? s.spendRet : s.spendNow;
    const tax = Math.round(
      (income + ahv + pkRente) * 0.14 + Math.max(0, wealth) * 0.003
    );

    const out = expenses + tax;
    const inFlow = income + ahv + pkRente;
    const saldo = inFlow - out;
    const growth = wealth > 0 ? wealth * 0.025 : 0;

    wealth = wealth + saldo + growth;

    if (wealth < 0 && depleteYear == null) depleteYear = y;
    series.push({
      year: y,
      age1: a1,
      age2: a2,
      wealth,
      income,
      ahv,
      pkRente,
      expenses,
      saldo,
      isRetired: bothRetired,
    });
  }

  const retYear = Math.max(yearRet1, yearRet2 || 0);
  const atRet = series.find((r) => r.year === retYear);
  const at85 = series.find((r) => r.year === s.geb1 + 85) ?? series[series.length - 1];

  let verdict: Result["verdict"] = "good";
  let verdictTitle = "Ihr Plan reicht komfortabel";
  let verdictSub =
    "Ihr Vermögen reicht voraussichtlich bis weit über das Alter 90 hinaus.";
  if (depleteYear != null) {
    const ageAtDeplete = depleteYear - s.geb1;
    if (ageAtDeplete < 80) {
      verdict = "neg";
      verdictTitle = `Eng — Geld reicht bis Alter ${ageAtDeplete}`;
      verdictSub =
        "Wir empfehlen ein Beratungsgespräch, um den Plan zu schärfen.";
    } else if (ageAtDeplete < 90) {
      verdict = "warn";
      verdictTitle = `Knapp — Geld reicht bis Alter ${ageAtDeplete}`;
      verdictSub = "Mit kleinen Anpassungen lässt sich das Bild verbessern.";
    }
  }

  return {
    series,
    depleteYear,
    atRet,
    at85,
    verdict,
    verdictTitle,
    verdictSub,
    retYear,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════ */

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  return `${sign}CHF ${Math.round(abs).toLocaleString("de-CH").replace(/,/g, "'")}`;
}

const STEPS = [
  { id: "welcome", label: "Start" },
  { id: "wer", label: "Sie" },
  { id: "beruf", label: "Beruf" },
  { id: "vermoegen", label: "Vermögen" },
  { id: "vorsorge", label: "Vorsorge" },
  { id: "wunsch", label: "Wunsch" },
  { id: "ergebnis", label: "Ergebnis" },
  { id: "termin", label: "Termin" },
] as const;

type StepId = (typeof STEPS)[number]["id"];
type SetState = (patch: Partial<State>) => void;

/* ═══════════════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════════════ */

export default function KundenPage() {
  const [step, setStep] = useState(0);
  const [s, setS] = useState<State>(INITIAL);
  const [submitted, setSubmitted] = useState(false);

  const set: SetState = useCallback(
    (patch) => setS((cur) => ({ ...cur, ...patch })),
    []
  );
  const result = useMemo(() => project(s), [s]);

  const next = useCallback(
    () => setStep((cur) => Math.min(cur + 1, STEPS.length - 1)),
    []
  );
  const prev = useCallback(() => setStep((cur) => Math.max(cur - 1, 0)), []);

  // Scroll to top on step change
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  // Keyboard nav (← →) — nicht wenn Input fokussiert
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA";
      if (isInput) return;
      if (e.key === "ArrowRight" && step < STEPS.length - 1 && !submitted) {
        next();
      }
      if (e.key === "ArrowLeft" && step > 0) {
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, submitted, next, prev]);

  const id: StepId = STEPS[step]?.id ?? "welcome";
  const showFooter = step > 0 && !submitted && id !== "termin";

  return (
    <div data-mode="kunde">
      <div className="kunde-stage">
        <Topbar onJumpHome={() => setStep(0)} />
        <Progress step={step} />
        <div className="kunde-step-stage" key={id}>
          {id === "welcome" && <StepWelcome onNext={next} />}
          {id === "wer" && <StepWer s={s} set={set} />}
          {id === "beruf" && <StepBeruf s={s} set={set} />}
          {id === "vermoegen" && <StepVermoegen s={s} set={set} />}
          {id === "vorsorge" && <StepVorsorge s={s} set={set} />}
          {id === "wunsch" && <StepWunsch s={s} set={set} />}
          {id === "ergebnis" && <StepErgebnis s={s} result={result} />}
          {id === "termin" && (
            <StepTermin
              s={s}
              set={set}
              onSubmit={() => setSubmitted(true)}
              submitted={submitted}
            />
          )}
          {/* submitted unused fuer StepTermin — Calendly handelt Submission selbst */}
        </div>
        {showFooter && (
          <div className="kunde-footer">
            <button
              type="button"
              className="kunde-btn kunde-btn-ghost"
              onClick={prev}
            >
              <ArrowLeft />
              Zurück
            </button>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
              <span className="kunde-kbd">← →</span> zum Navigieren
            </span>
            <button
              type="button"
              className="kunde-btn kunde-btn-primary"
              onClick={next}
            >
              {id === "ergebnis" ? "Termin vereinbaren" : "Weiter"}
              <ArrowRight />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Topbar + Progress
   ═══════════════════════════════════════════════════════════════════════ */

function Topbar({ onJumpHome }: { onJumpHome: () => void }) {
  return (
    <header className="kunde-topbar">
      <button
        type="button"
        className="kunde-logo"
        onClick={onJumpHome}
      >
        <span className="kunde-logo-mark"></span>
        <span>cuira</span>
      </button>
      <span style={{ color: "var(--ink-3)", fontSize: 13 }}>
        · Pensionsplaner
      </span>
      <div className="kunde-top-meta">
        <span className="hidden sm:inline">Bereits Berater?</span>
        <Link href="/login">Pro-Modus</Link>
      </div>
    </header>
  );
}

function Progress({ step }: { step: number }) {
  if (step === 0) return null;
  const steps = STEPS.slice(1, -1); // exclude welcome + termin
  const idx = step - 1;
  const labelStep = steps[Math.min(idx, steps.length - 1)];
  return (
    <div className="kunde-progress-wrap">
      <div className="kunde-progress-row">
        {steps.map((t, i) => (
          <div
            key={t.id}
            className={`kunde-progress-pip ${
              i < idx ? "is-done" : i === idx ? "is-active" : ""
            }`}
          />
        ))}
      </div>
      <div className="kunde-progress-meta">
        <span>
          Schritt {Math.min(idx + 1, steps.length)} von {steps.length}
        </span>
        <span style={{ fontFamily: "var(--font-mono)" }}>
          {labelStep?.label}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Welcome
   ═══════════════════════════════════════════════════════════════════════ */

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <section className="kunde-welcome">
      <span className="kunde-welcome-eyebrow">
        <span className="pulse"></span>
        Live-Berechnung · keine Anmeldung nötig
      </span>
      <h1 className="kunde-welcome-title">
        Reicht Ihr Geld in der Pension?{" "}
        <em>In 5 Minuten klar.</em>
      </h1>
      <p className="kunde-welcome-sub">
        Beantworten Sie ein paar Fragen — wir zeigen Ihnen sofort, wie Ihr
        Plan wirklich aussieht. Keine Werbung, keine versteckten Annahmen.
      </p>
      <div className="kunde-welcome-meta">
        <div className="kunde-welcome-stat">
          <div className="kunde-welcome-stat-num">~5 Min.</div>
          <div className="kunde-welcome-stat-label">Bearbeitungszeit</div>
        </div>
        <div className="kunde-welcome-stat">
          <div className="kunde-welcome-stat-num">8 Schritte</div>
          <div className="kunde-welcome-stat-label">Klare Fragen</div>
        </div>
        <div className="kunde-welcome-stat">
          <div className="kunde-welcome-stat-num">CH-Recht</div>
          <div className="kunde-welcome-stat-label">AHV · BVG · 3a</div>
        </div>
      </div>
      <button
        type="button"
        className="kunde-btn kunde-btn-primary"
        onClick={onNext}
      >
        Los geht&apos;s
        <ArrowRight />
      </button>
      <div className="kunde-side-note">
        <span className="dot"></span>
        Ihre Daten bleiben auf diesem Gerät, bis Sie sie senden.
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 1 — Wer (allein vs. Paar)
   ═══════════════════════════════════════════════════════════════════════ */

function StepWer({ s, set }: { s: State; set: SetState }) {
  return (
    <div className="kunde-step">
      <div className="kunde-step-head">
        <div className="kunde-step-eyebrow">Über Sie</div>
        <h2 className="kunde-step-title">
          Planen Sie für sich allein <em>oder zu zweit?</em>
        </h2>
        <p className="kunde-step-sub">
          Bei Paaren rechnen wir mit der gemeinsamen AHV und beiden
          Pensionskassen.
        </p>
      </div>
      <div className="kunde-choices kunde-choices-2">
        <button
          type="button"
          className={`kunde-choice ${!s.paar ? "is-active" : ""}`}
          onClick={() => set({ paar: false })}
        >
          <div className="kunde-choice-check"></div>
          <div className="kunde-choice-icon">
            <IconUser />
          </div>
          <div>
            <div className="kunde-choice-title">Ich, allein</div>
            <div className="kunde-choice-desc">
              Single, getrennt oder verwitwet — Plan für eine Person.
            </div>
          </div>
        </button>
        <button
          type="button"
          className={`kunde-choice ${s.paar ? "is-active" : ""}`}
          onClick={() => set({ paar: true })}
        >
          <div className="kunde-choice-check"></div>
          <div className="kunde-choice-icon">
            <IconCouple />
          </div>
          <div>
            <div className="kunde-choice-title">Wir, als Paar</div>
            <div className="kunde-choice-desc">
              Verheiratet oder Konkubinat — Plan für beide Personen zusammen.
            </div>
          </div>
        </button>
      </div>
      <div
        className="kunde-field-grid"
        style={{ gridTemplateColumns: s.paar ? "1fr 1fr" : "1fr" }}
      >
        <div className="kunde-field">
          <label className="kunde-field-label">
            {s.paar ? "Ihr Geburtsjahr" : "Geburtsjahr"}
          </label>
          <input
            className="kunde-input is-big"
            type="number"
            min="1940"
            max="2010"
            value={s.geb1}
            onChange={(e) =>
              set({ geb1: parseInt(e.target.value || "0", 10) })
            }
          />
          <div className="kunde-field-help">{HEUTE - s.geb1} Jahre alt</div>
        </div>
        {s.paar && (
          <div className="kunde-field">
            <label className="kunde-field-label">
              Geburtsjahr Partner:in
            </label>
            <input
              className="kunde-input is-big"
              type="number"
              min="1940"
              max="2010"
              value={s.geb2}
              onChange={(e) =>
                set({ geb2: parseInt(e.target.value || "0", 10) })
              }
            />
            <div className="kunde-field-help">{HEUTE - s.geb2} Jahre alt</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 2 — Beruf (Einkommen + Pensionsalter, Sliders)
   ═══════════════════════════════════════════════════════════════════════ */

function StepBeruf({ s, set }: { s: State; set: SetState }) {
  return (
    <div className="kunde-step">
      <div className="kunde-step-head">
        <div className="kunde-step-eyebrow">Beruf & Pension</div>
        <h2 className="kunde-step-title">
          Was verdienen Sie heute — und wann{" "}
          <em>wollen Sie aufhören?</em>
        </h2>
        <p className="kunde-step-sub">
          Ihr Bruttoeinkommen pro Jahr (13. Monatslohn inkl., ohne Bonus).
          Das ordentliche Pensionsalter in der Schweiz ist 65, viele wollen
          früher.
        </p>
      </div>
      <div className="kunde-field" style={{ gap: 6 }}>
        <label className="kunde-field-label">
          {s.paar ? "Ihr Bruttoeinkommen pro Jahr" : "Bruttoeinkommen pro Jahr"}
        </label>
        <Slider
          value={s.income1}
          min={40_000}
          max={400_000}
          step={2_000}
          onChange={(v) => set({ income1: v })}
          format={(v) => fmt(v)}
          side={s.paar ? "Person 1" : null}
          ticks={["40'000", "200'000", "400'000+"]}
        />
      </div>
      {s.paar && (
        <div className="kunde-field" style={{ gap: 6 }}>
          <label className="kunde-field-label">
            Bruttoeinkommen Partner:in pro Jahr
          </label>
          <Slider
            value={s.income2}
            min={0}
            max={400_000}
            step={2_000}
            onChange={(v) => set({ income2: v })}
            format={(v) => fmt(v)}
            ticks={["0", "200'000", "400'000+"]}
          />
        </div>
      )}
      <div className="kunde-field" style={{ gap: 6 }}>
        <label className="kunde-field-label">
          {s.paar ? "Wunsch-Pensionierung — Sie" : "Wunsch-Pensionierung"}
        </label>
        <Slider
          value={s.retire1}
          min={58}
          max={70}
          step={1}
          onChange={(v) => set({ retire1: v })}
          format={(v) => `${v} Jahre`}
          side={
            s.retire1 < 65
              ? `Frühpension · ${65 - s.retire1} Jahre vor 65`
              : s.retire1 === 65
              ? "Ordentlich"
              : `Aufgeschoben · +${s.retire1 - 65}`
          }
          ticks={["58", "65 ordentlich", "70"]}
        />
      </div>
      {s.paar && (
        <div className="kunde-field" style={{ gap: 6 }}>
          <label className="kunde-field-label">
            Wunsch-Pensionierung — Partner:in
          </label>
          <Slider
            value={s.retire2}
            min={58}
            max={70}
            step={1}
            onChange={(v) => set({ retire2: v })}
            format={(v) => `${v} Jahre`}
            ticks={["58", "65", "70"]}
          />
        </div>
      )}
      <InfoPill>
        Eine Frühpension kostet bei der AHV ca. 6.8% Rente pro Jahr Vorbezug —
        wir berücksichtigen das automatisch.
      </InfoPill>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 3 — Vermögen (Module-Cards + Eigenheim Choice)
   ═══════════════════════════════════════════════════════════════════════ */

function StepVermoegen({ s, set }: { s: State; set: SetState }) {
  const total =
    s.wCash +
    s.wInvest +
    (s.hasImmo ? Math.max(0, s.immoValue - s.immoMortgage) : 0);

  return (
    <div className="kunde-step">
      <div className="kunde-step-head">
        <div className="kunde-step-eyebrow">Vermögen</div>
        <h2 className="kunde-step-title">
          Was haben Sie heute <em>auf der Seite?</em>
        </h2>
        <p className="kunde-step-sub">
          Grobe Schätzung reicht — wir verfeinern später. Pensionskasse und
          3. Säule kommen im nächsten Schritt.
        </p>
      </div>
      <div className="kunde-module-list">
        <ModuleCard
          icon={<IconBank />}
          title="Konto & Bargeld"
          desc="Lohn-, Sparkonto, Bargeld."
          value={s.wCash}
          onChange={(v) => set({ wCash: v })}
        />
        <ModuleCard
          icon={<IconChart />}
          title="Wertschriften & Fonds"
          desc="Aktien, ETFs, Anlagefonds, Krypto."
          value={s.wInvest}
          onChange={(v) => set({ wInvest: v })}
        />
      </div>
      <div className="kunde-choices kunde-choices-2">
        <button
          type="button"
          className={`kunde-choice ${!s.hasImmo ? "is-active" : ""}`}
          onClick={() => set({ hasImmo: false })}
          style={{
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            className="kunde-choice-check"
            style={{ position: "static", width: 18, height: 18 }}
          ></div>
          <div>
            <div className="kunde-choice-title" style={{ fontSize: 15 }}>
              Keine Immobilie
            </div>
            <div className="kunde-choice-desc" style={{ fontSize: 12 }}>
              Mieter:in.
            </div>
          </div>
        </button>
        <button
          type="button"
          className={`kunde-choice ${s.hasImmo ? "is-active" : ""}`}
          onClick={() => set({ hasImmo: true })}
          style={{
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            className="kunde-choice-check"
            style={{ position: "static", width: 18, height: 18 }}
          ></div>
          <div>
            <div className="kunde-choice-title" style={{ fontSize: 15 }}>
              Eigenheim
            </div>
            <div className="kunde-choice-desc" style={{ fontSize: 12 }}>
              Eigentumswohnung oder Haus.
            </div>
          </div>
        </button>
      </div>
      {s.hasImmo && (
        <div className="kunde-module-list">
          <ModuleCard
            icon={<IconHouse />}
            title="Verkehrswert"
            desc="Aktueller Marktwert (Schätzung reicht)."
            value={s.immoValue}
            onChange={(v) => set({ immoValue: v })}
          />
          <ModuleCard
            icon={<IconLines />}
            title="Hypothek"
            desc="Restschuld total über alle Tranchen."
            value={s.immoMortgage}
            onChange={(v) => set({ immoMortgage: v })}
          />
        </div>
      )}
      <div className="kunde-info-pill is-muted">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-3)",
          }}
        >
          SUMME
        </span>
        <strong
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 18,
            color: "var(--cuira-deep)",
            fontWeight: 500,
          }}
        >
          {fmt(total)}
        </strong>
        <span style={{ marginLeft: "auto", fontSize: 12 }}>
          Nettovermögen ohne Vorsorge
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 4 — Vorsorge (PK + 3a Module-Cards)
   ═══════════════════════════════════════════════════════════════════════ */

function StepVorsorge({ s, set }: { s: State; set: SetState }) {
  return (
    <div className="kunde-step">
      <div className="kunde-step-head">
        <div className="kunde-step-eyebrow">Vorsorge — Säule 2 & 3a</div>
        <h2 className="kunde-step-title">
          Was steht auf Ihrem <em>Vorsorgeausweis?</em>
        </h2>
        <p className="kunde-step-sub">
          Diese Zahlen finden Sie auf dem Vorsorgeausweis Ihrer Pensionskasse
          (jährlich per Post) und auf dem Auszug Ihrer 3a-Bank.
        </p>
      </div>
      <SubSection label="2. Säule · Pensionskasse">
        <div className="kunde-module-list">
          <ModuleCard
            icon="🏛"
            title={s.paar ? "Altersguthaben — Sie" : "Aktuelles Altersguthaben"}
            desc='Auf dem Ausweis als „Aktuelles Altersguthaben" oder „Sparkapital".'
            value={s.pk1}
            onChange={(v) => set({ pk1: v })}
          />
          <ModuleCard
            icon="📈"
            title={s.paar ? "Erwartete Rente p.a. — Sie" : "Erwartete Rente pro Jahr"}
            desc='Beim Ausweis unter „Voraussichtliche Altersrente" (jährlich).'
            value={s.pk1Rente}
            onChange={(v) => set({ pk1Rente: v })}
          />
          {s.paar && (
            <>
              <ModuleCard
                icon="🏛"
                title="Altersguthaben — Partner:in"
                desc="Vorsorgeausweis der zweiten Person."
                value={s.pk2}
                onChange={(v) => set({ pk2: v })}
              />
              <ModuleCard
                icon="📈"
                title="Erwartete Rente p.a. — Partner:in"
                desc="Voraussichtliche Altersrente, jährlich."
                value={s.pk2Rente}
                onChange={(v) => set({ pk2Rente: v })}
              />
            </>
          )}
        </div>
      </SubSection>
      <SubSection label="Säule 3a · Privatvorsorge">
        <div className="kunde-module-list">
          <ModuleCard
            icon="💰"
            title={s.paar ? "Aktuelles Guthaben — Sie" : "Aktuelles Guthaben"}
            desc="Total über alle 3a-Konten und -Depots."
            value={s.s3a1}
            onChange={(v) => set({ s3a1: v })}
          />
          {s.paar && (
            <ModuleCard
              icon="💰"
              title="Aktuelles Guthaben — Partner:in"
              desc="Total über alle 3a-Konten und -Depots."
              value={s.s3a2}
              onChange={(v) => set({ s3a2: v })}
            />
          )}
        </div>
      </SubSection>
      <InfoPill>
        Keinen Ausweis zur Hand? Lassen Sie die Felder leer — wir nehmen für
        die Vorab-Schätzung Schweizer Durchschnittswerte und korrigieren
        später im Beratungsgespräch.
      </InfoPill>
    </div>
  );
}

function SubSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 13,
          color: "var(--ink-3)",
          marginBottom: 10,
          fontFamily: "var(--font-mono)",
          letterSpacing: ".08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 5 — Wunsch (Lifestyle Sliders)
   ═══════════════════════════════════════════════════════════════════════ */

function StepWunsch({ s, set }: { s: State; set: SetState }) {
  const verhaeltnis = s.spendNow > 0 ? Math.round((s.spendRet / s.spendNow) * 100) : 0;
  return (
    <div className="kunde-step">
      <div className="kunde-step-head">
        <div className="kunde-step-eyebrow">Lebensstil</div>
        <h2 className="kunde-step-title">
          Wie viel möchten Sie <em>in der Pension ausgeben?</em>
        </h2>
        <p className="kunde-step-sub">
          Pro Jahr, alles inklusive — Wohnen, Essen, Versicherungen, Reisen,
          Hobbys. Faustregel: rund 75% Ihrer heutigen Ausgaben.
        </p>
      </div>
      <div className="kunde-field" style={{ gap: 6 }}>
        <label className="kunde-field-label">
          Heutige Ausgaben (für die Hochrechnung)
        </label>
        <Slider
          value={s.spendNow}
          min={40_000}
          max={300_000}
          step={2_000}
          onChange={(v) => set({ spendNow: v })}
          format={(v) => fmt(v)}
          side="pro Jahr · heute"
          ticks={["40'000", "150'000", "300'000+"]}
        />
      </div>
      <div className="kunde-field" style={{ gap: 6 }}>
        <label className="kunde-field-label">Wunschausgaben in der Pension</label>
        <Slider
          value={s.spendRet}
          min={40_000}
          max={300_000}
          step={2_000}
          onChange={(v) => set({ spendRet: v })}
          format={(v) => fmt(v)}
          side={`pro Jahr · ≈ ${verhaeltnis}% von heute`}
          ticks={["40'000", "150'000", "300'000+"]}
        />
      </div>
      <InfoPill>
        Tipp: Hypothek, Kinderkosten und Pensionskassenbeiträge fallen meist
        weg — gleichzeitig kommen mehr Reisen und Gesundheitskosten dazu.
      </InfoPill>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 6 — Ergebnis (Verdict-Card + KPIs + SVG-Chart)
   ═══════════════════════════════════════════════════════════════════════ */

function StepErgebnis({ s, result }: { s: State; result: Result }) {
  // Verdict-Card bewusst entfernt (User-Wunsch) — Kurz-Auswertung zeigt
  // nur die nackten Zahlen, keine Wertung. Berater liefert die Einordnung
  // im Detail-Gespräch.
  const startWealth = result.series[0]?.wealth ?? 0;
  const retWealth = result.atRet?.wealth ?? 0;
  const endWealth = result.at85?.wealth ?? 0;

  return (
    <div className="kunde-step">
      <div className="kunde-step-head">
        <div className="kunde-step-eyebrow">Ergebnis · Vorab-Berechnung</div>
        <h2 className="kunde-step-title">
          So sieht Ihr Plan <em>heute aus.</em>
        </h2>
        <p className="kunde-step-sub">
          Das ist eine Überschlagsrechnung mit Schweizer Durchschnitts-
          annahmen. Im Beratungsgespräch verfeinern wir alles auf Ihre
          Situation.
        </p>
      </div>
      <div className="kunde-result-card">
        <div className="kunde-result-kpis">
          <div className="kunde-result-kpi">
            <div className="kunde-result-kpi-label">
              Heute · {result.series[0]?.year}
            </div>
            <div className="kunde-result-kpi-value">{fmt(startWealth)}</div>
            <div className="kunde-result-kpi-sub">Nettovermögen total</div>
          </div>
          <div className="kunde-result-kpi">
            <div className="kunde-result-kpi-label">
              Pensionierung · {result.retYear}
            </div>
            <div className="kunde-result-kpi-value">{fmt(retWealth)}</div>
            <div className="kunde-result-kpi-sub">Vermögen bei Renteneintritt</div>
          </div>
          <div className="kunde-result-kpi">
            <div className="kunde-result-kpi-label">
              Mit Alter 85 · {s.geb1 + 85}
            </div>
            <div className="kunde-result-kpi-value">{fmt(endWealth)}</div>
            <div className="kunde-result-kpi-sub">Vermögen am Lebensabend</div>
          </div>
        </div>
        <div className="kunde-result-chart-card">
          <div className="kunde-result-chart-title">
            <span>Vermögensverlauf bis Alter 90+</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--ink-3)",
                fontSize: 11,
              }}
            >
              {result.series[0]?.year} →{" "}
              {result.series[result.series.length - 1]?.year}
            </span>
          </div>
          <ResultChart
            series={result.series}
            retYear={result.retYear}
            depleteYear={result.depleteYear}
          />
        </div>
      </div>
      <div className="kunde-info-pill is-muted">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 12l2-2 3 3 5-5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>
          Im nächsten Schritt können Sie die kostenpflichtige Detailanalyse
          (CHF 299.–) buchen — mit vollständigem PDF und 60-Min-Termin bei
          einem unabhängigen Cuira-Berater.
        </span>
      </div>
    </div>
  );
}

function ResultChart({
  series,
  retYear,
  depleteYear,
}: {
  series: SeriesPoint[];
  retYear: number;
  depleteYear: number | null;
}) {
  if (!series || series.length === 0) return null;
  const first = series[0];
  const last = series[series.length - 1];
  if (!first || !last) return null;
  const w = 660;
  const h = 180;
  const padL = 8;
  const padR = 8;
  const padT = 8;
  const padB = 24;
  const ys = series.map((r) => r.wealth);
  const minX = first.year;
  const maxX = last.year;
  const maxY = Math.max(...ys, 0);
  const minY = Math.min(...ys, 0);
  const sx = (x: number) =>
    padL + ((x - minX) / (maxX - minX)) * (w - padL - padR);
  const sy = (y: number) =>
    padT + (1 - (y - minY) / Math.max(1, maxY - minY)) * (h - padT - padB);
  const path = series
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${sx(p.year).toFixed(1)} ${sy(p.wealth).toFixed(1)}`
    )
    .join(" ");
  const area = `${path} L ${sx(maxX)} ${sy(0)} L ${sx(minX)} ${sy(0)} Z`;
  const retX = sx(retYear);
  const retPoint = series.find((r) => r.year === retYear)?.wealth || 0;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="kunde-result-chart-svg"
    >
      <defs>
        <linearGradient id="kunde-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--cuira-deep)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--cuira-deep)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1={padL}
        x2={w - padR}
        y1={sy(0)}
        y2={sy(0)}
        stroke="var(--border)"
        strokeDasharray="2 3"
      />
      <path d={area} fill="url(#kunde-grad)" />
      <path d={path} fill="none" stroke="var(--cuira-deep)" strokeWidth="2" />
      <line
        x1={retX}
        x2={retX}
        y1={padT}
        y2={h - padB}
        stroke="var(--accent)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <circle cx={retX} cy={sy(retPoint)} r="4" fill="var(--accent)" />
      <text
        x={retX + 6}
        y={padT + 11}
        fontSize="10"
        fill="var(--accent-ink)"
        fontFamily="var(--font-mono)"
      >
        Pension {retYear}
      </text>
      {depleteYear && (
        <>
          <line
            x1={sx(depleteYear)}
            x2={sx(depleteYear)}
            y1={padT}
            y2={h - padB}
            stroke="var(--neg)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <text
            x={sx(depleteYear) + 6}
            y={padT + 11}
            fontSize="10"
            fill="var(--neg)"
            fontFamily="var(--font-mono)"
          >
            Aufgebraucht {depleteYear}
          </text>
        </>
      )}
      <text
        x={padL}
        y={h - 6}
        fontSize="10"
        fill="var(--ink-3)"
        fontFamily="var(--font-mono)"
      >
        {minX}
      </text>
      <text
        x={w - padR}
        y={h - 6}
        fontSize="10"
        fill="var(--ink-3)"
        textAnchor="end"
        fontFamily="var(--font-mono)"
      >
        {maxX}
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 7 — Termin (Lead-Capture)
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Calendly-Buchungs-URL für Detailanalyse-Termin. Hinter Calendly-Event-Type
 * mit Stripe-Zahlung CHF 299 (in Calendly konfiguriert). UTM-Parameter
 * tracken die Quelle für Analytics.
 * In env-var anpassbar via NEXT_PUBLIC_CALENDLY_DETAIL_URL.
 */
const CALENDLY_DETAIL_URL =
  process.env.NEXT_PUBLIC_CALENDLY_DETAIL_URL ??
  "https://calendly.com/cuirapartners/detailanalyse?utm_source=kunde-tool";
const DETAILANALYSE_PREIS_CHF = 299;

function StepTermin({
  s,
}: {
  s: State;
  set: SetState;
  onSubmit: () => void;
  submitted: boolean;
}) {
  // Pre-fill Calendly mit erfassten Daten via URL-Parameter (Calendly-Standard).
  const calendlyUrl = useMemo(() => {
    const u = new URL(CALENDLY_DETAIL_URL);
    if (s.name) u.searchParams.set("name", s.name);
    if (s.email) u.searchParams.set("email", s.email);
    if (s.phone) {
      const customParam = `a1=${encodeURIComponent(s.phone)}`;
      u.search = u.search ? `${u.search}&${customParam}` : `?${customParam}`;
    }
    return u.toString();
  }, [s.name, s.email, s.phone]);

  return (
    <div className="kunde-step">
      <div className="kunde-step-head">
        <div className="kunde-step-eyebrow">
          Detailanalyse · CHF {DETAILANALYSE_PREIS_CHF}.– · 60 Min
        </div>
        <h2 className="kunde-step-title">
          Holen Sie sich die <em>vollständige Auswertung.</em>
        </h2>
        <p className="kunde-step-sub">
          Sie haben jetzt die Kurz-Auswertung gesehen. In der Detailanalyse
          erhalten Sie das volle PDF Ihres Pensionsplans + ein 60-minütiges
          Beratungsgespräch mit einem unabhängigen Cuira-Berater. Honorar-
          basiert, keine Provisionen, keine Verkaufsgespräche.
        </p>
      </div>

      <div className="kunde-lead-card">
        <div>
          <div className="kunde-lead-eyebrow">Was Sie erhalten</div>
          <div className="kunde-lead-title">
            CHF {DETAILANALYSE_PREIS_CHF}.– einmalig
          </div>
        </div>

        <ul
          style={{
            margin: "12px 0 0",
            padding: 0,
            listStyle: "none",
            color: "rgba(255,255,255,0.85)",
            fontSize: 14,
            lineHeight: 1.7,
            display: "grid",
            gap: 8,
          }}
        >
          <li>✓ Vollständiges PDF (~22 Seiten) mit Jahres-Tabellen</li>
          <li>✓ Steueroptimierungs-Empfehlungen (PK-Einkauf, 3a, Bezug)</li>
          <li>✓ Stress-Test-Szenarien (Crash, Inflation, Pflegekosten)</li>
          <li>✓ Massnahmen-Plan mit Wer/Wann/Was</li>
          <li>✓ KI-gestützte Optimierungs-Empfehlungen</li>
          <li>✓ 60-Min-Beratungsgespräch (Video oder vor Ort)</li>
        </ul>

        <div
          className="kunde-lead-cta-row"
          style={{ marginTop: 20 }}
        >
          <a
            className="kunde-btn-bright"
            href={calendlyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none", display: "inline-block" }}
          >
            Jetzt buchen — CHF {DETAILANALYSE_PREIS_CHF}.– →
          </a>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
            Sichere Zahlung via Calendly + Stripe
          </span>
        </div>

        <div className="kunde-lead-trust">
          <span>FINMA-konform</span>
          <span>Honorarberatung</span>
          <span>Kein Datenverkauf</span>
          <span>DSGVO + revDSG</span>
        </div>
      </div>

      {/* Calendly-Embed direkt in der Page — Berater kann auch ohne
          externen Tab buchen. Iframe-Höhe 700px deckt Standard-Calendly-UI. */}
      <div
        style={{
          marginTop: 24,
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "white",
        }}
      >
        <iframe
          src={calendlyUrl}
          title="Termin buchen — Detailanalyse"
          style={{ width: "100%", height: 700, border: 0 }}
          loading="lazy"
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Reusable Primitives — Slider, ModuleCard, InfoPill
   ═══════════════════════════════════════════════════════════════════════ */

function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
  side,
  ticks,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  side?: string | null;
  ticks?: string[];
}) {
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <div className="kunde-slider-wrap">
      <div className="kunde-slider-value-row">
        <div className="kunde-slider-value">{format(value)}</div>
        {side && <div className="kunde-slider-value-side">{side}</div>}
      </div>
      <input
        className="kunde-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ "--fill": fill } as React.CSSProperties}
      />
      {ticks && (
        <div className="kunde-slider-ticks">
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleCard({
  icon,
  title,
  desc,
  value,
  onChange,
  suffix = "CHF",
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="kunde-module-card">
      <div className="kunde-module-icon">{icon}</div>
      <div className="kunde-module-info">
        <div className="kunde-module-title">{title}</div>
        <div className="kunde-module-desc">{desc}</div>
      </div>
      <input
        className="kunde-module-input"
        type="text"
        value={
          value === 0
            ? ""
            : value.toLocaleString("de-CH").replace(/,/g, "'")
        }
        placeholder="0"
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          onChange(raw === "" ? 0 : parseInt(raw, 10));
        }}
      />
      <div className="kunde-module-suffix">{suffix}</div>
    </div>
  );
}

function InfoPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="kunde-info-pill">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle
          cx="8"
          cy="8"
          r="6.5"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <circle cx="8" cy="5" r="0.9" fill="currentColor" />
        <path
          d="M8 7.5v4"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
      <div>{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Inline-SVG Icons
   ═══════════════════════════════════════════════════════════════════════ */

function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8h10m0 0L9 4m4 4l-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M13 8H3m0 0l4 4m-4-4l4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 21c0-3.5 3.1-6 7-6s7 2.5 7 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCouple() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3 21c0-3 2.5-5 5-5s5 2 5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M11 21c0-3 2.5-5 5-5s5 2 5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBank() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="6"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 18l5-6 4 4 7-9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 7h6v6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHouse() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLines() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 8h14M5 12h14M5 16h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
