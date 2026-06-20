"use client";

import { useTransition, useState } from "react";
import { generarBadgesAction } from "@/app/admin/actions";

export default function GenerarBadgesButton() {
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  function handleClick() {
    setResultado(null);
    startTransition(async () => {
      const res = await generarBadgesAction();
      setResultado(res);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-5 py-2.5 text-sm font-medium text-purple-300 hover:border-purple-500/50 hover:bg-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] [touch-action:manipulation] transition-all duration-100"
      >
        {pending ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-purple-400/20 border-t-purple-400 animate-spin" />
            Generando con IA…
          </>
        ) : (
          <>✨ Generar badges IA</>
        )}
      </button>
      {resultado && (
        <p className={`text-xs ${resultado.ok ? "text-green-400" : "text-red-400"}`}>
          {resultado.ok ? "✓" : "✗"} {resultado.mensaje}
        </p>
      )}
    </div>
  );
}
