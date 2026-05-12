"use client";

import { useState } from "react";
import { useBeraterProfil } from "@/lib/berater-profil";
import { inputClass } from "@/components/ui/styles";

/**
 * Modal-Editor für das Berater-Profil (E2-8 / Y-2b P3-Audit).
 * Foto via File-Upload als Base64 in LocalStorage.
 */
export function BeraterProfilEditor({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { profil, setProfil, reset } = useBeraterProfil();
  const [uploading, setUploading] = useState(false);

  if (!open) return null;

  const handleFoto = async (file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as string;
        setProfil({ fotoBase64: data });
        setUploading(false);
      };
      reader.onerror = () => setUploading(false);
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="berater-profil-title"
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-baseline justify-between border-b border-slate-100 pb-3">
          <h2 id="berater-profil-title" className="text-lg font-semibold text-slate-800">
            Berater-Profil bearbeiten
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
            aria-label="Schliessen"
          >
            ✕
          </button>
        </header>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-lg font-semibold text-slate-500"
              aria-hidden
            >
              {profil.fotoBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profil.fotoBase64}
                  alt="Berater-Foto"
                  className="h-full w-full object-cover"
                />
              ) : (
                profil.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              )}
            </div>
            <label className="cursor-pointer text-xs text-blue-700 hover:underline">
              {uploading ? "Hochladen..." : "Foto wählen"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFoto(f);
                }}
              />
            </label>
            {profil.fotoBase64 && (
              <button
                type="button"
                onClick={() => setProfil({ fotoBase64: null })}
                className="text-xs text-rose-700 hover:underline"
              >
                Entfernen
              </button>
            )}
          </div>

          <FieldRow label="Name">
            <input
              type="text"
              value={profil.name}
              onChange={(e) => setProfil({ name: e.target.value })}
              className={inputClass}
            />
          </FieldRow>

          <FieldRow label="Rolle">
            <input
              type="text"
              value={profil.rolle}
              onChange={(e) => setProfil({ rolle: e.target.value })}
              className={inputClass}
              placeholder="z.B. Senior Pensionsplaner"
            />
          </FieldRow>

          <FieldRow label="E-Mail">
            <input
              type="email"
              value={profil.email}
              onChange={(e) => setProfil({ email: e.target.value })}
              className={inputClass}
            />
          </FieldRow>

          <FieldRow label="Telefon">
            <input
              type="tel"
              value={profil.telefon}
              onChange={(e) => setProfil({ telefon: e.target.value })}
              className={inputClass}
              placeholder="+41 44 000 00 00"
            />
          </FieldRow>

          <FieldRow label="Office-Adresse">
            <input
              type="text"
              value={profil.office}
              onChange={(e) => setProfil({ office: e.target.value })}
              className={inputClass}
              placeholder="Splügenstrasse 11, 8002 Zürich"
            />
          </FieldRow>

          <FieldRow label="Termin-Link (optional)">
            <input
              type="url"
              value={profil.kalenderUrl}
              onChange={(e) => setProfil({ kalenderUrl: e.target.value })}
              className={inputClass}
              placeholder="https://calendly.com/..."
            />
          </FieldRow>
        </div>

        <footer className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={reset}
            className="text-xs text-slate-500 hover:underline"
          >
            Auf Default zurücksetzen
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[var(--color-cuira-deep)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Fertig
          </button>
        </footer>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
