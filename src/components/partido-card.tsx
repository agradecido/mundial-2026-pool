"use client";

import { useState, useTransition } from "react";
import { guardarPronostico } from "@/app/partidos/actions";
import { getFlag } from "@/lib/flags";
import type { EstadoPartido, Fase } from "@prisma/client";

interface Props {
  partido: {
    id: string;
    equipoLocal: string;
    equipoVisitante: string;
    fechaPartido: string;
    fase: Fase;
    estado: EstadoPartido;
    golesLocalReal: number | null;
    golesVisitanteReal: number | null;
  };
  pronostico: { golesLocal: number; golesVisitante: number } | null;
}

function isLocked(fechaPartido: string, estado: EstadoPartido) {
  if (estado !== "PROGRAMADO") return true;
  return Date.now() >= new Date(fechaPartido).getTime() - 15 * 60 * 1000;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

export default function PartidoCard({ partido, pronostico }: Props) {
  const locked = isLocked(partido.fechaPartido, partido.estado);
  const [local, setLocal] = useState<string>(
    pronostico != null ? String(pronostico.golesLocal) : ""
  );
  const [visitante, setVisitante] = useState<string>(
    pronostico != null ? String(pronostico.golesVisitante) : ""
  );
  const [saved, setSaved] = useState(!!pronostico);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (local === "" || visitante === "") return;
    setError(null);
    startTransition(async () => {
      const res = await guardarPronostico(partido.id, Number(local), Number(visitante));
      if (res.error) {
        setError(res.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  const flagLocal = getFlag(partido.equipoLocal);
  const flagVisitante = getFlag(partido.equipoVisitante);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03] transition-all hover:border-white/[0.12] hover:bg-white/[0.05] group">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-[#00e87a]/30 transition-colors" />

      <div className="px-4 py-3 space-y-2">
        {/* Row 1: Teams */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">{flagLocal}</span>
            <span className="truncate text-base lg:text-lg font-semibold text-gray-200">
              {partido.equipoLocal}
            </span>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
            <span className="truncate text-base lg:text-lg font-semibold text-gray-200 text-right">
              {partido.equipoVisitante}
            </span>
            <span className="text-2xl shrink-0">{flagVisitante}</span>
          </div>
        </div>

        {/* Row 2: Score + Meta */}
        <div className="flex items-center justify-between gap-2">
          {locked ? (
            <div className="flex items-center gap-2">
              <span className="score-input flex items-center justify-center text-gray-400 text-xl font-bold font-mono bg-transparent border-transparent select-none">
                {pronostico != null ? pronostico.golesLocal : "–"}
              </span>
              <span className="text-gray-600 font-bold">:</span>
              <span className="score-input flex items-center justify-center text-gray-400 text-xl font-bold font-mono bg-transparent border-transparent select-none">
                {pronostico != null ? pronostico.golesVisitante : "–"}
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={20}
                value={local}
                onChange={(e) => { setLocal(e.target.value); setError(null); setSaved(false); }}
                className="score-input"
                placeholder="0"
              />
              <span className="text-[#00e87a] font-bold text-lg">:</span>
              <input
                type="number"
                min={0}
                max={20}
                value={visitante}
                onChange={(e) => { setVisitante(e.target.value); setError(null); setSaved(false); }}
                className="score-input"
                placeholder="0"
              />
              <button
                type="submit"
                disabled={pending || local === "" || visitante === ""}
                className={`btn-save ${saved ? "animate-saved" : ""}`}
              >
                {pending ? "…" : saved ? "✓" : "OK"}
              </button>
            </form>
          )}

          <div className="flex flex-col items-end gap-0.5 text-right shrink-0">
            {partido.estado === "EN_PROGRESO" && (
              <span className="text-xs font-semibold text-yellow-400 bg-yellow-400/10 rounded px-1.5 py-0.5">
                EN JUEGO
              </span>
            )}
            {partido.estado === "FINALIZADO" && (
              <span className="text-xs text-gray-500 font-mono">
                {partido.golesLocalReal}–{partido.golesVisitanteReal}
              </span>
            )}
            {locked && partido.estado === "PROGRAMADO" && (
              <span className="text-xs text-gray-600">🔒</span>
            )}
            {error && (
              <span className="text-xs text-red-400">{error}</span>
            )}
            <span className="text-xs text-gray-600">{formatFecha(partido.fechaPartido)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
