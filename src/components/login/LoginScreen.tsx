"use client";

/**
 * Cuira Login Screen (Phase 6 — Routen-Split nach Cuira-Design-Handoff).
 *
 * Drei-Rollen-Login als Split-Screen-Layout. Brand-Pane links (cuira-deep
 * mit Radial-Gradient), Form-Pane rechts (white).
 *
 * Wird verwendet von:
 *  - /login              — Übersicht mit Tab-Switcher (alle 3 Rollen)
 *  - /login/berater      — initialRole="berater", lockedRole=true
 *  - /login/affiliate    — initialRole="affiliate", lockedRole=true
 *  - /login/kunde        — initialRole="kunde", lockedRole=true
 *
 * Wenn `lockedRole = true`, ist der Tab-Switcher unsichtbar (Production-
 * Routen) — der User landet auf der Berater-/Affiliate-/Kunde-Spezial-URL
 * und sieht nur das passende Form.
 *
 * Status: UI-Demo, kein Auth/DB. "Anmelden" navigiert zu /app (Berater),
 * /erfassung (Affiliate), /kunde (Kunde) — Mock.
 */

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Shield,
  Users,
  TrendingUp,
  Send,
  Lock,
  FileText,
  CreditCard,
  Calendar,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Globe,
  CheckCircle2,
} from "lucide-react";

type Role = "berater" | "affiliate" | "kunde";

const ROLES: Record<
  Role,
  {
    label: string;
    sub: string;
    eyebrow: string;
    titlePre: string;
    titleEm: string;
    lede: string;
    features: { icon: React.ReactNode; title: string; text: string }[];
    formTitle: string;
    formLede: string;
    cta: string;
    requiresOTP: boolean;
    magicLink: boolean;
  }
> = {
  berater: {
    label: "Berater",
    sub: "Cuira-Team",
    eyebrow: "Cuira Berater-Cockpit",
    titlePre: "Pensionsplanung in",
    titleEm: "Echtzeit.",
    lede: "Mandanten verwalten, Pläne A/B vergleichen, Termine koordinieren — alles in einem Cockpit. Mit Live-Hochrechnung und FINMA-konformer Dokumentation.",
    features: [
      {
        icon: <Users className="h-3 w-3" />,
        title: "Mandanten-Cockpit",
        text: "Alle Mandanten, Pläne und Termine an einem Ort",
      },
      {
        icon: <TrendingUp className="h-3 w-3" />,
        title: "Live-Plan",
        text: "Vermögensverlauf rechnet bei jedem Tastendruck nach",
      },
      {
        icon: <Send className="h-3 w-3" />,
        title: "Plan-Übergabe",
        text: "Per E-Mail, PDF oder im Termin gemeinsam durchgehen",
      },
    ],
    formTitle: "Willkommen zurück",
    formLede: "Melde dich mit deinem Cuira-Berater-Konto an.",
    cta: "Anmelden",
    requiresOTP: true,
    magicLink: false,
  },
  affiliate: {
    label: "Affiliate",
    sub: "Vertriebspartner",
    eyebrow: "Cuira Affiliate-Portal",
    titlePre: "Mandanten erfassen,",
    titleEm: "Provision verdienen.",
    lede: "Erfasse Familien-Daten in einem strukturierten Formular. Cuira übernimmt Beratung und Plan-Erstellung. Du erhältst CHF 1'200 pro abgeschlossenem Plan — transparent und nachverfolgbar.",
    features: [
      {
        icon: <FileText className="h-3 w-3" />,
        title: "Strukturierte Erfassung",
        text: "10 Blöcke · Auto-Save · Upload für Vorsorgeausweise",
      },
      {
        icon: <CreditCard className="h-3 w-3" />,
        title: "Live-Provision",
        text: "Status pro Mandant: Erfasst → Termin → Plan → Bezahlt",
      },
      {
        icon: <Globe className="h-3 w-3" />,
        title: "Whitelabel-Option",
        text: "Mit eigenem Logo im Kunden-PDF erscheinen",
      },
    ],
    formTitle: "Affiliate-Login",
    formLede: "Greife auf dein Erfassungs-Tool und Provisions-Übersicht zu.",
    cta: "Anmelden",
    requiresOTP: false,
    magicLink: false,
  },
  kunde: {
    label: "Kunde",
    sub: "Privatperson",
    eyebrow: "Mein Cuira-Plan",
    titlePre: "Ihr Pensionsplan,",
    titleEm: "jederzeit zur Hand.",
    lede: "Sehen Sie Ihren persönlichen Plan, vergangene Termine und Dokumente. Buchen Sie das nächste Gespräch direkt mit Ihrem Berater. Magic-Link-Login — kein Passwort nötig.",
    features: [
      {
        icon: <TrendingUp className="h-3 w-3" />,
        title: "Ihr Plan im Überblick",
        text: "Vermögensverlauf bis Pension und darüber hinaus",
      },
      {
        icon: <Calendar className="h-3 w-3" />,
        title: "Termine & Dokumente",
        text: "Alles, was im Beratungsprozess entstand",
      },
      {
        icon: <Mail className="h-3 w-3" />,
        title: "Direkter Draht",
        text: "Berater per Nachricht erreichen, neuen Termin buchen",
      },
    ],
    formTitle: "Anmelden",
    formLede:
      "Wir senden Ihnen einen sicheren Login-Link per E-Mail. Kein Passwort nötig.",
    cta: "Login-Link senden",
    requiresOTP: false,
    magicLink: true,
  },
};

