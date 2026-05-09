"use client";

import { useState } from "react";
import type { BeraterMeta } from "./types";

interface Props {
  meta: BeraterMeta;
  onSubmit: (meta: BeraterMeta) => void;
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200";

/**
 * Block A — Berater-Meta-Erfassung am Anfang von V2.
 * Wird in LocalStorage persistiert (siehe submission.ts).
 */
export function BeraterMetaForm({ meta, onSubmit }: Props) {
  const [m, setM] = useState<BeraterMeta>(meta);

  const valid =
    m.beraterName.trim().length > 0 &&
    m.beraterEmail.trim().length > 0 &&
    m.kundeP1Name.trim().length > 0 &&
    m.auftrag !== "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(m);
      }}
      className="mx-auto max-w-2xl px-6 py-10"
    >
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">
        Kurz zu Ihnen und Ihrem Kunden
      </h1>
      <p className="mb-6 text-sm text-slate-600">
        Damit Cuira die Erfassung richtig zuordnen kann.
      </p>

      <div className="space-y-4">
        <Field label="Datum">
          <input
            type="date"
            value={m.datum}
            onChange={(e) => setM({ ...m, datum: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label="Ihre Firma (optional)">
          <input
            type="text"
            value={m.partnerfirma}
            onChange={(e) => setM({ ...m, partnerfirma: e.target.value })}
            placeholder="Beispiel AG"
            className={inputClass}
          />
        </Field>

        <Field label="Ihr Name *">
          <input
            type="text"
            required
            value={m.beraterName}
            onChange={(e) => setM({ ...m, beraterName: e.target.value })}
            placeholder="Max Berater"
            className={inputClass}
          />
        </Field>

        <Field label="Ihre Email *">
          <input
            type="email"
            required
            value={m.beraterEmail}
            onChange={(e) => setM({ ...m, beraterEmail: e.target.value })}
            placeholder="max@beispiel.ch"
            className={inputClass}
          />
        </Field>

        <Field label="Auftrag an Cuira *">
          <select
            value={m.auftrag}
            onChange={(e) =>
              setM({ ...m, auftrag: e.target.value as BeraterMeta["auftrag"] })
            }
            className={inputClass}
          >
            <option value="">— bitte wählen —</option>
            <option value="planung_beratung">
              Planung + Beratung (Cuira im Termin dabei)
            </option>
            <option value="nur_planung">
              Nur Planung (Berater übernimmt Beratung)
            </option>
          </select>
        </Field>

        <div className="border-t border-slate-200 pt-4">
          <Field label="Kunde — Vor- und Nachname Person 1 *">
            <input
              type="text"
              required
              value={m.kundeP1Name}
              onChange={(e) => setM({ ...m, kundeP1Name: e.target.value })}
              placeholder="Hans Beispiel"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Kunde — Vor- und Nachname Person 2 (bei Paar)">
          <input
            type="text"
            value={m.kundeP2Name}
            onChange={(e) => setM({ ...m, kundeP2Name: e.target.value })}
            placeholder="Erika Beispiel"
            className={inputClass}
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={!valid}
        className="mt-8 rounded-md bg-[var(--color-cuira-deep)] px-6 py-3 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Weiter zum Fragebogen →
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
