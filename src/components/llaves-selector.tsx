"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { getFlag } from "@/lib/flags";
import { guardarBracket } from "@/app/llaves/actions";
import {
  PHASE_MATCHES,
  resolveSlot, getDescendants, cascadeAll,
} from "@/lib/bracket";
import type { BracketPicks, Match } from "@/lib/bracket";

// ── Types ────────────────────────────────────────────────────────────────────

type Phase =
  | "grupos"
  | "terceros"
  | "octavos"
  | "cuartos"
  | "semifinal"
  | "final"
  | "campeon";

const PHASES: Array<{ id: Phase; label: string; hint: string }> = [
  { id: "grupos", label: "Grupos", hint: "2 por grupo" },
  { id: "terceros", label: "Mejores 3°", hint: "8 equipos" },
  { id: "octavos", label: "Octavos", hint: "16 pasan" },
  { id: "cuartos", label: "Cuartos", hint: "8 pasan" },
  { id: "semifinal", label: "Semifinal", hint: "4 pasan" },
  { id: "final", label: "Final", hint: "2 pasan" },
  { id: "campeon", label: "Campeón", hint: "1 gana" },
];

const PHASE_LABEL: Record<Phase, string> = {
  grupos: "",
  terceros: "Selecciona los 8 mejores terceros que crees que clasificarán",
  octavos: "Elige el ganador de cada cruce de dieciseisavos",
  cuartos: "Elige quién pasa a cuartos de final",
  semifinal: "Elige los cuatro semifinalistas",
  final: "Elige los dos finalistas",
  campeon: "¿Quién ganará el Mundial?",
};

interface Props {
  grupos: Record<string, string[]>;
  initialPicks: BracketPicks;
  locked: boolean;
}

// ── Slot description helper ───────────────────────────────────────────────────