interface LoginScreenProps {
  initialRole?: Role;
  /** Wenn true, ist der Tab-Switcher unsichtbar (separate Production-Routen). */
  lockedRole?: boolean;
}

export function LoginScreen({
  initialRole = "berater",
  lockedRole = false,
}: LoginScreenProps) {
  const [role, setRole] = useState<Role>(initialRole);
  const r = ROLES[role];

  return (
    <main className="grid min-h-screen md:grid-cols-[1fr_520px]">
      {/* ── Brand-Pane (links) ──────────────────────────────── */}
      <BrandPane role={role} r={r} />

      {/* ── Form-Pane (rechts) ──────────────────────────────── */}
      <div className="flex flex-col justify-center bg-white px-8 py-10 md:px-12">
        {/* Top: Help-Link + Cross-Links zu anderen Rollen */}
        <div className="mb-8 flex items-center justify-between text-[12px]">
          {lockedRole ? (
            <CrossRoleLinks current={role} />
          ) : (
            <span />
          )}
          <Link
            href="#"
            className="text-[var(--ink-3)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
          >
            Hilfe?
          </Link>
        </div>

        {/* Role-Tab Switcher (nur wenn nicht gelockt — /login Index) */}
        {!lockedRole && (
          <div
            className="mx-auto mb-8 grid w-full max-w-sm grid-cols-3 gap-1 rounded-[12px] border p-1"
            style={{
              background: "var(--bg-soft)",
              borderColor: "var(--border)",
            }}
          >
            {(Object.keys(ROLES) as Role[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setRole(key)}
                className="rounded-lg px-2 py-2 text-center text-[12px] font-medium transition-all"
                style={{
                  background:
                    role === key ? "var(--surface)" : "transparent",
                  color: role === key ? "var(--ink)" : "var(--ink-3)",
                  boxShadow:
                    role === key
                      ? "0 1px 2px rgba(10,37,64,0.06), 0 0 0 1px var(--border)"
                      : undefined,
                }}
              >
                <div>{ROLES[key].label}</div>
                <div
                  className="mt-0.5 text-[10px] font-normal"
                  style={{
                    color: role === key ? "var(--ink-2)" : "var(--ink-3)",
                  }}
                >
                  {ROLES[key].sub}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mx-auto w-full max-w-sm">
          {role === "berater" && <BeraterForm r={r} />}
          {role === "affiliate" && <AffiliateForm r={r} />}
          {role === "kunde" && <KundeForm r={r} />}
        </div>
      </div>
    </main>
  );
}

/**
 * Cross-Role-Navigation auf gelockten Routen — User sieht z.B. auf
 * /login/berater einen kleinen Hinweis "Affiliate? · Kunde?".
 */
function CrossRoleLinks({ current }: { current: Role }) {
  const others = (Object.keys(ROLES) as Role[]).filter((r) => r !== current);
  return (
    <div className="flex items-center gap-3 text-[11.5px]" style={{ color: "var(--ink-3)" }}>
      <span>Andere Rolle?</span>
      {others.map((r) => (
        <Link
          key={r}
          href={`/login/${r}`}
          className="hover:underline"
          style={{ color: "var(--accent-ink)" }}
        >
          {ROLES[r].label}
        </Link>
      ))}
    </div>
  );
}

function BrandPane({ role, r }: { role: Role; r: (typeof ROLES)[Role] }) {
  return (
    <div
      className="relative hidden flex-col justify-between overflow-hidden p-12 text-white md:flex"
      style={{ background: "var(--cuira-deep)" }}
    >
      {/* Radial-Gradient-Overlays */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(45, 90, 180, 0.35), transparent 50%), radial-gradient(circle at 80% 80%, rgba(80, 30, 180, 0.2), transparent 50%)",
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-3">
          <Image
            src="/cuira-logo.png"
            alt="Cuira"
            width={120}
            height={48}
            priority
            className="h-9 w-auto"
          />
          <div className="border-l border-white/15 pl-3 leading-tight">
            <div className="text-[14px] font-semibold tracking-wide">Cuira</div>
            <div className="text-[10px] text-slate-300">
              Pensionsplanung Schweiz
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <div
          className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em]"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          {r.eyebrow}
        </div>
        <h1 className="mb-4 text-[44px] font-medium leading-tight tracking-tight">
          {r.titlePre}{" "}
          <em
            className="not-italic"
            style={{ color: "oklch(0.78 0.13 252)" }}
          >
            {r.titleEm}
          </em>
        </h1>
        <p className="mb-8 max-w-md text-[15px] leading-relaxed text-slate-200">
          {r.lede}
        </p>

        <div className="space-y-3">
          {r.features.map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "oklch(0.78 0.13 252)",
                }}
              >
                {f.icon}
              </div>
              <div>
                <div className="text-[14px] font-medium">{f.title}</div>
                <div className="text-[12.5px] text-slate-300">{f.text}</div>
              </div>
            </div>
          ))}
        </div>

        {role === "berater" && (
          <div className="mt-10 flex flex-wrap gap-4 text-[11px] text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> FINMA-konform
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> CH-DSG · Daten in CH
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> 99.9 % Verfügbarkeit
            </span>
          </div>
        )}

        {role === "affiliate" && (
          <div
            className="mt-10 grid grid-cols-3 gap-3 rounded-[12px] border border-white/10 p-4"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <Stat label="Affiliate-Partner" value="142" />
            <Stat label="Pläne 2025" value="1'840" />
            <Stat label="Ø Provision" value="CHF 1'200" />
          </div>
        )}

        {role === "kunde" && (
          <div
            className="mt-10 rounded-[12px] border border-white/10 p-4"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <p className="text-[14px] italic text-slate-200">
              &ldquo;Endlich verstehe ich, wie meine Pension aussehen wird. Der
              Plan ist klar, die Beratung war auf den Punkt.&rdquo;
            </p>
            <div className="mt-3 flex items-center gap-2.5 text-[12px] text-slate-300">
              <div
                className="h-7 w-7 rounded-full"
                style={{ background: "oklch(0.78 0.13 252)" }}
              />
              <div>
                <div className="font-medium text-white">Stephanie M., 53</div>
                <div className="text-[11px]">Cuira-Mandantin seit 2026</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative flex justify-between text-[11px] text-slate-400">
        <div>© Cuira AG 2026</div>
        <div className="flex gap-4">
          <Link href="#" className="hover:text-slate-200">
            Datenschutz
          </Link>
          <Link href="#" className="hover:text-slate-200">
            AGB
          </Link>
          <Link href="#" className="hover:text-slate-200">
            Hilfe
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-300">
        {label}
      </div>
      <div className="mt-1 font-mono text-[18px] font-medium tabular-nums text-white">
        {value}
      </div>
    </div>
  );
}

function FormHeading({ title, lede }: { title: string; lede: string }) {
  return (
    <>
      <h1
        className="mb-2 text-[26px] font-semibold tracking-tight"
        style={{ color: "var(--ink)" }}
      >
        {title}
      </h1>
      <p
        className="mb-6 text-[14px] leading-relaxed"
        style={{ color: "var(--ink-2)" }}
      >
        {lede}
      </p>
    </>
  );
}

function BeraterForm({ r }: { r: (typeof ROLES)["berater"] }) {
  const [stage, setStage] = useState<"creds" | "otp">("creds");
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("lukas.fischer@cuirapartners.ch");
  const [pw, setPw] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const submitCreds = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && pw) setStage("otp");
  };
  const submitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.every((d) => d)) window.location.href = "/app";
  };

  if (stage === "otp") {
    return (
      <form onSubmit={submitOtp}>
        <FormHeading
          title="Zwei-Faktor-Code"
          lede={`Wir haben einen 6-stelligen Code an ${email} gesendet.`}
        />
        <div className="mb-6 flex justify-between gap-2">
          {otp.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                otpRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(-1);
                const next = otp.slice();
                next[i] = v;
                setOtp(next);
                if (v && i < 5) otpRefs.current[i + 1]?.focus();
              }}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !d && i > 0)
                  otpRefs.current[i - 1]?.focus();
              }}
              className="h-14 w-12 rounded-[10px] border bg-white text-center font-mono text-[20px] outline-none transition-[border-color,box-shadow] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_15%,transparent)]"
              style={{ borderColor: "var(--border)", color: "var(--ink)" }}
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={!otp.every((d) => d)}
          className="cui-btn cui-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
        >
          Bestätigen
        </button>
        <button
          type="button"
          onClick={() => setStage("creds")}
          className="mt-3 w-full text-center text-[12px] text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          ← Zurück
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitCreds}>
      <FormHeading title={r.formTitle} lede={r.formLede} />
      <Field label="E-Mail">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          required
          className="cui-input"
        />
      </Field>
      <Field label="Passwort" trailing={<a href="#" className="text-[11.5px] text-[var(--accent-ink)] hover:underline">Vergessen?</a>}>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            className="cui-input pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--ink-3)] hover:text-[var(--ink)]"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      <button type="submit" className="cui-btn cui-btn-primary mt-4 w-full justify-center">
        {r.cta} <ArrowRight className="ml-1 h-4 w-4" />
      </button>
      <Divider />
      <SsoButtons />
    </form>
  );
}

