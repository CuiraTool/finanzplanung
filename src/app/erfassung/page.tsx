"use client";

/**
 * V2 — Affiliate-Erfassung (Phase 6 Migration nach Cuira-Design-Handoff).
 *
 * Single-Page mit 12 Sektionen, Scroll-Spy + Sticky Übergabe-Panel rechts.
 * Affiliates erfassen alle Kunden-Stammdaten direkt — kein Frage-Flow,
 * weil professionelle Erfasser schneller in einem zusammenhängenden
 * Formular arbeiten als in einem Step-by-Step.
 *
 * Architektur:
 * - **Daten** kommen aus PlanStore (Zustand, persistiert mit Schema v25)
 * - **Berater-Meta + priority/notiz/docs** sind in BeraterMeta (separater
 *   localStorage-Key "cuira-erfassung-meta")
 * - **Submission** geht über bestehende `submitErfassung` (Resend-Email
 *   oder JSON-Download als Fallback)
 *
 * Layout:
 * - Topbar 56px: Cuira-Chip · Affiliate-Pill · Advisor-Avatar · Suche · Save · Pro-Link
 * - Linke Nav 240px: 12 Sektionen in 4 Gruppen (Stammdaten, Vorsorge,
 *   Substanz, Übergabe), Scroll-Spy zeigt aktive Section, Check-Indicator
 *   pro vollständige Sektion
 * - Form-Center: 12 sektionierte Karten mit dichter Row-Layout, Repeater-
 *   Tables für Vermögen + Immobilien, Segmented Controls
 * - Rechte Aside 320px: Progress-Ring + Section-Checklist + Berater-Notiz
 *   + Submit-CTA. (Provisions-Block + Prioritäten-Picker entfernt — User-
 *   Wunsch: Berater-Erfassung soll mit Pro-Tool matchen, ohne Affiliate-
 *   Mehrwertaussichten und ohne Prioritäten-Vorab-Erfassung.)
 *
 * Income-Mapping: Netto-Jahreslohn pro Person → wird intern × 1.15 als
 * AHV-Brutto gespeichert (Skala 44) UND als Netto-Summe in
 * budget.einkommenHeute. Berater verfeinert beides bei Bedarf im Pro-Tool.
 */

import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import Link from "next/link";
import { usePlanStore, type PlanState } from "@/lib/store";
import {
  buildSubmission,
  downloadJson,
  readMeta,
  submitErfassung,
  writeMeta,
  leereBeraterMeta,
} from "@/flow/submission";
import type {
  BeraterMeta,
  ErfassungPriority,
  ErfassungDoc,
  ErfassungDocs,
} from "@/flow/types";
import { KANTONE } from "@/lib/store";

const CALENDLY_URL = "https://calendly.com/kathir-cuira/meeting";

