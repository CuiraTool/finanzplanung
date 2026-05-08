"use client";

import {
  usePlanStore,
  type Fallart,
  type Zivilstand,
  type KindZuordnung,
  type PersonInput,
  ZIVILSTAND_EINZEL,
  ZIVILSTAND_PAAR,
  KANTONE,
} from "@/lib/store";

const FALLARTEN: { value: Fallart; label: string }[] = [
  { value: "einzel", label: "Einzelperson" },
  { value: "paar", label: "Paar" },
];

export function Block1Personen() {
  const fallart = usePlanStore((s) => s.fallart);
  const zivilstand = usePlanStore((s) => s.zivilstand);
  const adresse = usePlanStore((s) => s.adresse);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);
  const kinder = usePlanStore((s) => s.kinder);

  const setFallart = usePlanStore((s) => s.setFallart);
  const setZivilstand = usePlanStore((s) => s.setZivilstand);
  const setAdresse = usePlanStore((s) => s.setAdresse);
  const setPerson1 = usePlanStore((s) => s.setPerson1);
  const setPerson2 = usePlanStore((s) => s.setPerson2);
  const addKind = usePlanStore((s) => s.addKind);
  const updateKind = usePlanStore((s) => s.updateKind);
  const removeKind = usePlanStore((s) => s.removeKind);

  const zivilstandOptions = fallart === "einzel" ? ZIVILSTAND_EINZEL : ZIVILSTAND_PAAR;

  return (
    <div className="space-y-6">
      {/* Fallart */}
      <Section title="Fallart">
        <div className="flex gap-2">
          {FALLARTEN.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFallart(f.value)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm transition ${
                fallart === f.value
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Zivilstand */}
      <Section title="Zivilstand">
        <select
          value={zivilstand}
          onChange={(e) => setZivilstand(e.target.value as Zivilstand)}
          className={selectClass}
        >
          {zivilstandOptions.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}
            </option>
          ))}
        </select>
      </Section>

      {/* Adresse */}
      <Section title="Adresse" hint="für spätere Steuerberechnung">
        <Field label="Strasse">
          <input
            type="text"
            value={adresse.strasse}
            onChange={(e) => setAdresse({ strasse: e.target.value })}
            placeholder="Bahnhofstrasse 1"
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <Field label="PLZ">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={adresse.plz}
              onChange={(e) => setAdresse({ plz: e.target.value.replace(/\D/g, "") })}
              placeholder="8001"
              className={inputClass}
            />
          </Field>
          <Field label="Ort">
            <input
              type="text"
              value={adresse.ort}
              onChange={(e) => setAdresse({ ort: e.target.value })}
              placeholder="Zürich"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Kanton">
          <select
            value={adresse.kanton}
            onChange={(e) => setAdresse({ kanton: e.target.value })}
            className={selectClass}
          >
            <option value="">— Kanton wählen —</option>
            {KANTONE.map((k) => (
              <option key={k.code} value={k.code}>
                {k.code} — {k.name}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      {/* Person 1 */}
      <PersonForm title="Person 1" person={person1} onChange={setPerson1} />

      {/* Person 2 */}
      {fallart === "paar" && (
        <PersonForm title="Person 2" person={person2} onChange={setPerson2} />
      )}

      {/* Kinder */}
      <Section title="Kinder" hint="für spätere Kinderabzüge in der Steuer">
        {kinder.length === 0 && (
          <p className="text-xs text-slate-400">Keine Kinder erfasst.</p>
        )}
        <ul className="space-y-2">
          {kinder.map((k, idx) => (
            <li
              key={k.id}
              className="space-y-2 rounded-md border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Kind {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeKind(k.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Entfernen
                </button>
              </div>
              <Field label="Vorname">
                <input
                  type="text"
                  value={k.vorname}
                  onChange={(e) => updateKind(k.id, { vorname: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Geburtsdatum">
                <input
                  type="date"
                  value={k.geburtsdatum}
                  onChange={(e) => updateKind(k.id, { geburtsdatum: e.target.value })}
                  className={inputClass}
                />
              </Field>
              {fallart === "paar" && (
                <Field label="Zuordnung">
                  <select
                    value={k.zuordnung}
                    onChange={(e) =>
                      updateKind(k.id, { zuordnung: e.target.value as KindZuordnung })
                    }
                    className={selectClass}
                  >
                    <option value="gemeinsam">Gemeinsam</option>
                    <option value="p1">Person 1</option>
                    <option value="p2">Person 2</option>
                  </select>
                </Field>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addKind}
          className="mt-2 w-full rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
        >
          + Kind hinzufügen
        </button>
      </Section>
    </div>
  );
}

function PersonForm({
  title,
  person,
  onChange,
}: {
  title: string;
  person: PersonInput;
  onChange: (patch: Partial<PersonInput>) => void;
}) {
  return (
    <Section title={title}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Vorname">
          <input
            type="text"
            value={person.vorname}
            onChange={(e) => onChange({ vorname: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Nachname">
          <input
            type="text"
            value={person.nachname}
            onChange={(e) => onChange({ nachname: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Geburtsdatum">
        <input
          type="date"
          value={person.geburtsdatum}
          onChange={(e) => onChange({ geburtsdatum: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="Massgebendes Jahreseinkommen (CHF)" hint="durchschnittlich über die Karriere">
        <input
          type="number"
          inputMode="numeric"
          value={person.massgebendesEinkommen ?? ""}
          onChange={(e) =>
            onChange({
              massgebendesEinkommen: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          placeholder="z.B. 80'000"
          className={`${inputClass} tabular-nums`}
        />
      </Field>
    </Section>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">
        {title}
        {hint && <span className="ml-2 text-xs font-normal text-slate-400">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      {hint && <div className="mb-1 text-xs text-slate-400">{hint}</div>}
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
const selectClass = `${inputClass} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path fill=%22%2364748b%22 d=%22M6 8L2 4h8z%22/></svg>')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8`;