function slotDesc(slot: string): string {
  if (slot.startsWith("W:")) {
    const id = slot.slice(2);
    const [round, num] = id.split("-");
    const names: Record<string, string> = {
      D32: "16avos", D16: "Oct.", QF: "Ctos.", SF: "Semi",
    };
    return `Gan. ${names[round] ?? round}-${num}`;
  }
  if (/^1[A-L]$/.test(slot)) return `1° Gr.${slot[1]}`;
  if (/^2[A-L]$/.test(slot)) return `2° Gr.${slot[1]}`;
  if (slot.startsWith("3-")) return `3°Mej.${slot.slice(2)}`;
  return slot;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LlavesSelector({ grupos, initialPicks, locked }: Props) {
  const [picks, setPicks] = useState<BracketPicks>(initialPicks);
  const [phase, setPhase] = useState<Phase>("grupos");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showClearModal, setShowClearModal] = useState(false);
  const stepperRef = useRef<HTMLDivElement>(null);

  const gruposLetters = Object.keys(grupos).sort();

  useEffect(() => {
    const container = stepperRef.current;
    if (!container) return;
    const active = container.querySelector(`[data-phase="${phase}"]`) as HTMLElement | null;
    if (!active) return;
    const left = active.offsetLeft + active.offsetWidth / 2 - container.offsetWidth / 2;
    container.scrollTo({ left, behavior: "smooth" });
  }, [phase]);

  // ── isComplete / haspicks ──────────────────────────────────────────────────

  function isComplete(ph: Phase): boolean {
    if (ph === "grupos") return gruposLetters.every(g => (picks.grupos?.[g]?.length ?? 0) === 2);
    if (ph === "terceros") return (picks.terceros?.length ?? 0) === 8;
    const matches = PHASE_MATCHES[ph] ?? [];
    return matches.every(m => picks.resultados?.[m.id] !== undefined);
  }

  function hasPicksInPhase(ph: Phase): boolean {
    if (ph === "grupos") return Object.values(picks.grupos ?? {}).some(g => g.length > 0);
    if (ph === "terceros") return (picks.terceros?.length ?? 0) > 0;
    const matches = PHASE_MATCHES[ph] ?? [];
    return matches.some(m => picks.resultados?.[m.id] !== undefined);
  }

  // ── Toggles ────────────────────────────────────────────────────────────────

  function toggleGroup(group: string, team: string) {
    if (locked) return;
    setPicks(prev => {
      const cur = prev.grupos?.[group] ?? [];
      const updated = cur.includes(team)
        ? cur.filter(t => t !== team)
        : cur.length < 2 ? [...cur, team] : cur;
      return cascadeAll({ ...prev, grupos: { ...(prev.grupos ?? {}), [group]: updated } });
    });
    setSaved(false);
  }

  function toggleTercero(team: string) {
    if (locked) return;
    setPicks(prev => {
      const cur = prev.terceros ?? [];
      const updated = cur.includes(team)
        ? cur.filter(t => t !== team)
        : cur.length < 8 ? [...cur, team] : cur;
      return cascadeAll({ ...prev, terceros: updated });
    });
    setSaved(false);
  }

  function pickResult(matchId: string, team: string) {
    if (locked) return;
    setPicks(prev => {
      const newRes = { ...(prev.resultados ?? {}) };
      if (newRes[matchId] === team) {
        // toggle off
        delete newRes[matchId];
      } else {
        newRes[matchId] = team;
      }
      // always clear descendants when a result changes
      for (const desc of getDescendants(matchId)) delete newRes[desc];
      return { ...prev, resultados: newRes };
    });
    setSaved(false);
  }

  // ── Clear / Save ──────────────────────────────────────────────────────────

  function clearPhase(ph: Phase) {
    setPicks(prev => {
      if (ph === "grupos")   return cascadeAll({ ...prev, grupos: {} });
      if (ph === "terceros") return cascadeAll({ ...prev, terceros: [] });
      const matches = PHASE_MATCHES[ph] ?? [];
      const newRes  = { ...(prev.resultados ?? {}) };
      for (const m of matches) {
        delete newRes[m.id];
        for (const desc of getDescendants(m.id)) delete newRes[desc];
      }
      return { ...prev, resultados: newRes };
    });
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await guardarBracket(picks);
      if (res?.error) setError(res.error);
      else { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    });
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const completedCount = PHASES.filter(p => isComplete(p.id)).length;

  // Terceros: teams that finished 3rd in their group (not in top-2 of any group)
  const tercerosAvailable = Object.entries(grupos).flatMap(([g, teams]) =>
    teams.filter(t => !(picks.grupos?.[g] ?? []).includes(t))
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Phase stepper */}
      <div ref={stepperRef} className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {PHASES.map((p) => {
          const done = isComplete(p.id);
          const active = p.id === phase;
          return (
            <button
              key={p.id}
              data-phase={p.id}
              onClick={() => setPhase(p.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${active
                ? "bg-[#00e87a]/15 text-[#00e87a] border border-[#00e87a]/20"
                : done
                  ? "bg-white/5 text-gray-300 border border-white/8"
                  : "text-gray-600 hover:text-gray-400 border border-transparent"
                }`}
            >
              {done && !active && <span className="text-[#00e87a] text-[10px]">✓</span>}
              {p.label}
              {!done && !active && (
                <span className="text-[10px] text-gray-700">{p.hint}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="min-h-80">
        {phase === "grupos" && (
          <GruposPanel
            grupos={grupos}
            gruposLetters={gruposLetters}
            picks={picks.grupos ?? {}}
            onToggle={toggleGroup}
            locked={locked}
          />
        )}

        {phase === "terceros" && (
          <TercerosPanel
            available={tercerosAvailable}
            selected={picks.terceros ?? []}
            onToggle={toggleTercero}
            locked={locked}
          />
        )}

        {phase !== "grupos" && phase !== "terceros" && (
          <BracketPanel
            phase={phase}
            matches={PHASE_MATCHES[phase] ?? []}
            grupos={picks.grupos ?? {}}
            terceros={picks.terceros ?? []}
            resultados={picks.resultados ?? {}}
            onPick={pickResult}
            locked={locked}
          />
        )}
      </div>

      {/* Phase nav */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setPhase(p => {
            const i = PHASES.findIndex(x => x.id === p);
            return i > 0 ? PHASES[i - 1].id : p;
          })}
          disabled={phase === "grupos"}
          className="text-sm text-gray-600 hover:text-gray-300 disabled:opacity-0 transition-colors"
        >
          ← Anterior
        </button>
        <span className="text-xs text-gray-700">{completedCount}/{PHASES.length} completadas</span>
        <button
          onClick={() => setPhase(p => {
            const i = PHASES.findIndex(x => x.id === p);
            return i < PHASES.length - 1 ? PHASES[i + 1].id : p;
          })}
          disabled={phase === "campeon"}
          className="text-sm text-gray-600 hover:text-gray-300 disabled:opacity-0 transition-colors"
        >
          Siguiente →
        </button>
      </div>

      {/* Save bar */}
      {locked ? (
        <p className="text-center text-xs text-gray-600 py-2">
          🔒 La porra está cerrada — el torneo ya ha comenzado
        </p>
      ) : (
        <div className="flex items-center justify-between gap-4 glass-card px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {error
              ? <span className="text-xs text-red-400">{error}</span>
              : <span className="text-xs text-gray-600">{completedCount}/{PHASES.length} fases completadas</span>
            }
            {!locked && hasPicksInPhase(phase) && (
              <button
                onClick={() => setShowClearModal(true)}
                className="text-xs text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 bg-white/[0.03] hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                Limpiar fase
              </button>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={pending}
            className={`btn-save px-5 py-2 text-sm shrink-0 ${saved ? "animate-saved" : ""}`}
          >
            {pending ? "Guardando…" : saved ? "✓ Guardado" : "Guardar porra"}
          </button>
        </div>
      )}

      {/* Clear confirmation modal */}
      {showClearModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowClearModal(false)}
        >
          <div
            className="glass-card p-6 max-w-sm w-full mx-4 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-white">¿Limpiar esta fase?</h3>
            <p className="text-sm text-gray-400">
              Se borrarán todas las selecciones de la fase actual y las siguientes.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-white/10 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { clearPhase(phase); setShowClearModal(false); }}
                className="px-4 py-2 text-sm text-white bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 rounded-lg transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GruposPanel ───────────────────────────────────────────────────────────────

interface GruposProps {
  grupos: Record<string, string[]>;
  gruposLetters: string[];
  picks: Record<string, string[]>;
  onToggle: (group: string, team: string) => void;
  locked: boolean;
}

function GruposPanel({ grupos, gruposLetters, picks, onToggle, locked }: GruposProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {gruposLetters.map(letra => {
        const teams = grupos[letra] ?? [];
        const selected = picks[letra] ?? [];
        return (
          <div key={letra} className="glass-card p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#00e87a]/10 text-[10px] font-bold text-[#00e87a]">
                {letra}
              </span>
              <span className="text-xs font-semibold text-gray-400">Grupo {letra}</span>
              <span className="ml-auto text-[10px] text-gray-700 tabular-nums">
                {selected.length}/2
              </span>
            </div>
            <div className="space-y-1">
              {teams.map(team => {
                const idx = selected.indexOf(team);
                const on = idx !== -1;
                const off = !on && selected.length >= 2;
                const orderLabel = idx === 0 ? "1°" : idx === 1 ? "2°" : null;
                return (
                  <button
                    key={team}
                    onClick={() => onToggle(letra, team)}
                    disabled={locked || off}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${on
                      ? "bg-[#00e87a]/15 border border-[#00e87a]/25 text-white"
                      : off
                        ? "opacity-25 cursor-not-allowed text-gray-600"
                        : "border border-white/[0.06] text-gray-400 hover:border-white/15 hover:text-gray-200"
                      }`}
                  >
                    <span className="text-sm">{getFlag(team)}</span>
                    <span className="truncate flex-1 text-left">{team}</span>
                    {orderLabel && (
                      <span className="text-[10px] text-[#00e87a] font-bold tabular-nums shrink-0">
                        {orderLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── TercerosPanel ─────────────────────────────────────────────────────────────

interface TercerosProps {
  available: string[];
  selected: string[];
  onToggle: (team: string) => void;
  locked: boolean;
}

function TercerosPanel({ available, selected, onToggle, locked }: TercerosProps) {
  if (available.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-gray-600 text-sm">Selecciona primero los clasificados de cada grupo</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Selecciona los 8 mejores terceros que crees que clasificarán
        <span className="ml-2 text-gray-700 tabular-nums">({selected.length}/8)</span>
      </p>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {available.map(team => {
          const on = selected.includes(team);
          const off = !on && selected.length >= 8;
          return (
            <button
              key={team}
              onClick={() => onToggle(team)}
              disabled={locked || off}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${on
                ? "bg-[#00e87a]/15 border border-[#00e87a]/25 text-white"
                : off
                  ? "opacity-20 cursor-not-allowed border border-white/[0.04] text-gray-700"
                  : "border border-white/[0.07] text-gray-400 hover:border-white/20 hover:text-white bg-white/[0.02]"
                }`}
            >
              <span className="text-lg shrink-0">{getFlag(team)}</span>
              <span className="truncate text-left text-xs flex-1">{team}</span>
              {on && <span className="shrink-0 text-xs text-[#00e87a]">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── BracketPanel ──────────────────────────────────────────────────────────────

interface BracketPanelProps {
  phase: Phase;
  matches: Match[];
  grupos: Record<string, string[]>;
  terceros: string[];
  resultados: Record<string, string>;
  onPick: (matchId: string, team: string) => void;
  locked: boolean;
}

function BracketPanel({
  phase, matches, grupos, terceros, resultados, onPick, locked,
}: BracketPanelProps) {
  const isCampeon = phase === "campeon";
  const zones = [...new Set(matches.map(m => m.zone))].sort();

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">{PHASE_LABEL[phase]}</p>

      {zones.map(zone => {
        const zoneMatches = matches.filter(m => m.zone === zone);
        return (
          <div key={zone}>
            {zones.length > 1 && (
              <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest mb-2">
                Zona {zone}
              </p>
            )}
            <div className={`grid gap-2 ${isCampeon
              ? "max-w-md"
              : zoneMatches.length === 1
                ? "sm:grid-cols-1 max-w-md"
                : "sm:grid-cols-2"
              }`}>
              {zoneMatches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  grupos={grupos}
                  terceros={terceros}
                  resultados={resultados}
                  onPick={onPick}
                  locked={locked}
                  isCampeon={isCampeon}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── MatchCard ─────────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: Match;
  grupos: Record<string, string[]>;
  terceros: string[];
  resultados: Record<string, string>;
  onPick: (matchId: string, team: string) => void;
  locked: boolean;
  isCampeon: boolean;
}

function MatchCard({
  match, grupos, terceros, resultados, onPick, locked, isCampeon,
}: MatchCardProps) {
  const teamA = resolveSlot(match.slotA, grupos, terceros, resultados);
  const teamB = resolveSlot(match.slotB, grupos, terceros, resultados);
  const winner = resultados[match.id];
  const canPick = !locked && teamA !== undefined && teamB !== undefined;

  function teamBtn(team: string | undefined, slot: string) {
    const isWinner = winner !== undefined && winner === team;
    const isLoser = winner !== undefined && winner !== team;
    const isUnknown = team === undefined;

    return (
      <button
        onClick={() => team && canPick && onPick(match.id, team)}
        disabled={!canPick || isUnknown}
        className={`flex-1 flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all min-w-0 ${isWinner && isCampeon
          ? "bg-yellow-400/20 border border-yellow-400/40 text-white"
          : isWinner
            ? "bg-[#00e87a]/20 border border-[#00e87a]/30 text-white"
            : isLoser
              ? "opacity-25 border border-transparent text-gray-700"
              : isUnknown
                ? "border border-dashed border-white/10 text-gray-700 cursor-default"
                : "border border-white/[0.07] text-gray-400 hover:border-white/20 hover:text-white"
          }`}
      >
        <span className="text-sm shrink-0">{team ? getFlag(team) : "?"}</span>
        <span className="truncate text-left flex-1">
          {team ?? slotDesc(slot)}
        </span>
        {isWinner && (
          <span className="shrink-0 text-xs">{isCampeon ? "🏆" : "✓"}</span>
        )}
      </button>
    );
  }

  return (
    <div className={`glass-card p-2.5 flex items-center gap-2 ${!canPick && winner === undefined ? "opacity-50" : ""
      }`}>
      {teamBtn(teamA, match.slotA)}
      <span className="text-[10px] font-bold text-gray-700 shrink-0">vs</span>
      {teamBtn(teamB, match.slotB)}
    </div>
  );
}
