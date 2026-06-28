"use client";

import { useState, useEffect, useTransition } from "react";
import { guardarPronostico, resetearPronostico } from "@/app/quiniela/actions";
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
  pronostico: { golesLocal: number; golesVisitante: number; puntosGanados: number } | null;
}

function isLocked(fechaPartido: string, estado: EstadoPartido) {
  if (estado !== "PROGRAMADO") return true;
  return Date.now() >= new Date(fechaPartido).getTime() - 15 * 60 * 1000;
}

const TIER_COLOR: Record<number, string> = {
  10: "text-yellow-400",
  6:  "text-yellow-400",
  5:  "text-yellow-400",
  3:  "text-[#00e87a]",
  2:  "text-sky-400",
  1:  "text-sky-400",
  0:  "text-gray-600",
};

export default function PartidoListRow({ partido, pronostico }: Props) {
  const [locked, setLocked] = useState(false);
  const [local, setLocal] = useState(pronostico != null ? String(pronostico.golesLocal) : "");
  const [visitante, setVisitante] = useState(pronostico != null ? String(pronostico.golesVisitante) : "");
  const [saved, setSaved] = useState(!!pronostico);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLocked(isLocked(partido.fechaPartido, partido.estado));
  }, [partido.fechaPartido, partido.estado]);

  function handleSave() {
    if (local === "" && visitante === "") {
      startTransition(async () => {
        const res = await resetearPronostico(partido.id);
        if (!res.error) setSaved(false);
      });
      return;
    }
    if (local === "" || visitante === "") return;
    startTransition(async () => {
      const res = await guardarPronostico(partido.id, Number(local), Number(visitante));
      if (!res.error) setSaved(true);
    });
  }

  const isFinished = partido.estado === "FINALIZADO";
  const pts = pronostico?.puntosGanados ?? null;
  const ptsColor = pts !== null ? (TIER_COLOR[pts] ?? "text-gray-600") : "text-gray-700";

  return (
    <tr className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
      {/* Fecha */}
      <td className="px-3 py-2.5 text-[11px] text-gray-500 whitespace-nowrap hidden sm:table-cell tabular-nums">
        {new Date(partido.fechaPartido).toLocaleDateString("es-ES", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
          timeZone: "Europe/Madrid",
        })}
      </td>

      {/* Local */}
      <td className="px-3 py-2.5 text-right">
        <span className="inline-flex items-center gap-1.5 justify-end min-w-0">
          <span className="text-sm font-medium text-gray-200 truncate max-w-[80px] sm:max-w-[120px]">
            {partido.equipoLocal}
          </span>
          <span className="text-lg leading-none shrink-0">{getFlag(partido.equipoLocal)}</span>
        </span>
      </td>

      {/* Pronóstico */}
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-1 justify-center">
          {locked ? (
            <>
              <span className="w-7 text-center font-mono text-sm text-gray-400 tabular-nums">
                {pronostico != null ? pronostico.golesLocal : "–"}
              </span>
              <span className="text-gray-600 text-xs">:</span>
              <span className="w-7 text-center font-mono text-sm text-gray-400 tabular-nums">
                {pronostico != null ? pronostico.golesVisitante : "–"}
              </span>
            </>
          ) : (
            <>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={local} placeholder="-"
                onFocus={e => e.target.select()}
                onChange={e => { setLocal(e.target.value.replace(/[^0-9]/g, "")); setSaved(false); }}
                className="w-8 text-center bg-white/[0.06] border border-white/10 rounded text-sm text-white tabular-nums focus:outline-none focus:border-white/30 py-0.5"
              />
              <span className="text-gray-600 text-xs">:</span>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={visitante} placeholder="-"
                onFocus={e => e.target.select()}
                onChange={e => { setVisitante(e.target.value.replace(/[^0-9]/g, "")); setSaved(false); }}
                className="w-8 text-center bg-white/[0.06] border border-white/10 rounded text-sm text-white tabular-nums focus:outline-none focus:border-white/30 py-0.5"
              />
            </>
          )}
        </div>
      </td>

      {/* Visitante */}
      <td className="px-3 py-2.5 text-left">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="text-lg leading-none shrink-0">{getFlag(partido.equipoVisitante)}</span>
          <span className="text-sm font-medium text-gray-200 truncate max-w-[80px] sm:max-w-[120px]">
            {partido.equipoVisitante}
          </span>
        </span>
      </td>

      {/* Resultado real */}
      <td className="px-3 py-2.5 text-center font-mono text-sm tabular-nums hidden sm:table-cell">
        {isFinished && partido.golesLocalReal !== null
          ? <span className="text-gray-300">{partido.golesLocalReal}–{partido.golesVisitanteReal}</span>
          : <span className="text-gray-700">—</span>}
      </td>

      {/* Puntos / Guardar */}
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        {isFinished ? (
          <span className={`text-sm font-bold tabular-nums ${ptsColor}`}>
            {pts !== null ? `${pts > 0 ? "+" : ""}${pts}` : "–"}
          </span>
        ) : !locked ? (
          saved ? (
            <span className="text-[10px] text-[#00e87a] font-semibold">✓</span>
          ) : (
            <button
              onClick={handleSave}
              disabled={pending}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#00e87a]/15 border border-[#00e87a]/30 text-[#00e87a] hover:bg-[#00e87a]/25 transition-colors disabled:opacity-40 font-medium"
            >
              {pending ? "…" : "Guardar"}
            </button>
          )
        ) : (
          <span className="text-[10px] text-gray-600">🔒</span>
        )}
      </td>
    </tr>
  );
}