const SECTIONS = [
  { id: "personen", num: "01", label: "Personen", group: "Stammdaten" },
  { id: "ziele", num: "02", label: "Ziele & Wünsche", group: "Stammdaten" },
  { id: "budget", num: "03", label: "Budget", group: "Stammdaten" },
  { id: "ahv", num: "04", label: "1. Säule (AHV)", group: "Vorsorge" },
  { id: "pk", num: "05", label: "Pensionskasse", group: "Vorsorge" },
  { id: "s3", num: "06", label: "3. Säule", group: "Vorsorge" },
  { id: "vermoegen", num: "07", label: "Vermögen", group: "Substanz" },
  { id: "immo", num: "08", label: "Immobilien", group: "Substanz" },
  { id: "firma", num: "09", label: "Firma", group: "Substanz" },
  { id: "nachlass", num: "10", label: "Nachlass", group: "Substanz" },
  { id: "docs", num: "11", label: "Dokumente", group: "Übergabe" },
  { id: "uebergabe", num: "12", label: "Notiz & Senden", group: "Übergabe" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const NAV_GROUPS = [
  "Stammdaten",
  "Vorsorge",
  "Substanz",
  "Übergabe",
] as const;

/* ═══════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════ */

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "";
  return Math.round(n).toLocaleString("de-CH").replace(/,/g, "'");
}

function parseN(raw: string): number {
  const cleaned = String(raw).replace(/[^0-9-]/g, "");
  return cleaned === "" || cleaned === "-" ? 0 : parseInt(cleaned, 10);
}

function leereDocs(): ErfassungDocs {
  return {
    vorsorgeausweisP1: null,
    vorsorgeausweisP2: null,
    steuererklaerung: null,
    saeule3aP1: null,
    saeule3aP2: null,
  };
}

function generateMandantId(): string {
  const j = new Date().getFullYear();
  const r = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  return `M-${j}-${r}`;
}

/* ═══════════════════════════════════════════════════════════════════════
   Vollständigkeits-Logik (für Nav-Checks + Übergabe-Ring)
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Vollständigkeits-Check pro Sektion — strenge Heuristik.
 *
 * Wichtig: Default-Werte (Pensionsalter 65, "Firma: nicht vorhanden",
 * Default-Privatkonto ohne Saldo) zählen NICHT als erfasst. Erst echte
 * Berater-Eingaben hakt eine Sektion ab.
 */
function completion(
  s: PlanState,
  meta: BeraterMeta
): Record<SectionId, boolean> {
  const isPaar = s.fallart === "paar";
  const saeule3aTotal =
    s.saeuleDrei.p1.reduce(
      (a, e) => a + (e.aktuellerWert ?? 0) + (e.rueckkaufswert ?? 0),
      0
    ) +
    s.saeuleDrei.p2.reduce(
      (a, e) => a + (e.aktuellerWert ?? 0) + (e.rueckkaufswert ?? 0),
      0
    );
  return {
    personen: !!(
      s.person1.vorname &&
      s.person1.geburtsdatum &&
      s.adresse.plz &&
      (!isPaar || (s.person2.vorname && s.person2.geburtsdatum))
    ),
    // Wunschverbrauch oder einmalige Ausgaben — Pensionsalter ist Default.
    ziele:
      (s.budget.wunschverbrauchPension ?? 0) > 0 ||
      s.einmaligeAusgaben.length > 0,
    budget:
      (s.budget.einkommenHeute ?? 0) > 0 ||
      (s.budget.ausgabenTotal ?? 0) > 0,
    ahv: (s.ahv.einkommenP1 ?? 0) > 0,
    pk: (s.bvg.p1.altersguthabenHeute ?? 0) > 0,
    s3: saeule3aTotal > 0,
    // Default-Privatkonto mit saldo=null zählt nicht.
    vermoegen: s.vermoegen.items.some((it) => (it.saldoHeute ?? 0) !== 0),
    // Mindestens eine Liegenschaft mit Verkehrswert.
    immo: s.immobilien.items.some((im) => (im.verkehrswert ?? 0) > 0),
    // Nur wenn aktiv "vorhanden + Name" — "keine Firma" als Default zählt nicht.
    firma: s.firma.vorhanden && !!s.firma.firmenname,
    // Mindestens ein Nachlass-Häkchen gesetzt.
    nachlass: (Object.values(s.nachlass) as string[]).some(
      (v) => v === "ja" || v === "nicht_notwendig"
    ),
    docs: !!meta.docs?.vorsorgeausweisP1?.attached,
    uebergabe: (meta.notiz?.length ?? 0) >= 10,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════════════ */

export default function ErfassungPage() {
  const plan = usePlanStore();
  const [meta, setMeta] = useState<BeraterMeta>(() => {
    const m = readMeta();
    return {
      ...m,
      priority: m.priority ?? "normal",
      notiz: m.notiz ?? "",
      mandantId: m.mandantId ?? generateMandantId(),
      docs: m.docs ?? leereDocs(),
    };
  });

  const [active, setActive] = useState<SectionId>("personen");
  const [submitState, setSubmitState] = useState<{
    loading: boolean;
    done: boolean;
    emailGesendet: boolean | null;
    error: string | null;
  }>({ loading: false, done: false, emailGesendet: null, error: null });

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const setSectionRef = useCallback(
    (id: SectionId) => (el: HTMLElement | null) => {
      sectionRefs.current[id] = el;
    },
    []
  );

  const updateMeta = useCallback((patch: Partial<BeraterMeta>) => {
    setMeta((prev) => {
      const next = { ...prev, ...patch };
      writeMeta(next);
      return next;
    });
  }, []);

  const comp = useMemo(() => completion(plan, meta), [plan, meta]);

  // Scroll-Spy: aktive Section bei Scroll setzen
  useEffect(() => {
    const main = document.querySelector(".erf-main") as HTMLElement | null;
    if (!main) return;
    const onScroll = () => {
      const scrollTop = main.scrollTop + 100;
      let current: SectionId = "personen";
      for (const sec of SECTIONS) {
        const el = sectionRefs.current[sec.id];
        if (el && el.offsetTop <= scrollTop) current = sec.id;
      }
      setActive(current);
    };
    main.addEventListener("scroll", onScroll, { passive: true });
    return () => main.removeEventListener("scroll", onScroll);
  }, []);

  const jumpTo = (id: SectionId) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async () => {
    setSubmitState({
      loading: true,
      done: false,
      emailGesendet: null,
      error: null,
    });
    const sub = buildSubmission(usePlanStore.getState(), meta);
    const res = await submitErfassung(sub);
    setSubmitState({
      loading: false,
      done: true,
      emailGesendet: res.emailGesendet,
      error: res.error ?? null,
    });
  };

  const handleDownloadJson = () => {
    const sub = buildSubmission(usePlanStore.getState(), meta);
    const filename = `cuira-erfassung-${
      plan.person1.nachname || meta.kundeP1Name || "kunde"
    }-${meta.datum || new Date().toISOString().slice(0, 10)}.json`
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-");
    downloadJson(sub, filename);
  };

  return (
    <div data-mode="erfassung">
      <div className="erf-stage">
        <Topbar meta={meta} updateMeta={updateMeta} />

        <div className="erf-shell">
          <SideNav active={active} comp={comp} onJump={jumpTo} />

          <main className="erf-main">
            <SectionWrapper
              id="personen"
              num="01"
              title="Personen"
              setRef={setSectionRef("personen")}
            >
              <SecPersonen />
            </SectionWrapper>

            <SectionWrapper
              id="ziele"
              num="02"
              title="Ziele & Wünsche"
              setRef={setSectionRef("ziele")}
            >
              <SecZiele />
            </SectionWrapper>

            <SectionWrapper
              id="budget"
              num="03"
              title="Budget"
              setRef={setSectionRef("budget")}
            >
              <SecBudget />
            </SectionWrapper>

            <SectionWrapper
              id="ahv"
              num="04"
              title="1. Säule (AHV)"
              setRef={setSectionRef("ahv")}
            >
              <SecAhv />
            </SectionWrapper>

            <SectionWrapper
              id="pk"
              num="05"
              title="Pensionskasse"
              setRef={setSectionRef("pk")}
            >
              <SecPk />
            </SectionWrapper>

            <SectionWrapper
              id="s3"
              num="06"
              title="3. Säule"
              setRef={setSectionRef("s3")}
            >
              <SecS3 />
            </SectionWrapper>

            <SectionWrapper
              id="vermoegen"
              num="07"
              title="Vermögen"
              setRef={setSectionRef("vermoegen")}
              meta={`${plan.vermoegen.items.length} Position${
                plan.vermoegen.items.length !== 1 ? "en" : ""
              }`}
            >
              <SecVermoegen />
            </SectionWrapper>

            <SectionWrapper
              id="immo"
              num="08"
              title="Immobilien"
              setRef={setSectionRef("immo")}
              meta={`${plan.immobilien.items.length} Liegenschaft${
                plan.immobilien.items.length !== 1 ? "en" : ""
              }`}
            >
              <SecImmo />
            </SectionWrapper>

            <SectionWrapper
              id="firma"
              num="09"
              title="Firma"
              setRef={setSectionRef("firma")}
            >
              <SecFirma />
            </SectionWrapper>

            <SectionWrapper
              id="nachlass"
              num="10"
              title="Nachlass"
              setRef={setSectionRef("nachlass")}
            >
              <SecNachlass />
            </SectionWrapper>

            <SectionWrapper
              id="docs"
              num="11"
              title="Dokumente"
              setRef={setSectionRef("docs")}
              meta="optional"
            >
              <SecDocs meta={meta} updateMeta={updateMeta} />
            </SectionWrapper>

            <SectionWrapper
              id="uebergabe"
              num="12"
              title="Notiz & Senden"
              setRef={setSectionRef("uebergabe")}
            >
              <SecUebergabe meta={meta} updateMeta={updateMeta} />
            </SectionWrapper>
          </main>

          <Handoff
            meta={meta}
            updateMeta={updateMeta}
            comp={comp}
            plan={plan}
            onSubmit={handleSubmit}
            submitState={submitState}
            onDownloadJson={handleDownloadJson}
          />
        </div>

        {submitState.loading && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(10,37,64,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
          >
            <div
              style={{
                background: "var(--surface)",
                padding: "16px 24px",
                borderRadius: 12,
                fontSize: 14,
                boxShadow: "var(--shadow-pop)",
              }}
            >
              Wird übermittelt …
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Topbar
   ═══════════════════════════════════════════════════════════════════════ */

function Topbar({
  meta,
  updateMeta,
}: {
  meta: BeraterMeta;
  updateMeta: (p: Partial<BeraterMeta>) => void;
}) {
  const initials = (meta.beraterName || "Affiliate")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="erf-topbar">
      <div className="erf-logo-chip">cuira</div>
      <span className="erf-affiliate-pill">Vertriebspartner</span>
      <div className="erf-advisor">
        <div className="erf-advisor-avatar">{initials || "AF"}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <span style={{ fontSize: 11.5, color: "var(--ink)", fontWeight: 500 }}>
            {meta.beraterName || (
              <input
                type="text"
                placeholder="Berater-Name"
                value={meta.beraterName}
                onChange={(e) => updateMeta({ beraterName: e.target.value })}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: "var(--ink)",
                  outline: "none",
                  fontFamily: "inherit",
                  width: 110,
                }}
              />
            )}
          </span>
          <span style={{ fontSize: 10, color: "var(--ink-3)" }}>
            {meta.partnerfirma || (
              <input
                type="text"
                placeholder="Partnerfirma"
                value={meta.partnerfirma}
                onChange={(e) => updateMeta({ partnerfirma: e.target.value })}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 10,
                  color: "var(--ink-3)",
                  outline: "none",
                  fontFamily: "inherit",
                  width: 110,
                }}
              />
            )}
          </span>
        </div>
      </div>
      <div className="erf-search">
        <SearchIcon />
        <input
          type="text"
          placeholder={`Mandant ${meta.mandantId ?? ""}`}
          readOnly
        />
      </div>
      <div className="erf-spacer" />
      <span className="erf-autosave">
        <span className="cui-autosave-dot"></span>
        Auto-gespeichert
      </span>
      <Link href="/" className="erf-pro-link">
        Pro-Modus →
      </Link>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M11 11l3 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Side-Nav
   ═══════════════════════════════════════════════════════════════════════ */

function SideNav({
  active,
  comp,
  onJump,
}: {
  active: SectionId;
  comp: Record<SectionId, boolean>;
  onJump: (id: SectionId) => void;
}) {
  return (
    <nav className="erf-sidenav">
      {NAV_GROUPS.map((group) => (
        <div key={group} className="erf-nav-group">
          <div className="erf-nav-group-h">{group}</div>
          {SECTIONS.filter((s) => s.group === group).map((sec) => {
            const isActive = active === sec.id;
            const isDone = comp[sec.id];
            return (
              <button
                key={sec.id}
                type="button"
                className={`erf-nav-item ${isActive ? "is-active" : ""} ${
                  isDone ? "is-done" : ""
                }`}
                onClick={() => onJump(sec.id)}
              >
                <span className="erf-nav-num">{sec.num}</span>
                <span>{sec.label}</span>
                <span className="erf-nav-check"></span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section-Wrapper
   ═══════════════════════════════════════════════════════════════════════ */

function SectionWrapper({
  id,
  num,
  title,
  meta,
  setRef,
  children,
}: {
  id: string;
  num: string;
  title: string;
  meta?: string;
  setRef: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <section ref={setRef} id={`sec-${id}`} className="erf-section">
      <header className="erf-section-head">
        <span className="erf-section-num">{num}</span>
        <h2 className="erf-section-title">{title}</h2>
        {meta && <span className="erf-section-meta">{meta}</span>}
      </header>
      <div className="erf-section-body">{children}</div>
    </section>
  );
}

function Row({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  // <label> statt <div>: das umschliessende Label verknüpft den enthaltenen
  // Input/Select implizit — Klick auf den Beschriftungstext fokussiert das
  // Feld, Screenreader lesen den Feldnamen. Schliesst die WCAG-1.3.1/4.1.2-
  // Lücke (Felder ohne zugeordnete Beschriftung).
  return (
    <label className="erf-row">
      <div className="erf-row-label">
        <span>{label}</span>
        {help && <span className="erf-row-help">{help}</span>}
      </div>
      <div className="erf-row-control">{children}</div>
    </label>
  );
}

function NumInput({
  value,
  onChange,
  suffix = "CHF",
  placeholder = "0",
}: {
  value: number | null | undefined;
  onChange: (v: number) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div className="erf-input-with-suffix">
      <input
        className="erf-input is-num"
        type="text"
        value={fmt(value)}
        placeholder={placeholder}
        onChange={(e) => onChange(parseN(e.target.value))}
      />
      <span className="erf-suffix">{suffix}</span>
    </div>
  );
}

function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="erf-seg">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? "is-active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`erf-check ${checked ? "is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="erf-check-box"></span>
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section: Personen
   ═══════════════════════════════════════════════════════════════════════ */

function SecPersonen() {
  const fallart = usePlanStore((s) => s.fallart);
  const setFallart = usePlanStore((s) => s.setFallart);
  const adresse = usePlanStore((s) => s.adresse);
  const setAdresse = usePlanStore((s) => s.setAdresse);
  const person1 = usePlanStore((s) => s.person1);
  const setPerson1 = usePlanStore((s) => s.setPerson1);
  const person2 = usePlanStore((s) => s.person2);
  const setPerson2 = usePlanStore((s) => s.setPerson2);
  const isPaar = fallart === "paar";

  return (
    <>
      <Row label="Fall-Art">
        <Seg
          value={fallart}
          onChange={(v) => setFallart(v)}
          options={[
            { value: "einzel" as const, label: "Einzelperson" },
            { value: "paar" as const, label: "Paar" },
          ]}
        />
      </Row>
      <Row label={isPaar ? "Person 1 · Name" : "Name"}>
        <input
          className="erf-input is-grow"
          placeholder="Vorname"
          value={person1.vorname}
          onChange={(e) => setPerson1({ vorname: e.target.value })}
        />
        <input
          className="erf-input is-grow"
          placeholder="Nachname"
          value={person1.nachname}
          onChange={(e) => setPerson1({ nachname: e.target.value })}
        />
      </Row>
      <Row label={isPaar ? "Person 1 · Geburtsdatum" : "Geburtsdatum"}>
        <input
          className="erf-input mono"
          type="date"
          value={person1.geburtsdatum}
          onChange={(e) => setPerson1({ geburtsdatum: e.target.value })}
        />
      </Row>
      {isPaar && (
        <>
          <Row label="Person 2 · Name">
            <input
              className="erf-input is-grow"
              placeholder="Vorname"
              value={person2.vorname}
              onChange={(e) => setPerson2({ vorname: e.target.value })}
            />
            <input
              className="erf-input is-grow"
              placeholder="Nachname"
              value={person2.nachname}
              onChange={(e) => setPerson2({ nachname: e.target.value })}
            />
          </Row>
          <Row label="Person 2 · Geburtsdatum">
            <input
              className="erf-input mono"
              type="date"
              value={person2.geburtsdatum}
              onChange={(e) => setPerson2({ geburtsdatum: e.target.value })}
            />
          </Row>
        </>
      )}
      <Row label="Strasse · Nr.">
        <input
          className="erf-input is-grow"
          value={adresse.strasse}
          onChange={(e) => setAdresse({ strasse: e.target.value })}
        />
      </Row>
      <Row label="PLZ · Ort">
        <input
          className="erf-input"
          style={{ width: 90 }}
          value={adresse.plz}
          onChange={(e) => setAdresse({ plz: e.target.value })}
        />
        <input
          className="erf-input is-grow"
          value={adresse.ort}
          onChange={(e) => setAdresse({ ort: e.target.value })}
        />
      </Row>
      <Row label="Steuerkanton">
        <select
          className="erf-input"
          value={adresse.kanton}
          onChange={(e) => setAdresse({ kanton: e.target.value })}
        >
          <option value="">— wählen —</option>
          {KANTONE.map((k) => (
            <option key={k.code} value={k.code}>
              {k.code} · {k.name}
            </option>
          ))}
        </select>
      </Row>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section: Ziele
   ═══════════════════════════════════════════════════════════════════════ */

function SecZiele() {
  const fallart = usePlanStore((s) => s.fallart);
  const ziele = usePlanStore((s) => s.ziele);
  const setZiele = usePlanStore((s) => s.setZiele);
  const budget = usePlanStore((s) => s.budget);
  const setWunschverbrauchPension = usePlanStore(
    (s) => s.setWunschverbrauchPension
  );
  const isPaar = fallart === "paar";

  return (
    <>
      <Row label={isPaar ? "Wunsch-Pensionsalter P1" : "Wunsch-Pensionsalter"}>
        <input
          className="erf-input mono"
          type="number"
          min="58"
          max="70"
          style={{ width: 80 }}
          value={ziele.bezugsalterP1 || 65}
          onChange={(e) =>
            setZiele({ bezugsalterP1: parseInt(e.target.value || "65", 10) })
          }
        />
        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
          {ziele.bezugsalterP1 < 65
            ? `Frühpension · ${65 - ziele.bezugsalterP1} J. vor 65`
            : ziele.bezugsalterP1 === 65
            ? "Ordentlich"
            : `Aufgeschoben · +${ziele.bezugsalterP1 - 65}`}
        </span>
      </Row>
      {isPaar && (
        <Row label="Wunsch-Pensionsalter P2">
          <input
            className="erf-input mono"
            type="number"
            min="58"
            max="70"
            style={{ width: 80 }}
            value={ziele.bezugsalterP2 || 65}
            onChange={(e) =>
              setZiele({
                bezugsalterP2: parseInt(e.target.value || "65", 10),
              })
            }
          />
        </Row>
      )}
      <Row
        label="Wunschverbrauch Pension"
        help="CHF pro Monat — alles inkl."
      >
        <NumInput
          value={budget.wunschverbrauchPension}
          onChange={(v) => setWunschverbrauchPension(v)}
          suffix="CHF/Mt"
        />
      </Row>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section: Budget
   ═══════════════════════════════════════════════════════════════════════ */

function SecBudget() {
  const budget = usePlanStore((s) => s.budget);
  const setAusgabenTotal = usePlanStore((s) => s.setAusgabenTotal);
  const setSteuerAnker = usePlanStore((s) => s.setSteuerAnker);
  const setReligion = usePlanStore((s) => s.setReligion);

  return (
    <>
      <Row label="Brutto-Einkommen Total" help="CHF pro Jahr — Anker für Steuern">
        <NumInput
          value={budget.einkommenHeute}
          onChange={(v) => setSteuerAnker(budget.steuernHeute, v)}
          suffix="CHF/J"
        />
      </Row>
      <Row label="Ausgaben Total" help="CHF pro Monat — alle laufenden Ausgaben">
        <NumInput
          value={budget.ausgabenTotal}
          onChange={(v) => setAusgabenTotal(v)}
          suffix="CHF/Mt"
        />
      </Row>
      <Row label="Steuern (letzte Veranlagung)" help="Total Eink. + Vermögen">
        <NumInput
          value={budget.steuernHeute}
          onChange={(v) => setSteuerAnker(v, budget.einkommenHeute)}
          suffix="CHF/J"
        />
      </Row>
      <Row label="Religion" help="Für Kirchensteuer">
        <Seg
          value={budget.religion}
          onChange={(v) => setReligion(v)}
          options={[
            { value: "katholisch" as const, label: "Katholisch" },
            { value: "reformiert" as const, label: "Reformiert" },
            { value: "keine" as const, label: "Keine" },
          ]}
        />
      </Row>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section: AHV
   ═══════════════════════════════════════════════════════════════════════ */

function SecAhv() {
  const fallart = usePlanStore((s) => s.fallart);
  const ahv = usePlanStore((s) => s.ahv);
  const setAhv = usePlanStore((s) => s.setAhv);
  const isPaar = fallart === "paar";

  return (
    <>
      <Row
        label={`Massgebendes Einkommen${isPaar ? " P1" : ""}`}
        help="Durchschnitt Erwerbseinkommen p.a."
      >
        <NumInput
          value={ahv.einkommenP1}
          onChange={(v) => setAhv({ einkommenP1: v })}
          suffix="CHF/J"
        />
      </Row>
      <Row label={`AHV-Bezugsalter${isPaar ? " P1" : ""}`}>
        <input
          className="erf-input mono"
          type="number"
          min="63"
          max="70"
          style={{ width: 80 }}
          value={ahv.ahvBezugsalterP1}
          onChange={(e) =>
            setAhv({ ahvBezugsalterP1: parseInt(e.target.value || "65", 10) })
          }
        />
      </Row>
      <Row label={`Beitragslücken${isPaar ? " P1" : ""}`} help="Anzahl Jahre">
        <input
          className="erf-input mono"
          type="number"
          min="0"
          max="44"
          style={{ width: 80 }}
          value={ahv.fehljahreAnzahlP1}
          onChange={(e) =>
            setAhv({ fehljahreAnzahlP1: parseInt(e.target.value || "0", 10) })
          }
        />
      </Row>
      {isPaar && (
        <>
          <Row label="Massgebendes Einkommen P2" help="Durchschnitt p.a.">
            <NumInput
              value={ahv.einkommenP2}
              onChange={(v) => setAhv({ einkommenP2: v })}
              suffix="CHF/J"
            />
          </Row>
          <Row label="AHV-Bezugsalter P2">
            <input
              className="erf-input mono"
              type="number"
              min="63"
              max="70"
              style={{ width: 80 }}
              value={ahv.ahvBezugsalterP2}
              onChange={(e) =>
                setAhv({
                  ahvBezugsalterP2: parseInt(e.target.value || "65", 10),
                })
              }
            />
          </Row>
          <Row label="Beitragslücken P2">
            <input
              className="erf-input mono"
              type="number"
              min="0"
              max="44"
              style={{ width: 80 }}
              value={ahv.fehljahreAnzahlP2}
              onChange={(e) =>
                setAhv({
                  fehljahreAnzahlP2: parseInt(e.target.value || "0", 10),
                })
              }
            />
          </Row>
        </>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section: PK / BVG
   ═══════════════════════════════════════════════════════════════════════ */

function SecPk() {
  const fallart = usePlanStore((s) => s.fallart);
  const bvg = usePlanStore((s) => s.bvg);
  const setBvgP1 = usePlanStore((s) => s.setBvgP1);
  const setBvgP2 = usePlanStore((s) => s.setBvgP2);
  const isPaar = fallart === "paar";

  return (
    <>
      <Row
        label={`Altersguthaben heute${isPaar ? " P1" : ""}`}
        help="Vom PK-Ausweis"
      >
        <NumInput
          value={bvg.p1.altersguthabenHeute}
          onChange={(v) => setBvgP1({ altersguthabenHeute: v })}
        />
      </Row>
      <Row label={`Voraussichtl. bei Bezug${isPaar ? " P1" : ""}`}>
        <NumInput
          value={bvg.p1.altersguthabenBeiBezug}
          onChange={(v) => setBvgP1({ altersguthabenBeiBezug: v })}
        />
      </Row>
      <Row label={`Umwandlungssatz${isPaar ? " P1" : ""}`}>
        <input
          className="erf-input mono"
          type="number"
          step="0.1"
          style={{ width: 80 }}
          value={bvg.p1.umwandlungssatzProzent}
          onChange={(e) =>
            setBvgP1({
              umwandlungssatzProzent: parseFloat(e.target.value || "5.5"),
            })
          }
        />
        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>%</span>
      </Row>
      <Row label={`Bezugsform${isPaar ? " P1" : ""}`}>
        <Seg
          value={bvg.p1.bezugspraeferenz}
          onChange={(v) => setBvgP1({ bezugspraeferenz: v })}
          options={[
            { value: "rente" as const, label: "Rente" },
            { value: "kapital" as const, label: "Kapital" },
            { value: "mischung" as const, label: "Mischung" },
          ]}
        />
      </Row>
      {isPaar && (
        <>
          <div
            style={{
              borderTop: "1px dashed var(--border)",
              margin: "8px 14px",
            }}
          />
          <Row label="Altersguthaben heute P2">
            <NumInput
              value={bvg.p2.altersguthabenHeute}
              onChange={(v) => setBvgP2({ altersguthabenHeute: v })}
            />
          </Row>
          <Row label="Voraussichtl. bei Bezug P2">
            <NumInput
              value={bvg.p2.altersguthabenBeiBezug}
              onChange={(v) => setBvgP2({ altersguthabenBeiBezug: v })}
            />
          </Row>
          <Row label="Umwandlungssatz P2">
            <input
              className="erf-input mono"
              type="number"
              step="0.1"
              style={{ width: 80 }}
              value={bvg.p2.umwandlungssatzProzent}
              onChange={(e) =>
                setBvgP2({
                  umwandlungssatzProzent: parseFloat(e.target.value || "5.5"),
                })
              }
            />
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>%</span>
          </Row>
          <Row label="Bezugsform P2">
            <Seg
              value={bvg.p2.bezugspraeferenz}
              onChange={(v) => setBvgP2({ bezugspraeferenz: v })}
              options={[
                { value: "rente" as const, label: "Rente" },
                { value: "kapital" as const, label: "Kapital" },
                { value: "mischung" as const, label: "Mischung" },
              ]}
            />
          </Row>
        </>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section: 3. Säule
   ═══════════════════════════════════════════════════════════════════════ */

function SecS3() {
  const fallart = usePlanStore((s) => s.fallart);
  const saeuleDrei = usePlanStore((s) => s.saeuleDrei);
  const isPaar = fallart === "paar";

  const sumP1 = saeuleDrei.p1.reduce(
    (a, e) => a + (e.aktuellerWert ?? 0) + (e.rueckkaufswert ?? 0),
    0
  );
  const sumP2 = saeuleDrei.p2.reduce(
    (a, e) => a + (e.aktuellerWert ?? 0) + (e.rueckkaufswert ?? 0),
    0
  );

  return (
    <>
      <Row label={`3a-Guthaben Total${isPaar ? " P1" : ""}`} help="Alle Konten zusammen">
        <span
          className="erf-input mono is-num"
          style={{ display: "inline-block", border: "none" }}
        >
          CHF {fmt(sumP1)}
        </span>
        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
          {saeuleDrei.p1.length} Position{saeuleDrei.p1.length !== 1 ? "en" : ""}
        </span>
      </Row>
      {isPaar && (
        <Row label="3a-Guthaben Total P2" help="Alle Konten zusammen">
          <span
            className="erf-input mono is-num"
            style={{ display: "inline-block", border: "none" }}
          >
            CHF {fmt(sumP2)}
          </span>
          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
            {saeuleDrei.p2.length} Position
            {saeuleDrei.p2.length !== 1 ? "en" : ""}
          </span>
        </Row>
      )}
      <Row label=" " help="Detail-Erfassung im Pro-Modus / Frage-Flow">
        <Link
          href="/?block=6"
          target="_blank"
          className="erf-pro-link"
          style={{ fontSize: 11.5 }}
        >
          3a-Detail im Pro-Modus öffnen →
        </Link>
      </Row>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section: Vermögen (Repeater)
   ═══════════════════════════════════════════════════════════════════════ */

function SecVermoegen() {
  const items = usePlanStore((s) => s.vermoegen.items);
  const addVermoegen = usePlanStore((s) => s.addVermoegen);
  const updateVermoegen = usePlanStore((s) => s.updateVermoegen);
  const removeVermoegen = usePlanStore((s) => s.removeVermoegen);

  return (
    <div className="erf-repeater">
      <div className="erf-rep-head erf-grid-rep-4">
        <div>Art</div>
        <div>Beschreibung</div>
        <div style={{ textAlign: "right" }}>Saldo CHF</div>
        <div></div>
      </div>
      {items.map((it) => (
        <div key={it.id} className="erf-rep-row erf-grid-rep-4">
          <select
            className="erf-input"
            aria-label="Vermögensart"
            value={it.typ}
            onChange={(e) =>
              updateVermoegen(it.id, {
                typ: e.target.value as typeof it.typ,
              })
            }
          >
            <option value="konto">Konto</option>
            <option value="depot">Depot</option>
            <option value="darlehen">Darlehen</option>
          </select>
          <input
            className="erf-input"
            aria-label="Beschreibung"
            value={it.beschreibung}
            placeholder="Lohnkonto, Depot…"
            onChange={(e) =>
              updateVermoegen(it.id, { beschreibung: e.target.value })
            }
          />
          <input
            className="erf-input is-num"
            aria-label="Saldo CHF"
            value={fmt(it.saldoHeute)}
            placeholder="0"
            onChange={(e) =>
              updateVermoegen(it.id, { saldoHeute: parseN(e.target.value) })
            }
          />
          <button
            type="button"
            className="erf-rep-del"
            onClick={() => removeVermoegen(it.id)}
            title="Entfernen"
          >
            <TrashIcon />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="erf-rep-add"
        onClick={() => addVermoegen("konto")}
      >
        + Position hinzufügen
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section: Immobilien (Repeater)
   ═══════════════════════════════════════════════════════════════════════ */

function SecImmo() {
  const items = usePlanStore((s) => s.immobilien.items);
  const addImmobilie = usePlanStore((s) => s.addImmobilie);
  const updateImmobilie = usePlanStore((s) => s.updateImmobilie);
  const removeImmobilie = usePlanStore((s) => s.removeImmobilie);
  const addHypothek = usePlanStore((s) => s.addHypothek);
  const updateHypothek = usePlanStore((s) => s.updateHypothek);

  if (items.length === 0) {
    return (
      <div style={{ padding: "10px 14px" }}>
        <button
          type="button"
          className="erf-rep-add"
          style={{ borderRadius: 8, border: "1px dashed var(--border-strong)" }}
          onClick={() => addImmobilie({ typ: "selbstbewohnt" })}
        >
          + Liegenschaft hinzufügen
        </button>
      </div>
    );
  }

  return (
    <div className="erf-repeater">
      <div className="erf-rep-head erf-grid-rep-immo">
        <div>Beschreibung · Typ</div>
        <div style={{ textAlign: "right" }}>Verkehrswert</div>
        <div style={{ textAlign: "right" }}>Hypothek (Total)</div>
        <div></div>
      </div>
      {items.map((im) => {
        const hypoTotal = im.hypotheken.reduce(
          (a, h) => a + (h.hoehe ?? 0),
          0
        );
        return (
          <div key={im.id} className="erf-rep-row erf-grid-rep-immo">
            <div style={{ display: "flex", gap: 6 }}>
              <select
                className="erf-input"
                style={{ flex: "0 0 120px" }}
                aria-label="Liegenschaftstyp"
                value={im.typ}
                onChange={(e) =>
                  updateImmobilie(im.id, {
                    typ: e.target.value as typeof im.typ,
                  })
                }
              >
                <option value="selbstbewohnt">Eigenheim</option>
                <option value="rendite">Rendite</option>
              </select>
              <input
                className="erf-input"
                style={{ flex: 1 }}
                aria-label="Beschreibung der Liegenschaft"
                value={im.beschreibung}
                placeholder="z.B. Haus Horgen"
                onChange={(e) =>
                  updateImmobilie(im.id, { beschreibung: e.target.value })
                }
              />
            </div>
            <input
              className="erf-input is-num"
              aria-label="Verkehrswert CHF"
              value={fmt(im.verkehrswert)}
              placeholder="0"
              onChange={(e) =>
                updateImmobilie(im.id, {
                  verkehrswert: parseN(e.target.value),
                })
              }
            />
            <input
              className="erf-input is-num"
              aria-label="Hypothek total CHF"
              value={fmt(hypoTotal)}
              placeholder="0"
              onChange={(e) => {
                // Update first hypothek (or create one)
                const v = parseN(e.target.value);
                if (im.hypotheken.length === 0) {
                  addHypothek(im.id, { hoehe: v });
                } else {
                  const first = im.hypotheken[0];
                  if (first) updateHypothek(im.id, first.id, { hoehe: v });
                }
              }}
            />
            <button
              type="button"
              className="erf-rep-del"
              onClick={() => removeImmobilie(im.id)}
            >
              <TrashIcon />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        className="erf-rep-add"
        onClick={() => addImmobilie({ typ: "selbstbewohnt" })}
      >
        + Liegenschaft hinzufügen
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section: Firma
   ═══════════════════════════════════════════════════════════════════════ */

function SecFirma() {
  const firma = usePlanStore((s) => s.firma);
  const setFirma = usePlanStore((s) => s.setFirma);

  return (
    <>
      <Row label="Selbständigkeit / Firmenanteile">
        <Seg
          value={firma.vorhanden ? "ja" : "nein"}
          onChange={(v) => setFirma({ vorhanden: v === "ja" })}
          options={[
            { value: "nein" as const, label: "Keine" },
            { value: "ja" as const, label: "Vorhanden" },
          ]}
        />
      </Row>
      {firma.vorhanden && (
        <>
          <Row label="Firmenname">
            <input
              className="erf-input is-grow"
              value={firma.firmenname}
              onChange={(e) => setFirma({ firmenname: e.target.value })}
            />
          </Row>
          <Row label="Möglicher Verkaufserlös" help="Best-Effort-Schätzung">
            <NumInput
              value={firma.moeglicherVerkaufserloes}
              onChange={(v) => setFirma({ moeglicherVerkaufserloes: v })}
            />
          </Row>
          <Row label="Plan bei Pensionierung">
            <Seg
              value={firma.plan}
              onChange={(v) => setFirma({ plan: v })}
              options={[
                { value: "behalten" as const, label: "Behalten" },
                { value: "verkaufen" as const, label: "Verkaufen" },
              ]}
            />
          </Row>
          {firma.plan === "verkaufen" && (
            <Row label="Geplantes Verkaufsjahr">
              <input
                className="erf-input mono"
                type="number"
                min="2025"
                max="2060"
                style={{ width: 90 }}
                value={firma.verkaufsjahr}
                onChange={(e) =>
                  setFirma({
                    verkaufsjahr: parseInt(e.target.value || "2030", 10),
                  })
                }
              />
            </Row>
          )}
        </>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section: Nachlass
   ═══════════════════════════════════════════════════════════════════════ */

function SecNachlass() {
  const nachlass = usePlanStore((s) => s.nachlass);
  const setNachlass = usePlanStore((s) => s.setNachlass);

  const themen = [
    { key: "vorsorgeauftrag" as const, label: "Vorsorgeauftrag" },
    { key: "patientenverfuegung" as const, label: "Patientenverfügung" },
    { key: "generalvollmacht" as const, label: "Generalvollmacht" },
    { key: "testament" as const, label: "Testament" },
    { key: "erbvertrag" as const, label: "Erbvertrag" },
    { key: "ehevertrag" as const, label: "Ehevertrag" },
  ];

  return (
    <Row
      label="Vorhandene Dokumente"
      help="Mehrfachauswahl — was der Mandant bereits hat"
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {themen.map((t) => (
          <Check
            key={t.key}
            checked={nachlass[t.key] === "ja"}
            onChange={(v) => setNachlass(t.key, v ? "ja" : "nein")}
            label={t.label}
          />
        ))}
      </div>
    </Row>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section: Dokumente (Mock-Upload)
   ═══════════════════════════════════════════════════════════════════════ */

function SecDocs({
  meta,
  updateMeta,
}: {
  meta: BeraterMeta;
  updateMeta: (p: Partial<BeraterMeta>) => void;
}) {
  const docs = meta.docs ?? leereDocs();
  const fallart = usePlanStore((s) => s.fallart);
  const isPaar = fallart === "paar";

  const attach = (key: keyof ErfassungDocs, label: string) => {
    const newDoc: ErfassungDoc = {
      name: `${label.replace(/\s+/g, "_")}.pdf`,
      size: `${(0.5 + Math.random() * 1.8).toFixed(1)} MB`,
      attached: true,
    };
    updateMeta({ docs: { ...docs, [key]: newDoc } });
  };

  return (
    <div className="erf-upload-grid">
      <Upload
        doc={docs.vorsorgeausweisP1}
        label={isPaar ? "Vorsorgeausweis P1" : "Vorsorgeausweis"}
        sub="PK-Jahresausweis als PDF"
        onAttach={() =>
          attach("vorsorgeausweisP1", isPaar ? "Vorsorgeausweis_P1" : "Vorsorgeausweis")
        }
      />
      {isPaar && (
        <Upload
          doc={docs.vorsorgeausweisP2}
          label="Vorsorgeausweis P2"
          sub="PK-Jahresausweis als PDF"
          onAttach={() => attach("vorsorgeausweisP2", "Vorsorgeausweis_P2")}
        />
      )}
      <Upload
        doc={docs.steuererklaerung}
        label="Steuererklärung"
        sub="Letzte Veranlagung"
        onAttach={() => attach("steuererklaerung", "Steuererklärung")}
      />
      <Upload
        doc={docs.saeule3aP1}
        label={isPaar ? "3a-Auszug P1" : "3a-Auszug"}
        sub="Bank-Jahresauszug"
        onAttach={() => attach("saeule3aP1", isPaar ? "3a_P1" : "3a")}
      />
      {isPaar && (
        <Upload
          doc={docs.saeule3aP2}
          label="3a-Auszug P2"
          sub="Bank-Jahresauszug"
          onAttach={() => attach("saeule3aP2", "3a_P2")}
        />
      )}
    </div>
  );
}

function Upload({
  doc,
  label,
  sub,
  onAttach,
}: {
  doc: ErfassungDoc | null;
  label: string;
  sub: string;
  onAttach: () => void;
}) {
  return (
    <div
      className={`erf-upload ${doc?.attached ? "is-attached" : ""}`}
      onClick={onAttach}
    >
      <div className="erf-upload-icon">
        {doc?.attached ? (
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8.5l3 3 7-7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 3v8m0 0L5 8m3 3l3-3M3 13h10"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className="erf-upload-info">
        <div className="erf-upload-title">{label}</div>
        <div className="erf-upload-sub">
          {doc?.attached ? `${doc.name} · ${doc.size}` : sub}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section: Übergabe (Notiz + Auftrag)
   ═══════════════════════════════════════════════════════════════════════ */

function SecUebergabe({
  meta,
  updateMeta,
}: {
  meta: BeraterMeta;
  updateMeta: (p: Partial<BeraterMeta>) => void;
}) {
  return (
    <>
      <Row label="Auftrag" help="Was soll Cuira leisten?">
        <Seg
          value={meta.auftrag || ""}
          onChange={(v) =>
            updateMeta({ auftrag: v as BeraterMeta["auftrag"] })
          }
          options={[
            { value: "" as const, label: "—" },
            { value: "planung_beratung" as const, label: "Planung + Beratung" },
            { value: "nur_planung" as const, label: "Nur Planung" },
          ]}
        />
      </Row>
      <Row
        label="Berater-Notiz"
        help="Kontext, offene Fragen, Wünsche des Mandanten — mind. 10 Zeichen"
      >
        <textarea
          className="erf-textarea"
          style={{ flex: 1 }}
          placeholder="Anna ist 58, möchte mit 62 in Frühpension. Hauptfrage: PK-Bezug Rente vs. Kapital — sie ist konservativ, möchte Sicherheit. Marc selbständig, Firma soll vor Pension verkauft werden…"
          value={meta.notiz ?? ""}
          onChange={(e) => updateMeta({ notiz: e.target.value })}
        />
      </Row>
      <div className="erf-meta-line" style={{ padding: "0 14px" }}>
        <span>Mind. 10 Zeichen für Übergabe</span>
        <span>{(meta.notiz ?? "").length} Zeichen</span>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Übergabe-Aside (rechts)
   ═══════════════════════════════════════════════════════════════════════ */

function ProgressRing({ pct }: { pct: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth="4"
      />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="var(--cuira-deep)"
        strokeWidth="4"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        style={{
          transition: "stroke-dashoffset 320ms cubic-bezier(.2,.9,.3,1)",
          transform: "rotate(-90deg)",
          transformOrigin: "center",
        }}
      />
    </svg>
  );
}

function Handoff({
  meta,
  updateMeta,
  comp,
  plan,
  onSubmit,
  submitState,
  onDownloadJson,
}: {
  meta: BeraterMeta;
  updateMeta: (p: Partial<BeraterMeta>) => void;
  comp: Record<SectionId, boolean>;
  plan: PlanState;
  onSubmit: () => void;
  submitState: {
    loading: boolean;
    done: boolean;
    emailGesendet: boolean | null;
    error: string | null;
  };
  onDownloadJson: () => void;
}) {
  const done = Object.values(comp).filter(Boolean).length;
  const total = Object.keys(comp).length;
  const pct = Math.round((done / total) * 100);
  const ready = pct === 100;

  if (submitState.done) {
    return (
      <aside className="erf-handoff">
        <div className="erf-handoff-head">
          <div className="erf-handoff-eyebrow">Status</div>
          <div className="erf-handoff-title">Übergabe gesendet</div>
        </div>
        <div className="erf-handoff-body">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "16px 0",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 999,
                background: "var(--pos-soft)",
                color: "var(--pos)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              ✓
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--ink)",
                }}
              >
                {submitState.emailGesendet
                  ? "Cuira wurde benachrichtigt"
                  : "Bitte JSON herunterladen"}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ink-3)",
                  marginTop: 4,
                }}
              >
                {submitState.emailGesendet
                  ? "Antwort innert 24 Std."
                  : "und an kathir@cuirapartners.ch senden"}
              </div>
            </div>
          </div>
          {submitState.error && (
            <div
              style={{
                padding: "10px 12px",
                background: "var(--warn-soft)",
                color: "oklch(0.5 0.15 60)",
                borderRadius: 8,
                fontSize: 11.5,
              }}
            >
              <strong>Hinweis:</strong> {submitState.error}
            </div>
          )}
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="erf-btn erf-btn-primary"
            style={{ textDecoration: "none" }}
          >
            Termin mit Cuira buchen
          </a>
          <button
            type="button"
            onClick={onDownloadJson}
            className="erf-btn erf-btn-ghost"
          >
            JSON herunterladen
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="erf-handoff">
      <div className="erf-handoff-head">
        <div className="erf-handoff-eyebrow">Übergabe-Status</div>
        <div className="erf-handoff-title">
          {meta.mandantId} ·{" "}
          {plan.person1.nachname || meta.kundeP1Name || "—"}
        </div>
      </div>
      <div className="erf-handoff-body">
        <div className="erf-ring-wrap">
          <div className="erf-ring">
            <ProgressRing pct={pct} />
            <div className="erf-ring-text">{pct}%</div>
          </div>
          <div>
            <div className="erf-ring-info-title">
              {done} von {total} Sektionen
            </div>
            <div className="erf-ring-info-sub">
              {ready
                ? "Bereit zur Übergabe an Cuira"
                : `${total - done} noch offen`}
            </div>
          </div>
        </div>

        <div className="erf-checklist">
          {SECTIONS.map((sec) => (
            <div
              key={sec.id}
              className={`erf-checklist-item ${
                comp[sec.id] ? "is-done" : ""
              }`}
            >
              <span className="erf-checklist-icon"></span>
              <span>{sec.label}</span>
              <span className="erf-checklist-pct">
                {comp[sec.id] ? "OK" : "—"}
              </span>
            </div>
          ))}
        </div>

        <div className="erf-panel-section">
          <span className="erf-panel-h">Priorität</span>
          <div className="erf-priority">
            {(["normal", "hoch", "dringend"] as ErfassungPriority[]).map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  data-tone={
                    p === "hoch" ? "warn" : p === "dringend" ? "urg" : undefined
                  }
                  className={
                    (meta.priority ?? "normal") === p ? "is-active" : ""
                  }
                  onClick={() => updateMeta({ priority: p })}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        <div className="erf-panel-section">
          <span className="erf-panel-h">Berater-Notiz</span>
          <textarea
            className="erf-textarea"
            placeholder="Kontext, offene Fragen, Wünsche des Mandanten…"
            value={meta.notiz ?? ""}
            onChange={(e) => updateMeta({ notiz: e.target.value })}
          />
          <div className="erf-meta-line">
            <span>Mind. 10 Zeichen</span>
            <span>{(meta.notiz ?? "").length}</span>
          </div>
        </div>

      </div>
      <div className="erf-handoff-foot">
        <button
          type="button"
          className="erf-btn erf-btn-primary"
          disabled={!ready || submitState.loading}
          onClick={onSubmit}
        >
          {ready
            ? "An Cuira übergeben"
            : `${total - done} Sektion(en) offen`}
        </button>
        <button
          type="button"
          className="erf-btn erf-btn-ghost"
          onClick={() => {
            if (typeof window !== "undefined") {
              writeMeta({ ...leereBeraterMeta(), ...meta });
              alert("Als Entwurf gespeichert.");
            }
          }}
        >
          Als Entwurf speichern
        </button>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Icons
   ═══════════════════════════════════════════════════════════════════════ */

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 5h10M6 5V3h4v2M5 5l1 9h4l1-9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
