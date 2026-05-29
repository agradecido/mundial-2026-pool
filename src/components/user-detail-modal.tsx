"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { getFlag } from "@/lib/flags";
import type { UserDetail } from "@/app/ranking/actions";
import type { Fase } from "@prisma/client";

const FASE_LABEL: Record<Fase, string> = {
  GRUPOS:        "Fase de Grupos",
  DIECISEISAVOS: "Dieciseisavos",
  OCTAVOS:       "Octavos de Final",
  CUARTOS:       "Cuartos de Final",
  SEMIFINAL:     "Semifinales",
  TERCER_PUESTO: "Tercer Puesto",
  FINAL:         "Final",
};

function ptsBadge(pts: number) {
  if (pts === 5 || pts === 10)
    return { label: `+${pts}`, cls: "bg-yellow-400/15 text-yellow-400 border-yellow-400/20" };
  if (pts === 3 || pts === 6)
    return { label: `+${pts}`, cls: "bg-[#00e87a]/15 text-[#00e87a] border-[#00e87a]/20" };
  if (pts === 1 || pts === 2)
    return { label: `+${pts}`, cls: "bg-white/8 text-gray-400 border-white/10" };
  return { label: "0", cls: "bg-red-900/20 text-red-400/60 border-red-400/10" };
}

interface Props {
  detail: UserDetail;
  position: number;
  onClose: () => void;
}

export default function UserDetailModal({ detail, position, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Stats
  const exactos     = detail.pronosticos.filter((p) => p.puntosGanados === 5 || p.puntosGanados === 10).length;
  const tendencias  = detail.pronosticos.filter((p) => p.puntosGanados === 3 || p.puntosGanados === 6).length;
  const consolacion = detail.pronosticos.filter((p) => p.puntosGanados === 1 || p.puntosGanados === 2).length;
  const fallos      = detail.pronosticos.filter((p) => p.puntosGanados === 0).length;
  const ptsPartidos = detail.pronosticos.reduce((s, p) => s + p.puntosGanados, 0);
  const pf = detail.prediccionFutura;
  const ptsEspeciales = pf ? pf.puntosCampeon + pf.puntosSubcampeon : 0;

  // Group by fase
  const byFase = detail.pronosticos.reduce<Record<string, typeof detail.pronosticos>>((acc, p) => {
    (acc[p.partido.fase] ??= []).push(p);
    return acc;
  }, {});
  const faseOrder: Fase[] = [
    "GRUPOS", "DIECISEISAVOS", "OCTAVOS", "CUARTOS", "SEMIFINAL", "TERCER_PUESTO", "FINAL",
  ];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-white/[0.09] bg-[#0c0c18] shadow-2xl overflow-hidden">
        {/* Top glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00e87a]/40 to-transparent" />

        {/* ── Header ── */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-white/[0.06] shrink-0">
          {detail.image ? (
            <Image src={detail.image} alt="" width={48} height={48} className="rounded-full ring-2 ring-white/10" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/8 flex items-center justify-center text-lg font-bold text-gray-400">
              {detail.name?.[0] ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-base truncate">{detail.name ?? "—"}</p>
            <p className="text-xs text-gray-500">Posición #{position}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-white tabular-nums">{ptsPartidos + ptsEspeciales}</p>
            <p className="text-xs text-gray-600">puntos totales</p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 shrink-0 rounded-lg p-2 text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-4 gap-px bg-white/[0.05] border-b border-white/[0.06] shrink-0">
          {[
            { label: "Exactos",   value: exactos,     pts: ptsPartidos - tendencias * 3 - consolacion, icon: "⭐", cls: "text-yellow-400" },
            { label: "Tendencia", value: tendencias,  icon: "✓",  cls: "text-[#00e87a]" },
            { label: "Consolac.", value: consolacion, icon: "·",  cls: "text-gray-400" },
            { label: "Fallos",    value: fallos,      icon: "✗",  cls: "text-red-400/70" },
          ].map(({ label, value, icon, cls }) => (
            <div key={label} className="bg-[#0c0c18] px-3 py-3 text-center">
              <p className={`text-xl font-bold tabular-nums ${cls}`}>{value}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{icon} {label}</p>
            </div>
          ))}
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1">

          {/* Predicciones especiales */}
          {pf && (
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  Predicciones especiales
                </p>
                <span className="text-xs font-semibold text-[#00e87a]">+{ptsEspeciales} pts</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Campeón",    valor: pf.campeonPronostico,    pts: pf.puntosCampeon,    max: 20 },
                  { label: "Subcampeón", valor: pf.subcampeonPronostico, pts: pf.puntosSubcampeon, max: 15 },
                ].map(({ label, valor, pts, max }) => (
                  <div key={label} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-600 w-24 shrink-0">{label}</span>
                    <span className="text-gray-300 flex-1 truncate">{valor ?? "—"}</span>
                    <span className={`text-xs font-semibold tabular-nums shrink-0 ${pts > 0 ? "text-[#00e87a]" : "text-gray-600"}`}>
                      {pts > 0 ? `+${pts}` : `0 / ${max}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Partidos por fase */}
          {faseOrder.filter((f) => byFase[f]?.length).map((fase) => (
            <div key={fase}>
              <div className="sticky top-0 bg-[#0c0c18]/95 backdrop-blur-sm px-5 py-2.5 border-b border-white/[0.04]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                  {FASE_LABEL[fase]}
                  {fase === "GRUPOS" && (
                    <span className="ml-2 normal-case text-gray-700">
                      +{byFase[fase].reduce((s, p) => s + p.puntosGanados, 0)} pts
                    </span>
                  )}
                </p>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {byFase[fase].map((p, i) => {
                  const badge = ptsBadge(p.puntosGanados);
                  const hasReal = p.partido.golesLocalReal !== null;
                  return (
                    <div key={i} className="flex items-center gap-2 px-5 py-2.5 hover:bg-white/[0.02] transition-colors">
                      {/* Local */}
                      <span className="text-base shrink-0">{getFlag(p.partido.equipoLocal)}</span>
                      <span className="text-xs text-gray-400 w-20 truncate hidden sm:block">
                        {p.partido.equipoLocal}
                      </span>

                      {/* Pronóstico */}
                      <div className="flex items-center gap-1 ml-auto shrink-0">
                        <span className="font-mono text-sm font-semibold text-gray-200 tabular-nums">
                          {p.golesLocal}–{p.golesVisitante}
                        </span>
                        {hasReal && (
                          <>
                            <span className="text-gray-700 text-xs mx-0.5">vs</span>
                            <span className="font-mono text-sm text-gray-500 tabular-nums">
                              {p.partido.golesLocalReal}–{p.partido.golesVisitanteReal}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Visitante */}
                      <span className="text-xs text-gray-400 w-20 truncate text-right hidden sm:block">
                        {p.partido.equipoVisitante}
                      </span>
                      <span className="text-base shrink-0">{getFlag(p.partido.equipoVisitante)}</span>

                      {/* Badge */}
                      <span className={`ml-2 shrink-0 w-10 text-center text-[11px] font-semibold rounded-md border px-1.5 py-0.5 tabular-nums ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
