"use client";

import { usePlanStore, type AhvInput } from "@/lib/store";
import { personLabel } from "@/lib/pension";
import {
  bezugsfaktor,
  ORDENTLICHES_AHV_ALTER,
  MAX_VORBEZUG_JAHRE,
  MAX_AUFSCHUB_JAHRE,
} from "@/engine/ahv";
import { Field } from "@/components/ui/Field";
import { KiHinweis } from "@/components/ui/KiHinweis";
import { YesNoButtons } from "@/components/ui/YesNoButtons";
import { inputClass, selectClass } from "@/components/ui/styles";

const AHV_ALTER_MIN = ORDENTLICHES_AHV_ALTER - MAX_VORBEZUG_JAHRE; // 63
const AHV_ALTER_MAX = ORDENTLICHES_AHV_ALTER + MAX_AUFSCHUB_JAHRE; // 70

export function Block4Ahv() {
  const fallart = usePlanStore((s) => s.fallart);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);
  const ahv = usePlanStore((s) => s.ahv);
  const setAhv = usePlanStore((s) => s.setAhv);

  return (
    <div className="space-y-6">
      <PersonAhvForm
        title={personLabel(1, person1.vorname, fallart)}
        einkommen={ahv.einkommenP1}
        hatIkAuszug={ahv.hatIkAuszugP1}
        hatFehljahre={ahv.hatFehljahreP1}
        fehljahreAnzahl={ahv.fehljahreAnzahlP1}
        ahvBezugsalter={ahv.ahvBezugsalterP1}
        ahvRenteJahrEffektiv={ahv.ahvRenteJahrEffektivP1}
        onPatch={(p) => setAhv(mapToP1(p))}
      />

      {fallart === "paar" && (
        <PersonAhvForm
          title={personLabel(2, person2.vorname, fallart)}
          einkommen={ahv.einkommenP2}
          hatIkAuszug={ahv.hatIkAuszugP2}
          hatFehljahre={ahv.hatFehljahreP2}
          fehljahreAnzahl={ahv.fehljahreAnzahlP2}
          ahvBezugsalter={ahv.ahvBezugsalterP2}
          ahvRenteJahrEffektiv={ahv.ahvRenteJahrEffektivP2}
          onPatch={(p) => setAhv(mapToP2(p))}
        />
      )}

      <p className="text-xs text-slate-400">
        AHV-Bezugsalter ist unabhängig vom Pensionierungsalter (Block 2). Mit 63 in
        Pension gehen und AHV trotzdem mit 65 ordentlich beziehen ist möglich.
      </p>
    </div>
  );
}

interface PersonAhvPatch {
  einkommen?: number | null;
  hatIkAuszug?: boolean;
  hatFehljahre?: boolean;
  fehljahreAnzahl?: number;
  ahvBezugsalter?: number;
  ahvRenteJahrEffektiv?: number | null;
}

function mapToP1(p: PersonAhvPatch): Partial<AhvInput> {
  const r: Partial<AhvInput> = {};
  if (p.einkommen !== undefined) r.einkommenP1 = p.einkommen;
  if (p.hatIkAuszug !== undefined) r.hatIkAuszugP1 = p.hatIkAuszug;
  if (p.hatFehljahre !== undefined) r.hatFehljahreP1 = p.hatFehljahre;
  if (p.fehljahreAnzahl !== undefined) r.fehljahreAnzahlP1 = p.fehljahreAnzahl;
  if (p.ahvBezugsalter !== undefined) r.ahvBezugsalterP1 = p.ahvBezugsalter;
  if (p.ahvRenteJahrEffektiv !== undefined)
    r.ahvRenteJahrEffektivP1 = p.ahvRenteJahrEffektiv;
  return r;
}

function mapToP2(p: PersonAhvPatch): Partial<AhvInput> {
  const r: Partial<AhvInput> = {};
  if (p.einkommen !== undefined) r.einkommenP2 = p.einkommen;
  if (p.hatIkAuszug !== undefined) r.hatIkAuszugP2 = p.hatIkAuszug;
  if (p.hatFehljahre !== undefined) r.hatFehljahreP2 = p.hatFehljahre;
  if (p.fehljahreAnzahl !== undefined) r.fehljahreAnzahlP2 = p.fehljahreAnzahl;
  if (p.ahvBezugsalter !== undefined) r.ahvBezugsalterP2 = p.ahvBezugsalter;
  if (p.ahvRenteJahrEffektiv !== undefined)
    r.ahvRenteJahrEffektivP2 = p.ahvRenteJahrEffektiv;
  return r;
}

