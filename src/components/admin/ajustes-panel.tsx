"use client";

import { useState, useTransition } from "react";
import { toggleMostrarPronosticosAntes } from "@/app/admin/ajustes/actions";

interface Props {
  mostrarPronosticosAntes: boolean;
}

export default function AjustesPanel({ mostrarPronosticosAntes }: Props) {
  const [checked, setChecked] = useState(mostrarPronosticosAntes);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !checked;
    setChecked(next);
    startTransition(() => toggleMostrarPronosticosAntes(next));
  }

  return (
    <div className="glass-card p-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-white">
          Mostrar pronósticos de otros jugadores antes del partido
        </p>
        <p className="text-xs text-gray-500 mt-1 max-w-md">
          Por defecto, en la Quiniela los pronósticos de los demás jugadores
          permanecen ocultos hasta que empieza cada partido. Activa esta opción
          para que sean visibles desde el momento en que se introducen.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={isPending}
        onClick={handleToggle}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
          checked ? "bg-[#00e87a]" : "bg-white/10"
        }`}
      >
        <span
          className={`inline-block size-5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
