"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getFlag } from "@/lib/flags";
import {
  D32_MATCHES, D16_MATCHES, QF_MATCHES, SF_MATCHES, FINAL_MATCH,
  resolveSlot,
} from "@/lib/bracket";
import type { UserBracketData } from "@/app/porra/actions";

interface Props {
  data:    UserBracketData;
  onClose: () => void;
}

type Tab = "bracket" | "grupos";

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
      <div className={`grid gap-1.5 grid-cols-2 ${
        columns >= 4 ? "sm:grid-cols-4" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
      }`}>
        {teams.map((t, i) => <TeamChip key={i} team={t} />)}
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function PorraDetailModal({ data, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("bracket");
  const { user, picks, score } = data;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Derive teams per phase from picks
  const grupos    = picks.grupos    ?? {};
  const terceros  = picks.terceros  ?? [];
  const resultados = picks.resultados ?? {};

  const campeon      = resultados["FINAL"];
  const finalists    = SF_MATCHES.map(m => resultados[m.id]);
  const semifinalists = QF_MATCHES.map(m => resultados[m.id]);
  const quarterFinalists = D16_MATCHES.map(m => resultados[m.id]);
  const r16teams     = D32_MATCHES.map(m => resultados[m.id]);

  // D32 match pairs (resolved slots)
  const d32Pairs = D32_MATCHES.map(m => ({
    id:     m.id,
    zone:   m.zone,
    teamA:  resolveSlot(m.slotA, grupos, terceros, resultados),
    teamB:  resolveSlot(m.slotB, grupos, terceros, resultados),
    winner: resultados[m.id],
  }));

  const zones = [1, 2, 3, 4];
  const gruposLetters = Object.keys(grupos).sort();

  const scoreItems = [
    { label: "16avos",   pts: score.dieciseisavos },
    { label: "Octavos",  pts: score.octavos },
    { label: "Cuartos",  pts: score.cuartos },
    { label: "Semis",    pts: score.semifinal },
    { label: "Final",    pts: score.final },
    { label: "Campeón",  pts: score.campeon },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="glass-card w-full sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/[0.07] shrink-0">
          {user.image ? (
            <Image src={user.image} alt="" width={44} height={44} className="rounded-full shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold text-gray-400 shrink-0">
              {user.name?.[0] ?? "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-white truncate">{user.name}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              {scoreItems.map(({ label, pts }) => (
                <span key={label} className="text-[10px] text-gray-600">
                  {label} <span className="text-gray-400">{pts}</span>
                </span>
              ))}
              <span className="text-[10px] font-bold text-[#00e87a]">{score.total} pts</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-gray-600 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 shrink-0">
          {(["bracket", "grupos"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === t
                  ? "bg-[#00e87a]/15 text-[#00e87a] border border-[#00e87a]/20"
                  : "text-gray-600 hover:text-gray-400 border border-transparent"
              }`}
            >
              {t === "bracket" ? "Eliminatorias" : "Grupos & Terceros"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

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