function PersonAhvForm({
  title,
  einkommen,
  hatIkAuszug,
  hatFehljahre,
  fehljahreAnzahl,
  ahvBezugsalter,
  ahvRenteJahrEffektiv,
  onPatch,
}: {
  title: string;
  einkommen: number | null;
  hatIkAuszug: boolean;
  hatFehljahre: boolean;
  fehljahreAnzahl: number;
  ahvBezugsalter: number;
  ahvRenteJahrEffektiv: number | null;
  onPatch: (p: PersonAhvPatch) => void;
}) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">{title}</legend>

      <Field
        label="Massgebendes Jahreseinkommen (CHF)"
        hint="durchschnittlich über die Karriere — laut IK-Auszug (NICHT aktueller Lohn)"
        info={
          <KiHinweis
            begriff="Massgebendes Einkommen"
            kontext="AHV-Rentenberechnung Schweiz"
          />
        }
      >
        <input
          type="number"
          inputMode="numeric"
          value={einkommen ?? ""}
          onChange={(e) =>
            onPatch({
              einkommen: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          placeholder="z.B. 80'000"
          className={`${inputClass} tabular-nums`}
        />
      </Field>

      <Field
        label="Voraussichtliche AHV-Jahresrente direkt (CHF, optional)"
        hint="aus IK-Auszug / BSV-Prognose — überschreibt Skala-44-Berechnung. Empfohlen bei Geschiedenen, Frühpension-Komplikationen, Beitragslücken."
        info={
          <KiHinweis
            begriff="AHV-Rente Override"
            kontext="Wann direkt eingeben statt aus Einkommen rechnen?"
          />
        }
      >
        <input
          type="number"
          inputMode="numeric"
          value={ahvRenteJahrEffektiv ?? ""}
          onChange={(e) =>
            onPatch({
              ahvRenteJahrEffektiv:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
          placeholder="leer = aus Einkommen berechnet"
          className={`${inputClass} tabular-nums`}
        />
      </Field>

      <Field
        label="AHV-Bezugsalter"
        hint="Monatsschritte gemäss BSV-Merkblatt 3.04 'Flexibler Rentenbezug' (AHV21). 63/64 = Vorbezug, 65 = ordentlich, 66–70 = Aufschub."
        info={
          <KiHinweis
            begriff="AHV-Vorbezug und Aufschub"
            kontext="Wann lohnt es sich, die AHV früher oder später zu beziehen?"
          />
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              value={Math.floor(ahvBezugsalter)}
              onChange={(e) => {
                const j = Number(e.target.value);
                const m = Math.round((ahvBezugsalter - Math.floor(ahvBezugsalter)) * 12);
                onPatch({ ahvBezugsalter: combineAlter(j, m) });
              }}
              className={`${selectClass} w-20 text-center tabular-nums`}
              aria-label="Bezugsalter Jahre"
            >
              {jahreOptionen().map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">Jahre</span>
            <select
              value={Math.round((ahvBezugsalter - Math.floor(ahvBezugsalter)) * 12)}
              onChange={(e) => {
                const j = Math.floor(ahvBezugsalter);
                const m = Number(e.target.value);
                onPatch({ ahvBezugsalter: combineAlter(j, m) });
              }}
              className={`${selectClass} w-20 text-center tabular-nums`}
              aria-label="Bezugsalter Monate"
            >
              {monateOptionen().map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">Monate</span>
          </div>
          <BezugsalterHint alter={ahvBezugsalter} />
        </div>
      </Field>

      <div>
        <div className="mb-1 text-xs font-medium text-slate-600">
          Aktueller IK-Auszug vorhanden?
        </div>
        <YesNoButtons value={hatIkAuszug} onChange={(v) => onPatch({ hatIkAuszug: v })} />
      </div>

      <div>
        <div className="mb-1 text-xs font-medium text-slate-600">
          Fehljahre in der AHV?
        </div>
        <div className="mb-1 text-xs text-slate-400">
          z.B. Auslandjahre, Studium ohne AHV-Beitrag, Lücken
        </div>
        <YesNoButtons
          value={hatFehljahre}
          onChange={(v) =>
            onPatch({
              hatFehljahre: v,
              ...(v === false ? { fehljahreAnzahl: 0 } : {}),
            })
          }
        />
        {hatFehljahre && (
          <div className="mt-3">
            <Field label="Anzahl Fehljahre">
              <input
                type="number"
                min={0}
                max={44}
                value={fehljahreAnzahl}
                onChange={(e) =>
                  onPatch({ fehljahreAnzahl: Number(e.target.value) })
                }
                className={`${inputClass} w-24 text-center tabular-nums`}
              />
            </Field>
          </div>
        )}
      </div>
    </fieldset>
  );
}

function jahreOptionen(): number[] {
  const out: number[] = [];
  for (let a = AHV_ALTER_MIN; a <= AHV_ALTER_MAX; a++) out.push(a);
  return out;
}

function monateOptionen(): number[] {
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
}

/**
 * Kombiniert Jahre + Monate zu dezimalem Bezugsalter und clamped innerhalb
 * der erlaubten Range (63 Jahre 0 Mt bis 70 Jahre 0 Mt). Aufschub > 70 oder
 * Vorbezug < 63 werden geklamped.
 */
function combineAlter(jahre: number, monate: number): number {
  const raw = jahre + monate / 12;
  const min = AHV_ALTER_MIN;
  const max = AHV_ALTER_MAX;
  return Math.max(min, Math.min(max, raw));
}

function BezugsalterHint({ alter }: { alter: number }) {
  if (alter === ORDENTLICHES_AHV_ALTER) {
    return (
      <span className="text-xs text-slate-500">
        ordentlich · Faktor 1.000
      </span>
    );
  }
  const faktor = bezugsfaktor(alter);
  const pct = ((faktor - 1) * 100).toFixed(1);
  if (alter < ORDENTLICHES_AHV_ALTER) {
    const monate = Math.round((ORDENTLICHES_AHV_ALTER - alter) * 12);
    return (
      <span className="text-xs text-amber-700">
        Vorbezug {formatJahreMonate(monate)} · {pct}% · Faktor {faktor.toFixed(3)}
      </span>
    );
  }
  const monate = Math.round((alter - ORDENTLICHES_AHV_ALTER) * 12);
  return (
    <span className="text-xs text-emerald-700">
      Aufschub {formatJahreMonate(monate)} · +{pct}% · Faktor {faktor.toFixed(3)}
    </span>
  );
}

function formatJahreMonate(monate: number): string {
  const j = Math.floor(monate / 12);
  const m = monate % 12;
  if (j === 0) return `${m} Mt`;
  if (m === 0) return `${j} J`;
  return `${j} J ${m} Mt`;
}

