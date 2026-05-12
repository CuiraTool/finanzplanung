"use client";

import { useEffect, useState } from "react";
import {
  usePlanStore,
  type BezugsPraeferenz,
  type BvgPersonInput,
  type EinkaufEntry,
  type FreizuegigkeitEntry,
  type WefVorbezugEntry,
} from "@/lib/store";
import { personLabel, pensionsjahr } from "@/lib/pension";
import {
  SPERRFRIST_EINKAUF_JAHRE,
  wefValidiere,
  type WefWarnung,
} from "@/engine/bvg";
import { Field } from "@/components/ui/Field";
import { KiHinweis } from "@/components/ui/KiHinweis";
import { YesNoButtons } from "@/components/ui/YesNoButtons";
import { inputClass } from "@/components/ui/styles";

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      type="button"
      onClick={onClick}
      className={`rounded-t-md px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-b-2 border-blue-600 bg-blue-50/50 text-blue-700"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-100 px-1 text-[10px] font-semibold text-blue-800">
      {n}
    </span>
  );
}

const PRAEFERENZEN: { value: BezugsPraeferenz; label: string; sub: string }[] = [
  { value: "rente", label: "Rente", sub: "100% verrentet" },
  { value: "kapital", label: "Kapital", sub: "100% einmalig" },
  { value: "mischung", label: "Mischung", sub: "Anteil wählbar" },
];

export function Block5Bvg() {
  const fallart = usePlanStore((s) => s.fallart);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);
  const bvg = usePlanStore((s) => s.bvg);
  const ziele = usePlanStore((s) => s.ziele);
  const immobilien = usePlanStore((s) => s.immobilien.items);
  const immobilienOptionen = immobilien.map((im) => ({
    id: im.id,
    label: im.beschreibung || `Immobilie (${im.typ})`,
  }));

  const setBvgP1 = usePlanStore((s) => s.setBvgP1);
  const setBvgP2 = usePlanStore((s) => s.setBvgP2);
  const addFz = usePlanStore((s) => s.addFreizuegigkeit);
  const updateFz = usePlanStore((s) => s.updateFreizuegigkeit);
  const removeFz = usePlanStore((s) => s.removeFreizuegigkeit);
  const addEk = usePlanStore((s) => s.addEinkauf);
  const updateEk = usePlanStore((s) => s.updateEinkauf);
  const removeEk = usePlanStore((s) => s.removeEinkauf);
  const addWef = usePlanStore((s) => s.addWefVorbezug);
  const updateWef = usePlanStore((s) => s.updateWefVorbezug);
  const removeWef = usePlanStore((s) => s.removeWefVorbezug);

  const bezugsalterP1 = ziele.bezugsalterP1;
  const bezugsalterP2 = ziele.bezugsalterP2;
  const bezugsjahrP1 = pensionsjahr(person1.geburtsdatum, bezugsalterP1);
  const bezugsjahrP2 = pensionsjahr(person2.geburtsdatum, bezugsalterP2);

  return (
    <div className="space-y-6">
      <PersonBvgForm
        title={personLabel(1, person1.vorname, fallart)}
        personIdx={1}
        person={bvg.p1}
        geburtsdatum={person1.geburtsdatum}
        bezugsalter={bezugsalterP1}
        bezugsjahr={bezugsjahrP1}
        immobilienOptionen={immobilienOptionen}
        onPatch={setBvgP1}
        onAddFz={() => addFz(1)}
        onUpdateFz={(id, p) => updateFz(1, id, p)}
        onRemoveFz={(id) => removeFz(1, id)}
        onAddEk={() => addEk(1)}
        onUpdateEk={(id, p) => updateEk(1, id, p)}
        onRemoveEk={(id) => removeEk(1, id)}
        onAddWef={() => addWef(1)}
        onUpdateWef={(id, p) => updateWef(1, id, p)}
        onRemoveWef={(id) => removeWef(1, id)}
      />

      {fallart === "paar" && (
        <PersonBvgForm
          title={personLabel(2, person2.vorname, fallart)}
          personIdx={2}
          person={bvg.p2}
          geburtsdatum={person2.geburtsdatum}
          bezugsalter={bezugsalterP2}
          bezugsjahr={bezugsjahrP2}
          immobilienOptionen={immobilienOptionen}
          onPatch={setBvgP2}
          onAddFz={() => addFz(2)}
          onUpdateFz={(id, p) => updateFz(2, id, p)}
          onRemoveFz={(id) => removeFz(2, id)}
          onAddEk={() => addEk(2)}
          onUpdateEk={(id, p) => updateEk(2, id, p)}
          onRemoveEk={(id) => removeEk(2, id)}
          onAddWef={() => addWef(2)}
          onUpdateWef={(id, p) => updateWef(2, id, p)}
          onRemoveWef={(id) => removeWef(2, id)}
        />
      )}
    </div>
  );
}

type Block5Tab = "ag" | "einkaeufe" | "wef" | "fz";

function PersonBvgForm({
  title,
  personIdx,
  person,
  geburtsdatum,
  bezugsalter,
  bezugsjahr,
  immobilienOptionen,
  onPatch,
  onAddFz,
  onUpdateFz,
  onRemoveFz,
  onAddEk,
  onUpdateEk,
  onRemoveEk,
  onAddWef,
  onUpdateWef,
  onRemoveWef,
}: {
  title: string;
  personIdx: 1 | 2;
  person: BvgPersonInput;
  geburtsdatum: string;
  bezugsalter: number;
  bezugsjahr: number | null;
  immobilienOptionen: { id: string; label: string }[];
  onPatch: (p: Partial<BvgPersonInput>) => void;
  onAddFz: () => void;
  onUpdateFz: (id: string, p: Partial<FreizuegigkeitEntry>) => void;
  onRemoveFz: (id: string) => void;
  onAddEk: () => void;
  onUpdateEk: (id: string, p: Partial<EinkaufEntry>) => void;
  onRemoveEk: (id: string) => void;
  onAddWef: () => void;
  onUpdateWef: (id: string, p: Partial<WefVorbezugEntry>) => void;
  onRemoveWef: (id: string) => void;
}) {
  const tabKey = `cuira-block5-tab-p${personIdx}`;
  const [tab, setTabState] = useState<Block5Tab>("ag");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(tabKey) as Block5Tab | null;
    if (stored === "ag" || stored === "einkaeufe" || stored === "wef" || stored === "fz") {
      setTabState(stored);
    }
  }, [tabKey]);
  const setTab = (t: Block5Tab) => {
    setTabState(t);
    if (typeof window !== "undefined") window.localStorage.setItem(tabKey, t);
  };
  const geburtsjahr = geburtsdatum ? Number(geburtsdatum.slice(0, 4)) : 0;
  const wefWarnungen = wefValidiere({
    vorbezuege: person.wefVorbezuege ?? [],
    altersguthabenHeute: person.altersguthabenHeute,
    geburtsjahr,
    pkBezugsjahr: bezugsjahr,
  });
  const warnungenById = new Map<string, WefWarnung[]>();
  for (const w of wefWarnungen) {
    const arr = warnungenById.get(w.entryId) ?? [];
    arr.push(w);
    warnungenById.set(w.entryId, arr);
  }
  const einkaeufeCount = person.einkaeufe.length;
  const wefCount = (person.wefVorbezuege ?? []).length;
  const fzCount = person.freizuegigkeit.length;

  return (
    <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">{title}</legend>

      <div>
        <div className="mb-1 text-xs font-medium text-slate-600">
          Aktiver PK-Anschluss?
        </div>
        <YesNoButtons
          value={person.aktiverAnschluss}
          onChange={(v) => onPatch({ aktiverAnschluss: v })}
        />
      </div>

      {/* Interne Tab-Navigation pro Person (E2-3) */}
      <div role="tablist" aria-label="BVG-Bereiche" className="flex gap-1 border-b border-slate-200 pb-1">
        <TabBtn active={tab === "ag"} onClick={() => setTab("ag")}>
          Altersguthaben
        </TabBtn>
        <TabBtn active={tab === "einkaeufe"} onClick={() => setTab("einkaeufe")}>
          Einkäufe {einkaeufeCount > 0 && <Badge n={einkaeufeCount} />}
        </TabBtn>
        {person.aktiverAnschluss && (
          <TabBtn active={tab === "wef"} onClick={() => setTab("wef")}>
            WEF-Vorbezüge {wefCount > 0 && <Badge n={wefCount} />}
          </TabBtn>
        )}
        <TabBtn active={tab === "fz"} onClick={() => setTab("fz")}>
          Freizügigkeit {fzCount > 0 && <Badge n={fzCount} />}
        </TabBtn>
      </div>

      {tab === "ag" && person.aktiverAnschluss && (
        <>
          <Field
            label="Aktuelles Altersguthaben heute (CHF)"
            hint="vom letzten PK-Ausweis — informativ, nicht für Bezugsberechnung"
            info={
              <KiHinweis
                begriff="Altersguthaben"
                kontext="Pensionskasse 2. Säule BVG, Schweiz"
              />
            }
          >
            <input
              type="number"
              inputMode="numeric"
              value={person.altersguthabenHeute ?? ""}
              onChange={(e) =>
                onPatch({
                  altersguthabenHeute:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="z.B. 320'000"
              className={`${inputClass} tabular-nums`}
            />
          </Field>

          <Field
            label={`Voraussichtliches Altersguthaben mit Alter ${bezugsalter} (CHF)`}
            hint="vom PK-Ausweis (Bezugsalter aus Block 2) — wird für die Berechnung genutzt"
          >
            <input
              type="number"
              inputMode="numeric"
              value={person.altersguthabenBeiBezug ?? ""}
              onChange={(e) =>
                onPatch({
                  altersguthabenBeiBezug:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="z.B. 450'000"
              className={`${inputClass} tabular-nums`}
            />
          </Field>

          <Field
            label="Umwandlungssatz (%)"
            hint="laut PK-Reglement — gesetzliches Mindest 6.8%, real meist tiefer"
            info={
              <KiHinweis
                begriff="Umwandlungssatz"
                kontext="2. Säule Pensionskasse BVG"
              />
            }
          >
            <input
              type="number"
              inputMode="decimal"
              step={0.1}
              min={0}
              max={10}
              value={person.umwandlungssatzProzent || ""}
              onChange={(e) =>
                onPatch({
                  umwandlungssatzProzent:
                    e.target.value === "" ? 0 : Number(e.target.value),
                })
              }
              placeholder="z.B. 6.0"
              className={`${inputClass} w-32 tabular-nums`}
            />
          </Field>

          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">
              Bezugspräferenz
            </div>
            <div className="flex gap-2">
              {PRAEFERENZEN.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onPatch({ bezugspraeferenz: p.value })}
                  className={`flex-1 rounded-md border px-3 py-2 text-left text-sm transition ${
                    person.bezugspraeferenz === p.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="font-medium">{p.label}</div>
                  <div className="text-xs text-slate-400">{p.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {person.bezugspraeferenz === "mischung" && (
            <Field
              label={`Kapitalanteil: ${person.kapitalanteil}%`}
              hint={`→ Rentenanteil: ${100 - person.kapitalanteil}%`}
            >
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={person.kapitalanteil}
                onChange={(e) => onPatch({ kapitalanteil: Number(e.target.value) })}
                className="w-full"
              />
            </Field>
          )}

        </>
      )}

      {tab === "ag" && !person.aktiverAnschluss && (
        <p className="text-xs text-slate-500">
          Kein aktiver PK-Anschluss — keine Altersguthaben-Erfassung nötig.
          Freizügigkeit kann unter dem Tab "Freizügigkeit" erfasst werden.
        </p>
      )}

      {tab === "einkaeufe" && person.aktiverAnschluss && (
        <Einkaeufe
          items={person.einkaeufe}
          bezugsjahr={bezugsjahr}
          kapitalIstAnteil={
            person.bezugspraeferenz === "kapital" ||
            (person.bezugspraeferenz === "mischung" && person.kapitalanteil > 0)
          }
          onAdd={onAddEk}
          onUpdate={onUpdateEk}
          onRemove={onRemoveEk}
        />
      )}

      {tab === "einkaeufe" && !person.aktiverAnschluss && (
        <p className="text-xs text-slate-500">
          Einkäufe nur mit aktivem PK-Anschluss möglich.
        </p>
      )}

      {tab === "wef" && person.aktiverAnschluss && (
        <WefListe
          items={person.wefVorbezuege ?? []}
          warnungenById={warnungenById}
          immobilienOptionen={immobilienOptionen}
          onAdd={onAddWef}
          onUpdate={onUpdateWef}
          onRemove={onRemoveWef}
        />
      )}

      {tab === "fz" && (
        <Freizuegigkeit
          items={person.freizuegigkeit}
          onAdd={onAddFz}
          onUpdate={onUpdateFz}
          onRemove={onRemoveFz}
        />
      )}
    </fieldset>
  );
}

