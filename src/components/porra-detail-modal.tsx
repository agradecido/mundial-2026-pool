"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getFlag } from "@/lib/flags";
import {
  D32_MATCHES, D16_MATCHES, QF_MATCHES, SF_MATCHES,
  resolveSlot,
} from "@/lib/bracket";
import type { UserBracketData } from "@/app/porra/actions";
import BracketTree from "@/components/bracket-tree";

interface Props {
  data: UserBracketData;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  isNavigating?: boolean;
  position?: number;
  totalUsers?: number;
}

type Tab = "bracket" | "arbol" | "grupos";

// ── helpers ──────────────────────────────────────────────────────────────────

function TeamChip({ team, size = "sm" }: { team: string | undefined; size?: "sm" | "lg" }) {
  if (!team) return (
    <span className={`flex items-center gap-1.5 rounded-lg border border-dashed border-white/10 text-gray-700
      ${size === "lg" ? "px-4 py-2 text-sm" : "px-2.5 py-1.5 text-xs"}`}>
      <span>{size === "lg" ? "❓" : "?"}</span>
      <span>Sin pick</span>
    </span>
  );
  return (
    <span className={`flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-gray-300
      ${size === "lg" ? "px-4 py-2 text-sm font-medium" : "px-2.5 py-1.5 text-xs"}`}>
      <span className={size === "lg" ? "text-2xl" : "text-sm"}>{getFlag(team)}</span>
      <span className="truncate">{team}</span>
    </span>
  );
}

