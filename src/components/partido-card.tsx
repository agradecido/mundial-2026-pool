"use client";

import { useState, useTransition, useEffect } from "react";
import { guardarPronostico } from "@/app/quiniela/actions";
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
    estadio: string | null;
    ciudad: string | null;
  };
  pronostico: { golesLocal: number; golesVisitante: number } | null;
  odds?: { home: number; draw: number; away: number } | null;
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

function CheckIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function PartidoCard({ partido, pronostico, odds }: Props) {
  const [locked, setLocked] = useState(false);
  const [local, setLocal] = useState<string>(
    pronostico != null ? String(pronostico.golesLocal) : "0",
  );
  const [visitante, setVisitante] = useState<string>(
    pronostico != null ? String(pronostico.golesVisitante) : "0",
  );
  const [saved, setSaved] = useState(!!pronostico);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLocked(isLocked(partido.fechaPartido, partido.estado));
  }, [partido.fechaPartido, partido.estado]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (local === "" || visitante === "") return;
    setError(null);
    startTransition(async () => {
      const res = await guardarPronostico(
        partido.id,
        Number(local),
        Number(visitante),
      );
      if (res.error) {
        setError(res.error);
      } else {
        setSaved(true);
      }
    });
  }

  const flagLocal = getFlag(partido.equipoLocal);
  const flagVisitante = getFlag(partido.equipoVisitante);

  // ── Display helpers ────────────────────────────────────────────────
  const showInputs = !locked;
  const localValue = pronostico != null ? pronostico.golesLocal : null;
  const visitanteValue = pronostico != null ? pronostico.golesVisitante : null;

  const statusBadge =
    partido.estado === "EN_PROGRESO" ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-yellow-300 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-2 py-0.5">
        <span className="size-1.5 rounded-full bg-yellow-300 animate-pulse" />
        En juego
      </span>
    ) : partido.estado === "FINALIZADO" ? (
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-white/[0.04] border border-white/[0.08] rounded-full px-2 py-0.5">
        Final {partido.golesLocalReal}–{partido.golesVisitanteReal}
      </span>
    ) : locked ? (
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-white/[0.03] border border-white/[0.06] rounded-full px-2 py-0.5">
        🔒 Cerrado
      </span>
    ) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.015] transition-all hover:border-white/[0.14] hover:from-white/[0.06] hover:to-white/[0.02] group">
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent group-hover:via-[#00e87a]/40 transition-colors" />

      {/* Header: fecha + sede + badge de estado */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] uppercase tracking-[0.18em] text-gray-200 font-medium tabular-nums">
            {formatFecha(partido.fechaPartido)}
          </span>
          {partido.estadio && (
            <span className="text-[12px] text-gray-400 truncate max-w-[180px]">
              {partido.estadio}, {partido.ciudad}
            </span>
          )}
        </div>
        {statusBadge}
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2">
        {/* Body: grid simétrico 3 columnas */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 lg:gap-4">
          {/* ── Equipo Local ───────────────────────── */}
          <div className="flex flex-col items-center gap-2 min-w-0">
            <span className="text-4xl lg:text-5xl leading-none drop-shadow-sm">
              {flagLocal}
            </span>
            <span className="text-sm lg:text-base font-bold text-gray-100 text-center leading-tight line-clamp-2">
              {partido.equipoLocal}
            </span>
            {showInputs ? (
              <input
                type="number"
                min={0}
                max={20}
                value={local}
                onChange={(e) => {
                  setLocal(e.target.value);
                  setError(null);
                  setSaved(false);
                }}
                aria-label={`Goles ${partido.equipoLocal}`}
                className="score-input"
              />
            ) : (
              <span className="score-input flex items-center justify-center text-gray-400 select-none">
                {localValue ?? "–"}
              </span>
            )}
            {odds && (
              <span className="text-[10px] font-mono tabular-nums text-gray-400 bg-white/[0.04] border border-white/[0.08] rounded-full px-2 py-0.5">
                {odds.home.toFixed(2)}
              </span>
            )}
          </div>

          {/* ── Separador central ───────────────────── */}
          <div className="flex flex-col items-center gap-2 pt-1">
            {/* Espaciado para alinear con bandera */}
            <span
              className="text-4xl lg:text-5xl leading-none opacity-0 select-none"
              aria-hidden
            >
              ·
            </span>
            {/* Espaciado para alinear con nombre */}
            <span
              className="text-sm lg:text-base leading-tight opacity-0 select-none"
              aria-hidden
            >
              vs
            </span>
            <span className="text-2xl lg:text-3xl font-bold text-gray-600 leading-[3rem] select-none">
              :
            </span>
            {odds && (
              <span className="flex flex-col items-center gap-0.5">
                <span className="text-[8px] font-bold uppercase tracking-widest text-gray-600">
                  X
                </span>
                <span className="text-[10px] font-mono tabular-nums text-gray-500 bg-white/[0.03] border border-white/[0.06] rounded-full px-2 py-0.5">
                  {odds.draw.toFixed(2)}
                </span>
              </span>
            )}
          </div>

          {/* ── Equipo Visitante ────────────────────── */}
          <div className="flex flex-col items-center gap-2 min-w-0">
            <span className="text-4xl lg:text-5xl leading-none drop-shadow-sm">
              {flagVisitante}
            </span>
            <span className="text-sm lg:text-base font-bold text-gray-100 text-center leading-tight line-clamp-2">
              {partido.equipoVisitante}
            </span>
            {showInputs ? (
              <input
                type="number"
                min={0}
                max={20}
                value={visitante}
                onChange={(e) => {
                  setVisitante(e.target.value);
                  setError(null);
                  setSaved(false);
                }}
                aria-label={`Goles ${partido.equipoVisitante}`}
                className="score-input"
              />
            ) : (
              <span className="score-input flex items-center justify-center text-gray-400 select-none">
                {visitanteValue ?? "–"}
              </span>
            )}
            {odds && (
              <span className="text-[10px] font-mono tabular-nums text-gray-400 bg-white/[0.04] border border-white/[0.08] rounded-full px-2 py-0.5">
                {odds.away.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Acción / feedback */}
        {showInputs && (
          <div className="mt-3 flex items-center justify-center gap-3 min-h-[2.5rem]">
            {saved ? (
              <span
                className="inline-flex items-center gap-1.5 text-[#00e87a] text-xs font-semibold uppercase tracking-wider"
                style={{ filter: "drop-shadow(0 0 8px rgba(0,232,122,0.55))" }}
              >
                <CheckIcon />
                Guardado
              </span>
            ) : (
              <button
                type="submit"
                disabled={pending || local === "" || visitante === ""}
                className="btn-save h-9 px-5 text-xs font-bold tracking-widest uppercase disabled:opacity-40"
              >
                {pending ? (
                  <span className="animate-pulse">Guardando…</span>
                ) : (
                  "Guardar"
                )}
              </button>
            )}
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>
        )}
      </form>
    </div>
  );
}