function Freizuegigkeit({
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: FreizuegigkeitEntry[];
  onAdd: () => void;
  onUpdate: (id: string, p: Partial<FreizuegigkeitEntry>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-slate-100 bg-slate-50/50 p-3">
      <div>
        <div className="text-xs font-medium text-slate-700">Freizügigkeit</div>
        <div className="text-xs text-slate-400">
          Konten/Policen aus früheren Anstellungen — eigenes Auszahlungsjahr und Rendite
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-slate-400">Noch keine Freizügigkeit erfasst.</p>
      )}

      <ul className="space-y-2">
        {items.map((it, idx) => (
          <li
            key={it.id}
            className="space-y-2 rounded-md border border-slate-200 bg-white p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Eintrag {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => onRemove(it.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Entfernen
              </button>
            </div>
            <Field label="Beschreibung">
              <input
                type="text"
                value={it.beschreibung}
                onChange={(e) => onUpdate(it.id, { beschreibung: e.target.value })}
                placeholder="z.B. FZ-Konto Migros Bank"
                className={inputClass}
              />
            </Field>
            <Field label="Saldo heute (CHF)">
              <input
                type="number"
                inputMode="numeric"
                value={it.saldoHeute ?? ""}
                onChange={(e) =>
                  onUpdate(it.id, {
                    saldoHeute:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="z.B. 80'000"
                className={`${inputClass} tabular-nums`}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Auszahlungsjahr">
                <input
                  type="number"
                  min={2024}
                  max={2080}
                  value={it.auszahlungsjahr}
                  onChange={(e) =>
                    onUpdate(it.id, { auszahlungsjahr: Number(e.target.value) })
                  }
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
              <Field label="Rendite p.a. (%)" hint="default 0">
                <input
                  type="number"
                  inputMode="decimal"
                  step={0.1}
                  min={0}
                  max={20}
                  value={it.renditeProzent}
                  onChange={(e) =>
                    onUpdate(it.id, { renditeProzent: Number(e.target.value) })
                  }
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="mt-1 w-full rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
      >
        + Freizügigkeit hinzufügen
      </button>
    </div>
  );
}

function Einkaeufe({
  items,
  bezugsjahr,
  kapitalIstAnteil,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: EinkaufEntry[];
  bezugsjahr: number | null;
  kapitalIstAnteil: boolean;
  onAdd: () => void;
  onUpdate: (id: string, p: Partial<EinkaufEntry>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-slate-100 bg-slate-50/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium text-slate-700">Einkäufe simulieren</div>
          <div className="text-xs text-slate-400">
            freiwillige Einzahlungen — werden bis Bezugsjahr verzinst, steuerlich abzugsfähig
          </div>
        </div>
        <KiHinweis
          begriff="PK-Einkauf"
          kontext="freiwillige Einzahlung in die Pensionskasse, Sperrfrist 3 Jahre, Steueroptimierung"
        />
      </div>

      {items.length === 0 && (
        <p className="text-xs text-slate-400">Noch keine Einkäufe simuliert.</p>
      )}

      <ul className="space-y-2">
        {items.map((it, idx) => {
          const sperrfristVerletzt =
            bezugsjahr != null &&
            it.jahr >= bezugsjahr - SPERRFRIST_EINKAUF_JAHRE + 1;
          const warnen = sperrfristVerletzt && kapitalIstAnteil;
          const bisJahrEff = it.bisJahr ?? it.jahr + 5;
          return (
            <li
              key={it.id}
              className={`space-y-2 rounded-md border p-3 ${
                warnen ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Einkauf {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(it.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Entfernen
                </button>
              </div>

              {/* Modus-Toggle: Einzel vs. Serie */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdate(it.id, { serie: false })
                  }
                  className={`flex-1 rounded-md border px-3 py-1.5 text-left text-xs transition ${
                    !it.serie
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="font-medium">Einmalig</div>
                  <div className="text-[11px] text-slate-500">
                    z.B. Bonus, Erbschaft
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate(it.id, {
                      serie: true,
                      bisJahr: it.bisJahr ?? it.jahr + 5,
                    })
                  }
                  className={`flex-1 rounded-md border px-3 py-1.5 text-left text-xs transition ${
                    it.serie
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="font-medium">Mehrjährig</div>
                  <div className="text-[11px] text-slate-500">
                    jährlich gleicher Betrag
                  </div>
                </button>
              </div>

              <div
                className={`grid gap-2 ${
                  it.serie ? "grid-cols-3" : "grid-cols-[120px_1fr]"
                }`}
              >
                <Field label={it.serie ? "Von Jahr" : "Jahr"}>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={it.jahr}
                    onChange={(e) =>
                      onUpdate(it.id, { jahr: Number(e.target.value) })
                    }
                    className={`${inputClass} tabular-nums`}
                  />
                </Field>
                {it.serie && (
                  <Field label="Bis Jahr (inkl.)">
                    <input
                      type="number"
                      min={it.jahr}
                      max={2100}
                      value={bisJahrEff}
                      onChange={(e) =>
                        onUpdate(it.id, { bisJahr: Number(e.target.value) })
                      }
                      className={`${inputClass} tabular-nums`}
                    />
                  </Field>
                )}
                <Field label="Betrag (CHF / Jahr)">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={it.betrag ?? ""}
                    onChange={(e) =>
                      onUpdate(it.id, {
                        betrag:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="z.B. 20'000"
                    className={`${inputClass} tabular-nums`}
                  />
                </Field>
              </div>
              {it.serie && it.betrag != null && it.betrag > 0 && (
                <p className="text-[11px] text-slate-500">
                  Serie wirkt jährlich {it.betrag.toLocaleString("de-CH")} CHF
                  von {it.jahr} bis {bisJahrEff} inkl. (
                  {Math.max(0, bisJahrEff - it.jahr + 1)} Jahre, Total{" "}
                  {(
                    it.betrag *
                    Math.max(0, bisJahrEff - it.jahr + 1)
                  ).toLocaleString("de-CH")}{" "}
                  CHF).
                </p>
              )}
              {warnen && (
                <p className="text-xs text-amber-700">
                  ⚠ 3-Jahres-Sperrfrist verletzt: dieser Einkauf liegt weniger als
                  3 Jahre vor dem Kapitalbezug — der Betrag darf gemäss Art. 79b
                  Abs. 3 BVG nicht als Kapital bezogen werden.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="mt-1 w-full rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
      >
        + Einkauf hinzufügen
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   WEF-Vorbezüge (Wohneigentumsförderung)
   ═══════════════════════════════════════════════════════════════════════ */

function WefListe({
  items,
  warnungenById,
  immobilienOptionen,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: WefVorbezugEntry[];
  warnungenById: Map<string, WefWarnung[]>;
  immobilienOptionen: { id: string; label: string }[];
  onAdd: () => void;
  onUpdate: (id: string, p: Partial<WefVorbezugEntry>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-slate-100 bg-slate-50/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium text-slate-700">
            WEF-Vorbezüge (Eigenheim)
          </div>
          <div className="text-xs text-slate-400">
            PK-Kapital für Wohneigentum vorbeziehen — mindert Altersguthaben
            und spätere Rente. Wird mit Kapitalauszahlungs-Sondertarif besteuert.
          </div>
        </div>
        <KiHinweis
          begriff="WEF-Vorbezug"
          kontext="Wohneigentumsförderung BVG, Vorbezug PK-Kapital für Eigenheim"
        />
      </div>

      {items.length === 0 && (
        <p className="text-xs text-slate-400">
          Noch keine WEF-Vorbezüge erfasst.
        </p>
      )}

      <ul className="space-y-2">
        {items.map((it) => {
          const warnungen = warnungenById.get(it.id) ?? [];
          return (
            <li
              key={it.id}
              className="rounded-md border border-slate-200 bg-white p-3"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Field label="Jahr">
                  <input
                    type="number"
                    min={1990}
                    max={2080}
                    value={it.jahr}
                    onChange={(e) =>
                      onUpdate(it.id, { jahr: Number(e.target.value) })
                    }
                    className={`${inputClass} tabular-nums`}
                  />
                </Field>
                <Field label="Betrag (CHF)" hint="mind. 20'000 CHF gemäss BVG">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={it.betrag ?? ""}
                    onChange={(e) =>
                      onUpdate(it.id, {
                        betrag:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="z.B. 80'000"
                    className={`${inputClass} tabular-nums`}
                  />
                </Field>
                <Field label="Beschreibung">
                  <input
                    type="text"
                    value={it.beschreibung}
                    onChange={(e) =>
                      onUpdate(it.id, { beschreibung: e.target.value })
                    }
                    placeholder="z.B. Kauf Wohnung Zürich"
                    className={inputClass}
                  />
                </Field>
              </div>
              {immobilienOptionen.length > 0 && (
                <div className="mt-2">
                  <Field
                    label="Verknüpfte Immobilie"
                    hint="WEF-Betrag tilgt die Hypothek dieser Liegenschaft"
                  >
                    <select
                      value={it.immoId ?? ""}
                      onChange={(e) =>
                        onUpdate(it.id, {
                          immoId: e.target.value === "" ? null : e.target.value,
                        })
                      }
                      className={inputClass}
                    >
                      <option value="">— erste selbstbewohnte (Default) —</option>
                      {immobilienOptionen.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
              {warnungen.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {warnungen.map((w, i) => (
                    <li
                      key={i}
                      className={`rounded-sm border px-2 py-1 text-xs ${
                        w.schwere === "fehler"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {w.schwere === "fehler" ? "⚠ " : "ℹ "}
                      {w.text}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => onRemove(it.id)}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Entfernen
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="mt-1 w-full rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
      >
        + WEF-Vorbezug hinzufügen
      </button>
    </div>
  );
}

