"use client";

import { useActionState } from "react";
import { createGrupo } from "@/app/actions/grupos";

export default function CrearGrupoForm() {
  const [state, action, isPending] = useActionState(createGrupo, null);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1.5">Nombre del grupo</label>
        <input
          type="text"
          name="nombre"
          placeholder="Ej: Peña del Barrio"
          required
          maxLength={50}
          autoFocus
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#00e87a]/50 focus:bg-white/8 transition-all"
        />
      </div>
      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-[#00e87a]/10 border border-[#00e87a]/30 px-5 py-3 text-sm font-medium text-[#00e87a] transition-all hover:bg-[#00e87a]/20 hover:border-[#00e87a]/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Creando…" : "Crear grupo"}
      </button>
    </form>
  );
}
