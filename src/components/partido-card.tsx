"use client";

import { useState, useTransition } from "react";
import { guardarPronostico } from "@/app/partidos/actions";
import type { EstadoPartido, Fase } from "@prisma/client";

interface Props {
  partido: {
    id: string;
    equipoLocal: string;
    equipoVisitante: string;
    fechaPartido: string; // ISO string (serialized from server)
    fase: Fase;
    estado: EstadoPartido;
    golesLocalReal: number | null;
    golesVisitanteReal: number | null;
  };
  pronostico: { golesLocal: number; golesVisitante: number } | null;
}

function isLocked(fechaPartido: string, estado: EstadoPartido) {
  if (estado !== "PROGRAMADO") return true;
  const limite = new Date(fechaPartido).getTime() - 15 * 60 * 1000;
  return Date.now() >= limite;
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
  const [local, setLocal] = useState(pronostico?.golesLocal ?? "");
  const [visitante, setVisitante] = useState(pronostico?.golesVisitante ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (local === "" || visitante === "") return;
    startTransition(async () => {
      const res = await guardarPronostico(
        partido.id,
        Number(local),
        Number(visitante)
      );
      setMsg(res.error ? `✗ ${res.error}` : "✓ Guardado");
      setTimeout(() => setMsg(null), 2500);
    });
  }

  const estadoBadge =
    partido.estado === "EN_PROGRESO"
      ? "En juego"
      : partido.estado === "FINALIZADO"
      ? `${partido.golesLocalReal} - ${partido.golesVisitanteReal}`
      : null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
      {/* Equipos + inputs */}
      <span className="w-32 truncate text-right font-medium text-gray-800">
        {partido.equipoLocal}
      </span>

      {locked ? (
        <div className="flex items-center gap-1 px-2 text-gray-400 font-mono">
          <span>{pronostico?.golesLocal ?? "–"}</span>
          <span>:</span>
          <span>{pronostico?.golesVisitante ?? "–"}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={20}
            value={local}
            onChange={(e) => { setLocal(e.target.value); setMsg(null); }}
            className="w-10 rounded border border-gray-300 p-1 text-center font-mono"
          />
          <span className="text-gray-400">:</span>
          <input
            type="number"
            min={0}
            max={20}
            value={visitante}
            onChange={(e) => { setVisitante(e.target.value); setMsg(null); }}
            className="w-10 rounded border border-gray-300 p-1 text-center font-mono"
          />
          <button
            type="submit"
            disabled={pending}
            className="ml-1 rounded bg-green-700 px-2 py-1 text-white hover:bg-green-600 disabled:opacity-50"
          >
            {pending ? "…" : "OK"}
          </button>
        </form>
      )}

      <span className="w-32 truncate font-medium text-gray-800">
        {partido.equipoVisitante}
      </span>

      {/* Meta */}
      <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
        {estadoBadge && (
          <span className={`rounded px-1.5 py-0.5 font-medium ${
            partido.estado === "EN_PROGRESO"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-gray-100 text-gray-600"
          }`}>
            {estadoBadge}
          </span>
        )}
        {msg && (
          <span className={msg.startsWith("✓") ? "text-green-600" : "text-red-500"}>
            {msg}
          </span>
        )}
        <span>{formatFecha(partido.fechaPartido)}</span>
      </div>
    </div>
  );
}
