"use client";

import { useState, useTransition } from "react";
import { actualizarPronosticoAdmin } from "@/app/admin/usuarios/[userId]/pronosticos/actions";
import type { EstadoPartido, Fase } from "@prisma/client";

interface Partido {
  id: string;
  equipoLocal: string;
  equipoVisitante: string;
  fechaPartido: string;
  estado: EstadoPartido;
  fase: Fase;
  grupo: string | null;
  golesLocalReal: number | null;
  golesVisitanteReal: number | null;
}

interface Pronostico {
  golesLocal: number;
  golesVisitante: number;
  puntosGanados: number;
}

interface Props {
  userId: string;
  partidos: Partido[];
  pronosticoMap: Record<string, Pronostico>;
}

const ESTADO_LABELS: Record<EstadoPartido, string> = {
  PROGRAMADO: "Programado",
  EN_PROGRESO: "En juego",
  FINALIZADO: "Finalizado",
};

const ESTADO_COLORS: Record<EstadoPartido, string> = {
  PROGRAMADO: "text-gray-500 bg-white/5",
  EN_PROGRESO: "text-yellow-400 bg-yellow-400/10",
  FINALIZADO: "text-green-400 bg-green-400/10",
};

function PartidoRow({
  partido,
  pronostico,
  userId,
}: {
  partido: Partido;
  pronostico: Pronostico | undefined;
  userId: string;
}) {
  const [local, setLocal] = useState(pronostico?.golesLocal?.toString() ?? "");
  const [visitante, setVisitante] = useState(pronostico?.golesVisitante?.toString() ?? "");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleSave() {
    const gl = parseInt(local, 10);
    const gv = parseInt(visitante, 10);
    if (isNaN(gl) || isNaN(gv)) { setStatus("error"); setErrorMsg("Valores inválidos"); return; }
    setStatus("idle");
    startTransition(async () => {
      const res = await actualizarPronosticoAdmin(userId, partido.id, gl, gv);
      if (res.ok) {
        setStatus("ok");
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("error");
        setErrorMsg(res.error ?? "Error");
      }
    });
  }

  const fecha = new Date(partido.fechaPartido).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", timeZone: "Europe/Madrid",
  });
  const hora = new Date(partido.fechaPartido).toLocaleTimeString("es-ES", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid",
  });

  const pts = pronostico?.puntosGanados ?? 0;
  const hasResult = partido.golesLocalReal !== null && partido.golesVisitanteReal !== null;

  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors align-middle">
      {/* Fecha */}
      <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">
        {fecha}<br />
        <span className="text-gray-600">{hora}</span>
      </td>
      {/* Equipos */}
      <td className="px-3 py-2.5">
        <div className="text-xs">
          <span className="text-gray-300">{partido.equipoLocal}</span>
          <span className="text-gray-600 mx-1">vs</span>
          <span className="text-gray-300">{partido.equipoVisitante}</span>
        </div>
        {partido.grupo && (
          <span className="text-[10px] text-gray-600">Grupo {partido.grupo}</span>
        )}
      </td>
      {/* Estado */}
      <td className="px-3 py-2.5 hidden sm:table-cell">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ESTADO_COLORS[partido.estado]}`}>
          {ESTADO_LABELS[partido.estado]}
        </span>
      </td>
      {/* Resultado real */}
      <td className="px-3 py-2.5 text-center hidden md:table-cell">
        {hasResult ? (
          <span className="text-sm font-bold text-white tabular-nums">
            {partido.golesLocalReal}-{partido.golesVisitanteReal}
          </span>
        ) : (
          <span className="text-gray-700">—</span>
        )}
      </td>
      {/* Pronóstico editable */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={99}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            disabled={pending}
            className="w-10 rounded border border-white/10 bg-white/[0.04] px-1.5 py-1 text-center text-sm text-white focus:outline-none focus:border-white/30 disabled:opacity-50 tabular-nums"
          />
          <span className="text-gray-600">-</span>
          <input
            type="number"
            min={0}
            max={99}
            value={visitante}
            onChange={(e) => setVisitante(e.target.value)}
            disabled={pending}
            className="w-10 rounded border border-white/10 bg-white/[0.04] px-1.5 py-1 text-center text-sm text-white focus:outline-none focus:border-white/30 disabled:opacity-50 tabular-nums"
          />
        </div>
      </td>
      {/* Puntos */}
      <td className="px-3 py-2.5 text-center hidden sm:table-cell">
        <span className={`text-sm font-semibold tabular-nums ${pts > 0 ? "text-[#00e87a]" : "text-gray-600"}`}>
          {pts}
        </span>
      </td>
      {/* Acción */}
      <td className="px-3 py-2.5 text-right">
        {status === "ok" ? (
          <span className="text-[11px] text-green-400">✓ Guardado</span>
        ) : status === "error" ? (
          <span className="text-[11px] text-red-400">{errorMsg}</span>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="rounded border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
          >
            {pending ? "…" : "Guardar"}
          </button>
        )}
      </td>
    </tr>
  );
}

export default function PronosticosEditor({ userId, partidos, pronosticoMap }: Props) {
  const [filter, setFilter] = useState<"todos" | "PROGRAMADO" | "EN_PROGRESO" | "FINALIZADO">("todos");
  const [search, setSearch] = useState("");

  const filtered = partidos.filter((p) => {
    if (filter !== "todos" && p.estado !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.equipoLocal.toLowerCase().includes(q) && !p.equipoVisitante.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPuntos = Object.values(pronosticoMap).reduce((s, p) => s + p.puntosGanados, 0);
  const totalPronosticos = Object.keys(pronosticoMap).length;

  return (
    <div className="space-y-4">
      {/* Stats rápidas */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500">{totalPronosticos} pronósticos</span>
        <span className="text-gray-700">·</span>
        <span className="text-[#00e87a] font-semibold">{totalPuntos} pts totales</span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Buscar equipo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-white/30"
        />
        {(["todos", "PROGRAMADO", "EN_PROGRESO", "FINALIZADO"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              filter === f
                ? "bg-white/10 border-white/20 text-white"
                : "border-white/[0.06] bg-white/[0.02] text-gray-500 hover:text-gray-300"
            }`}
          >
            {f === "todos" ? "Todos" : ESTADO_LABELS[f]}
            {f !== "todos" && (
              <span className="ml-1 text-gray-600">
                ({partidos.filter((p) => p.estado === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-gray-500">
              <th className="px-3 py-2.5 font-medium">Fecha</th>
              <th className="px-3 py-2.5 font-medium">Partido</th>
              <th className="px-3 py-2.5 font-medium hidden sm:table-cell">Estado</th>
              <th className="px-3 py-2.5 font-medium text-center hidden md:table-cell">Resultado</th>
              <th className="px-3 py-2.5 font-medium">Pronóstico</th>
              <th className="px-3 py-2.5 font-medium text-center hidden sm:table-cell">Pts</th>
              <th className="px-3 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-xs text-gray-600">
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <PartidoRow
                  key={p.id}
                  partido={p}
                  pronostico={pronosticoMap[p.id]}
                  userId={userId}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
