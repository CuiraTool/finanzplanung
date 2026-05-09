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
import { personLabel } from "@/lib/pension";
import { Field } from "@/components/ui/Field";
import { Section } from "@/components/ui/Section";
import { inputClass, selectClass } from "@/components/ui/styles";
import { OrtKantonPicker } from "./OrtKantonPicker";

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
      <Section title="Adresse" hint="Kanton ist Pflicht für Steuerberechnung">
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
          <Field
            label="Ort / Gemeinde *"
            hint={
              adresse.gemeindeBfsId
                ? `Kanton ${adresse.kanton} · Steuerfuss exakt`
                : "tippen → Gemeinde wählen → Kanton wird automatisch gesetzt"
            }
          >
            <OrtKantonPicker
              value={adresse.ort}
              bfsId={adresse.gemeindeBfsId ?? null}
              onChange={(patch) => setAdresse(patch)}
            />
          </Field>
        </div>
        {/* Fallback: Wenn User Freitext-Ort behält und keine Gemeinde matcht,
            kann er hier den Kanton manuell setzen. */}
        {!adresse.gemeindeBfsId && (
          <Field
            label="Kanton (manuell)"
            hint="nur falls Gemeinde nicht in der Liste — sonst automatisch"
          >
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
        )}
      </Section>

      {/* Person 1 (oder einzelne Person) */}
      <PersonForm
        title={personLabel(1, person1.vorname, fallart)}
        person={person1}
        onChange={setPerson1}
      />

      {/* Person 2 nur bei Paar */}
      {fallart === "paar" && (
        <PersonForm
          title={personLabel(2, person2.vorname, fallart)}
          person={person2}
          onChange={setPerson2}
        />
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
        <Field label="Vorname *" hint="Pflichtfeld">
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
      <div className="grid grid-cols-[1fr_140px] gap-2">
        <Field label="Geburtsdatum *" hint="Pflichtfeld — bestimmt Pensionsjahr">
          <input
            type="date"
            value={person.geburtsdatum}
            onChange={(e) => onChange({ geburtsdatum: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field
          label="Geschlecht"
          hint={ahv21Hinweis(person)}
        >
          <select
            value={person.geschlecht ?? ""}
            onChange={(e) =>
              onChange({
                geschlecht:
                  (e.target.value as "m" | "w" | "andere" | "") || null,
              })
            }
            className={selectClass}
          >
            <option value="">—</option>
            <option value="m">Mann</option>
            <option value="w">Frau</option>
            <option value="andere">Andere</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Telefon">
          <input
            type="tel"
            value={person.telefon}
            onChange={(e) => onChange({ telefon: e.target.value })}
            placeholder="+41 79 123 45 67"
            className={inputClass}
          />
        </Field>
        <Field label="E-Mail">
          <input
            type="email"
            value={person.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="name@example.ch"
            className={inputClass}
          />
        </Field>
      </div>
    </Section>
  );
}

/**
 * Liefert einen kurzen Hinweis-Text wenn die Person zu den AHV21-
 * Übergangsjahrgängen gehört (Frau Jg. 1961-63).
 */
function ahv21Hinweis(person: PersonInput): string | undefined {
  if (person.geschlecht !== "w" || !person.geburtsdatum) return undefined;
  const jahr = parseInt(person.geburtsdatum.slice(0, 4), 10);
  if (jahr === 1961) return "AHV21: ord. Alter 64 + 3 Mt";
  if (jahr === 1962) return "AHV21: ord. Alter 64 + 6 Mt";
  if (jahr === 1963) return "AHV21: ord. Alter 64 + 9 Mt";
  if (jahr <= 1960) return "AHV21: ord. Alter 64";
  return undefined;
}

