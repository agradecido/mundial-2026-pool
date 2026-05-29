"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetearPronosticosFuturos } from "@/app/quiniela/actions";

export default function ResetQuinielaButton() {
  const [confirming, setConfirming] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleReset() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const res = await resetearPronosticosFuturos();
      setConfirming(false);
      if ("error" in res && res.error) {
        setMensaje(res.error);
        setTimeout(() => setMensaje(null), 3000);
      } else if ("count" in res) {
        const n = res.count;
        setMensaje(
          n === 0
            ? "No había pronósticos futuros"
            : `${n} pronóstico${n !== 1 ? "s" : ""} eliminado${n !== 1 ? "s" : ""}`
        );
        router.refresh();
        setTimeout(() => setMensaje(null), 3000);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {mensaje && (
        <span className="text-xs text-gray-500 tabular-nums">{mensaje}</span>
      )}
      {confirming && !pending && (
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Cancelar
        </button>
      )}
      <button
        onClick={handleReset}
        disabled={pending}
        className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
          confirming
            ? "border-red-500/40 text-red-400 bg-red-500/10 hover:bg-red-500/20"
            : "border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/20"
        } disabled:opacity-40`}
      >
        {pending ? "Borrando…" : confirming ? "¿Confirmar borrado?" : "Resetear futuros"}
      </button>
    </div>
  );
}