function AffiliateForm({ r }: { r: (typeof ROLES)["affiliate"] }) {
  const [email, setEmail] = useState("lukas@fischer-vorsorge.ch");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && pw) window.location.href = "/erfassung";
  };

  return (
    <form onSubmit={submit}>
      <FormHeading title={r.formTitle} lede={r.formLede} />
      <Field label="E-Mail">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="cui-input"
        />
      </Field>
      <Field label="Passwort">
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            className="cui-input pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--ink-3)] hover:text-[var(--ink)]"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      <button type="submit" className="cui-btn cui-btn-primary mt-4 w-full justify-center">
        {r.cta} <ArrowRight className="ml-1 h-4 w-4" />
      </button>
      <Divider />
      <SsoButtons />
    </form>
  );
}

function KundeForm({ r }: { r: (typeof ROLES)["kunde"] }) {
  const [stage, setStage] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setStage("sent");
  };

  if (stage === "sent") {
    return (
      <div className="text-center">
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
        >
          <Mail className="h-6 w-6" />
        </div>
        <h1
          className="mb-2 text-[24px] font-semibold tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          Link unterwegs
        </h1>
        <p className="mb-6 text-[14px]" style={{ color: "var(--ink-2)" }}>
          Wir haben einen Login-Link an <strong>{email}</strong> gesendet. Der
          Link ist 15 Minuten gültig.
        </p>
        <button
          type="button"
          onClick={() => setStage("email")}
          className="text-[12px] text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          ← Andere E-Mail verwenden
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <FormHeading title={r.formTitle} lede={r.formLede} />
      <Field label="E-Mail">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          required
          placeholder="ihre@email.ch"
          className="cui-input"
        />
      </Field>
      <button type="submit" className="cui-btn cui-btn-primary mt-4 w-full justify-center">
        {r.cta} <ArrowRight className="ml-1 h-4 w-4" />
      </button>
      <p
        className="mt-6 text-center text-[11.5px]"
        style={{ color: "var(--ink-3)" }}
      >
        Noch keinen Plan?{" "}
        <Link href="/kunde" className="text-[var(--accent-ink)] hover:underline">
          Kostenfrei starten
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  trailing,
  children,
}: {
  label: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-3 block">
      <div className="mb-1.5 flex items-center justify-between">
        <span
          className="text-[12px] font-medium"
          style={{ color: "var(--ink-2)" }}
        >
          {label}
        </span>
        {trailing}
      </div>
      {children}
    </label>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1" style={{ background: "var(--border)" }} />
      <span className="text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
        Oder
      </span>
      <div className="h-px flex-1" style={{ background: "var(--border)" }} />
    </div>
  );
}

function SsoButtons() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button type="button" className="cui-btn justify-center text-[13px]">
        Microsoft
      </button>
      <button type="button" className="cui-btn justify-center text-[13px]">
        Google
      </button>
    </div>
  );
}