function PhaseSection({ label, teams, columns = 4 }: { label: string; teams: (string | undefined)[]; columns?: number }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">{label}</p>
      <div className={`grid gap-1.5 grid-cols-2 ${columns >= 4 ? "sm:grid-cols-4" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
        }`}>
        {teams.map((t, i) => <TeamChip key={i} team={t} />)}
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function PorraDetailModal({ data, onClose, onPrev, onNext, isNavigating, position, totalUsers }: Props) {
  const [tab, setTab] = useState<Tab>("bracket");
  const { user, picks, score } = data;
  const overlayRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (dx < 0) onNext?.();
      else onPrev?.();
    }
  }

  // Derive teams per phase from picks
  const grupos = picks.grupos ?? {};
  const terceros = picks.terceros ?? [];
  const resultados = picks.resultados ?? {};
  const allGrupos = data.actual.allGrupos;

  const campeon = resultados["FINAL"];
  const finalists = SF_MATCHES.map(m => resultados[m.id]);
  const semifinalists = QF_MATCHES.map(m => resultados[m.id]);
  const quarterFinalists = D16_MATCHES.map(m => resultados[m.id]);
  const r16teams = D32_MATCHES.map(m => resultados[m.id]);

  // D32 match pairs (resolved slots)
  const d32Pairs = D32_MATCHES.map(m => ({
    id: m.id,
    zone: m.zone,
    teamA: resolveSlot(m.slotA, grupos, terceros, resultados, allGrupos),
    teamB: resolveSlot(m.slotB, grupos, terceros, resultados, allGrupos),
    winner: resultados[m.id],
  }));

  const zones = [1, 2, 3, 4];
  const gruposLetters = Object.keys(grupos).sort();

  const scoreItems = [
    { label: "16avos", pts: score.dieciseisavos },
    { label: "Octavos", pts: score.octavos },
    { label: "Cuartos", pts: score.cuartos },
    { label: "Semis", pts: score.semifinal },
    { label: "Final", pts: score.final },
    { label: "Campeón", pts: score.campeon },
  ] as const;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-2xl max-h-[85dvh] flex flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0c0c18] shadow-2xl"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00e87a]/40 to-transparent" />

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/[0.07] shrink-0">
          {user.image ? (
            <Image src={user.image} alt="" width={44} height={44} className="rounded-full shrink-0 ring-2 ring-white/10" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold text-gray-400 shrink-0">
              {user.name?.[0] ?? "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-white leading-snug">{user.name?.split(" ")[0] ?? "—"}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              {scoreItems.map(({ label, pts }) => (
                <span key={label} className="text-[10px] text-gray-600">
                  {label} <span className="text-gray-400">{pts}</span>
                </span>
              ))}
              <span className="text-[10px] font-bold text-[#00e87a]">{score.total} pts</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {(onPrev !== undefined || onNext !== undefined) && (
              <>
                <button
                  onClick={onPrev}
                  disabled={!onPrev || isNavigating}
                  className="rounded-lg p-2 text-gray-500 hover:text-white hover:bg-white/8 transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-base leading-none"
                  title="Anterior (←)"
                >‹</button>
                <span className="text-[11px] text-gray-600 tabular-nums min-w-[2.5rem] text-center select-none">
                  {position ?? ""}{totalUsers ? `/${totalUsers}` : ""}
                </span>
                <button
                  onClick={onNext}
                  disabled={!onNext || isNavigating}
                  className="rounded-lg p-2 text-gray-500 hover:text-white hover:bg-white/8 transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-base leading-none"
                  title="Siguiente (→)"
                >›</button>
              </>
            )}
            <button
              onClick={onClose}
              className="ml-1 rounded-lg p-2 text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
            >✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 shrink-0">
          {(["bracket", "arbol", "grupos"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t
                ? "bg-[#00e87a]/15 text-[#00e87a] border border-[#00e87a]/20"
                : "text-gray-600 hover:text-gray-400 border border-transparent"
                }`}
            >
              {t === "bracket" ? "Listado" : t === "arbol" ? "Árbol" : "Grupos & Terceros"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={`overflow-y-auto flex-1 px-5 py-4 space-y-5 transition-opacity duration-150 ${isNavigating ? "opacity-40 pointer-events-none" : ""}`}>

          {tab === "bracket" && (
            <>
              {/* Champion */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Campeón</p>
                <div className="flex justify-center">
                  <TeamChip team={campeon} size="lg" />
                </div>
              </div>

              {/* Finalists */}
              <PhaseSection label="Finalistas" teams={finalists} columns={2} />

              {/* Semifinalists */}
              <PhaseSection label="Semifinalistas" teams={semifinalists} columns={4} />

              {/* Quarter-finalists */}
              <PhaseSection label="Cuartos de final" teams={quarterFinalists} columns={4} />

              {/* Round of 16 */}
              <PhaseSection label="Octavos de final" teams={r16teams} columns={4} />

              {/* Dieciseisavos — match pairs by zone */}
              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                  16avos de final
                </p>
                {zones.map(zone => {
                  const pairs = d32Pairs.filter(p => p.zone === zone);
                  return (
                    <div key={zone}>
                      <p className="text-[9px] text-gray-700 uppercase tracking-widest mb-1.5">Zona {zone}</p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {pairs.map(pair => (
                          <div key={pair.id} className="flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.06] rounded-lg px-2.5 py-1.5">
                            <span className={`flex-1 flex items-center gap-1.5 text-xs min-w-0 ${pair.winner === pair.teamA ? "text-white" : "text-gray-600"}`}>
                              <span>{getFlag(pair.teamA ?? "")}</span>
                              <span className="truncate">{pair.teamA ?? "?"}</span>
                            </span>
                            <span className="text-[9px] text-gray-700 shrink-0 font-bold">vs</span>
                            <span className={`flex-1 flex items-center justify-end gap-1.5 text-xs min-w-0 ${pair.winner === pair.teamB ? "text-white" : "text-gray-600"}`}>
                              <span className="truncate">{pair.teamB ?? "?"}</span>
                              <span>{getFlag(pair.teamB ?? "")}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === "arbol" && (
            <BracketTree picks={picks} allGrupos={allGrupos} />
          )}

          {tab === "grupos" && (
            <>
              {/* Groups */}
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                {gruposLetters.map(letra => {
                  const sel = grupos[letra] ?? [];
                  return (
                    <div key={letra} className="glass-card p-2.5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="flex h-4 w-4 items-center justify-center rounded bg-[#00e87a]/10 text-[9px] font-bold text-[#00e87a]">
                          {letra}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-500">Grupo {letra}</span>
                      </div>
                      <div className="space-y-1">
                        {[0, 1].map(idx => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs">
                            <span className="text-[9px] text-gray-700 w-4 shrink-0">{idx + 1}°</span>
                            {sel[idx] ? (
                              <>
                                <span>{getFlag(sel[idx])}</span>
                                <span className="text-gray-300 truncate">{sel[idx]}</span>
                              </>
                            ) : (
                              <span className="text-gray-700 italic">sin pick</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Terceros */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                  Mejores terceros ({terceros.length}/8)
                </p>
                {terceros.length === 0 ? (
                  <p className="text-xs text-gray-700 italic">Sin picks de terceros</p>
                ) : (
                  <div className="grid gap-1.5 grid-cols-2 sm:grid-cols-4">
                    {terceros.map(team => <TeamChip key={team} team={team} />)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
