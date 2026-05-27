"use client";

import { useState, useTransition } from "react";
import { getFlag } from "@/lib/flags";
import { guardarBracket } from "@/app/llaves/actions";
import type { BracketPicks } from "@/app/llaves/actions";

export type { BracketPicks };

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
  { id: "grupos",    label: "Grupos",     hint: "2 por grupo" },
  { id: "terceros",  label: "Mejores 3°", hint: "8 equipos" },
  { id: "octavos",   label: "Octavos",    hint: "16 pasan" },
  { id: "cuartos",   label: "Cuartos",    hint: "8 pasan" },
  { id: "semifinal", label: "Semifinal",  hint: "4 pasan" },
  { id: "final",     label: "Final",      hint: "2 pasan" },
  { id: "campeon",   label: "Campeón",    hint: "1 gana" },
];

const PHASE_COUNT: Record<Exclude<Phase, "grupos" | "campeon">, number> = {
  terceros:  8,
  octavos:   16,
  cuartos:   8,
  semifinal: 4,
  final:     2,
};

interface Props {
  grupos: Record<string, string[]>;   // group letter → 4 teams
  initialPicks: BracketPicks;
  locked: boolean;
}

// ── Cascade ──────────────────────────────────────────────────────────────────

function cascade(p: BracketPicks): BracketPicks {
  const grupoPicks = Object.values(p.grupos ?? {}).flat();
  // terceros can only be teams not already in top-2
  const terceros  = (p.terceros  ?? []).filter(t => !grupoPicks.includes(t));
  const d32       = [...grupoPicks, ...terceros];
  const octavos   = (p.octavos   ?? []).filter(t => d32.includes(t));
  const cuartos   = (p.cuartos   ?? []).filter(t => octavos.includes(t));
  const semifinal = (p.semifinal ?? []).filter(t => cuartos.includes(t));
  const final_    = (p.final     ?? []).filter(t => semifinal.includes(t));
  const campeon   = p.campeon && final_.includes(p.campeon) ? p.campeon : undefined;
  return { ...p, terceros, octavos, cuartos, semifinal, final: final_, campeon };
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LlavesSelector({ grupos, initialPicks, locked }: Props) {
  const [picks, setPicks]   = useState<BracketPicks>(initialPicks);
  const [phase, setPhase]   = useState<Phase>("grupos");
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const gruposLetters = Object.keys(grupos).sort();

  // ── Helpers ────────────────────────────────────────────────────────────────

  function d32(p: BracketPicks) {
    return [...Object.values(p.grupos ?? {}).flat(), ...(p.terceros ?? [])];
  }

  function available(ph: Phase): string[] {
    switch (ph) {
      case "grupos":   return [];
      case "terceros": return Object.values(picks.grupos ?? {}).flat().length > 0
        ? Object.entries(grupos).flatMap(([g, teams]) =>
            teams.filter(t => !(picks.grupos?.[g] ?? []).includes(t))
          )
        : [];
      case "octavos":   return d32(picks);
      case "cuartos":   return picks.octavos   ?? [];
      case "semifinal": return picks.cuartos   ?? [];
      case "final":     return picks.semifinal ?? [];
      case "campeon":   return picks.final     ?? [];
    }
  }

  function selected(ph: Phase): string[] {
    if (ph === "campeon") return picks.campeon ? [picks.campeon] : [];
    if (ph === "grupos")  return [];
    return (picks[ph] ?? []) as string[];
  }

  function isComplete(ph: Phase): boolean {
    if (ph === "grupos")
      return gruposLetters.every(g => (picks.grupos?.[g]?.length ?? 0) === 2);
    if (ph === "campeon") return !!picks.campeon;
    return selected(ph).length === PHASE_COUNT[ph as keyof typeof PHASE_COUNT];
  }

  // ── Toggles ────────────────────────────────────────────────────────────────

  function toggleGroup(group: string, team: string) {
    if (locked) return;
    setPicks(prev => {
      const cur = prev.grupos?.[group] ?? [];
      const updated = cur.includes(team)
        ? cur.filter(t => t !== team)
        : cur.length < 2
          ? [...cur, team]
          : cur;
      return cascade({ ...prev, grupos: { ...(prev.grupos ?? {}), [group]: updated } });
    });
    setSaved(false);
  }

  function togglePhase(ph: Exclude<Phase, "grupos">, team: string) {
    if (locked) return;
    setPicks(prev => {
      if (ph === "campeon") {
        return cascade({ ...prev, campeon: prev.campeon === team ? undefined : team });
      }
      const cur = (prev[ph] ?? []) as string[];
      const limit = PHASE_COUNT[ph as keyof typeof PHASE_COUNT];
      const updated = cur.includes(team)
        ? cur.filter(t => t !== team)
        : cur.length < limit
          ? [...cur, team]
          : cur;
      return cascade({ ...prev, [ph]: updated });
    });
    setSaved(false);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await guardarBracket(picks);
      if (res?.error) setError(res.error);
      else { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const completedCount = PHASES.filter(p => isComplete(p.id)).length;

  return (
    <div className="space-y-6">

      {/* Phase stepper */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {PHASES.map((p) => {
          const done   = isComplete(p.id);
          const active = p.id === phase;
          return (
            <button
              key={p.id}
              onClick={() => setPhase(p.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                active
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

        {phase !== "grupos" && (
          <KnockoutPanel
            phase={phase}
            available={available(phase)}
            selected={selected(phase)}
            limit={phase === "campeon" ? 1 : PHASE_COUNT[phase as keyof typeof PHASE_COUNT]}
            onToggle={(t) => togglePhase(phase as Exclude<Phase, "grupos">, t)}
            locked={locked}
            isCampeon={phase === "campeon"}
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
          🔒 Las llaves están cerradas — el torneo ya ha comenzado
        </p>
      ) : (
        <div className="flex items-center justify-between gap-4 glass-card px-4 py-3">
          {error
            ? <span className="text-xs text-red-400">{error}</span>
            : <span className="text-xs text-gray-600">{completedCount}/{PHASES.length} fases completadas</span>
          }
          <button
            onClick={handleSave}
            disabled={pending}
            className={`btn-save px-5 py-2 text-sm ${saved ? "animate-saved" : ""}`}
          >
            {pending ? "Guardando…" : saved ? "✓ Guardado" : "Guardar llaves"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
        const teams    = grupos[letra] ?? [];
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
                const on  = selected.includes(team);
                const off = !on && selected.length >= 2;
                return (
                  <button
                    key={team}
                    onClick={() => onToggle(letra, team)}
                    disabled={locked || off}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                      on
                        ? "bg-[#00e87a]/15 border border-[#00e87a]/25 text-white"
                        : off
                          ? "opacity-25 cursor-not-allowed text-gray-600"
                          : "border border-white/[0.06] text-gray-400 hover:border-white/15 hover:text-gray-200"
                    }`}
                  >
                    <span className="text-sm">{getFlag(team)}</span>
                    <span className="truncate flex-1 text-left">{team}</span>
                    {on && <span className="text-[#00e87a] text-[10px]">✓</span>}
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

interface KnockoutProps {
  phase: Phase;
  available: string[];
  selected: string[];
  limit: number;
  onToggle: (team: string) => void;
  locked: boolean;
  isCampeon: boolean;
}

function KnockoutPanel({ phase, available, selected, limit, onToggle, locked, isCampeon }: KnockoutProps) {
  const PHASE_LABEL: Record<Phase, string> = {
    grupos:    "",
    terceros:  "Selecciona los 8 mejores terceros que crees que clasificarán",
    octavos:   "Selecciona los 16 equipos que pasarán a octavos de final",
    cuartos:   "Selecciona los 8 equipos que llegarán a cuartos de final",
    semifinal: "Selecciona los 4 semifinalistas",
    final:     "Selecciona los 2 finalistas",
    campeon:   "¿Quién ganará el Mundial?",
  };

  if (available.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-gray-600 text-sm">
          {phase === "terceros"
            ? "Selecciona primero los clasificados de cada grupo"
            : "Completa la fase anterior para continuar"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {PHASE_LABEL[phase]}
        {!isCampeon && (
          <span className="ml-2 text-gray-700 tabular-nums">
            ({selected.length}/{limit})
          </span>
        )}
      </p>

      <div className={`grid gap-2 ${isCampeon ? "grid-cols-1 sm:grid-cols-2 max-w-sm" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
        {available.map(team => {
          const on  = selected.includes(team);
          const off = !on && selected.length >= limit;
          return (
            <button
              key={team}
              onClick={() => onToggle(team)}
              disabled={locked || off}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isCampeon && on
                  ? "bg-yellow-400/15 border border-yellow-400/30 text-white"
                  : on
                    ? "bg-[#00e87a]/15 border border-[#00e87a]/25 text-white"
                    : off
                      ? "opacity-20 cursor-not-allowed border border-white/[0.04] text-gray-700"
                      : "border border-white/[0.07] text-gray-400 hover:border-white/20 hover:text-white bg-white/[0.02]"
              }`}
            >
              <span className="text-lg shrink-0">{getFlag(team)}</span>
              <span className="truncate text-left text-xs flex-1">{team}</span>
              {on && (
                <span className={`shrink-0 text-xs ${isCampeon ? "text-yellow-400" : "text-[#00e87a]"}`}>
                  {isCampeon ? "🏆" : "✓"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
