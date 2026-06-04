"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { getFlag } from "@/lib/flags";
import { guardarBracket } from "@/app/porra/actions";
import {
  ALL_MATCHES,
  getDescendants, cascadeAll,
} from "@/lib/bracket";
import type { BracketPicks } from "@/lib/bracket";
import BracketTree from "@/components/bracket-tree";

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = "grupos" | "terceros" | "arbol";

const PHASES: Array<{ id: Phase; label: string; hint: string }> = [
  { id: "grupos", label: "Grupos", hint: "2 por grupo" },
  { id: "terceros", label: "Mejores 3°", hint: "8 equipos" },
  { id: "arbol", label: "Eliminatorias", hint: "" },
];

const PHASE_LABEL: Record<Phase, string> = {
  grupos: "Selecciona los dos primeros clasificados de cada grupo",
  terceros: "Selecciona los 8 mejores terceros que crees que clasificarán",
  arbol: "Haz click en un equipo para marcarlo como ganador. Click de nuevo para deshacer. Y cuando termines no te olvides de guardar tu porra :)",
};

interface Props {
  grupos: Record<string, string[]>;
  initialPicks: BracketPicks;
  locked: boolean;
  oddsMap?: Record<string, { first: number; draw: number; second: number }>;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LlavesSelector({ grupos, initialPicks, locked, oddsMap }: Props) {
  const gruposLetters = Object.keys(grupos).sort();

  const porraComplete =
    gruposLetters.every(g => (initialPicks.grupos?.[g]?.length ?? 0) === 2) &&
    (initialPicks.terceros?.length ?? 0) === 8 &&
    ALL_MATCHES.every(m => initialPicks.resultados?.[m.id] !== undefined);

  const [picks, setPicks] = useState<BracketPicks>(initialPicks);
  const [phase, setPhase] = useState<Phase>(porraComplete ? "arbol" : "grupos");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showClearModal, setShowClearModal] = useState(false);
  const stepperRef = useRef<HTMLDivElement>(null);

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
    // arbol: complete = all 31 knockout matches have a result
    return ALL_MATCHES.every(m => picks.resultados?.[m.id] !== undefined);
  }

  function hasPicksInPhase(ph: Phase): boolean {
    if (ph === "grupos") return Object.values(picks.grupos ?? {}).some(g => g.length > 0);
    if (ph === "terceros") return (picks.terceros?.length ?? 0) > 0;
    return Object.keys(picks.resultados ?? {}).length > 0;
  }

  // ── Auto-save ───────────────────────────────────────────────────────────────
  // Picks are persisted automatically (debounced) on every change, and flushed
  // immediately when the user leaves the page, so selections — especially the
  // best-thirds — can never be lost by navigating away without pressing "Guardar".

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPicks = useRef<BracketPicks | null>(null);

  const flushSave = useCallback(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    const toSave = pendingPicks.current;
    if (toSave == null) return;
    pendingPicks.current = null;
    startTransition(async () => {
      const res = await guardarBracket(toSave);
      if (res?.error) {
        // Keep the pending picks so a later flush retries the failed save.
        pendingPicks.current = toSave;
        setError(res.error);
      } else {
        setError(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }, []);

  const scheduleSave = useCallback((next: BracketPicks) => {
    if (locked) return;
    pendingPicks.current = next;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(flushSave, 700);
  }, [locked, flushSave]);

  // Flush any pending save when the tab is hidden or the component unmounts
  // (e.g. client-side navigation to another tab).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushSave);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushSave);
      flushSave();
    };
  }, [flushSave]);

  function applyPicks(next: BracketPicks) {
    setPicks(next);
    setSaved(false);
    scheduleSave(next);
  }

  // ── Toggles ────────────────────────────────────────────────────────────────

  function toggleGroup(group: string, team: string) {
    if (locked) return;
    const cur = picks.grupos?.[group] ?? [];
    const updated = cur.includes(team)
      ? cur.filter(t => t !== team)
      : cur.length < 2 ? [...cur, team] : cur;
    applyPicks(cascadeAll({ ...picks, grupos: { ...(picks.grupos ?? {}), [group]: updated } }, grupos));
  }

  function toggleTercero(team: string) {
    if (locked) return;
    const cur = picks.terceros ?? [];
    const updated = cur.includes(team)
      ? cur.filter(t => t !== team)           // deselect: remove and shift ranks down
      : cur.length < 8 ? [...cur, team] : cur; // select: append at next rank
    applyPicks(cascadeAll({ ...picks, terceros: updated }, grupos));
  }

  function pickResult(matchId: string, team: string) {
    if (locked) return;
    const newRes = { ...(picks.resultados ?? {}) };
    if (newRes[matchId] === team) {
      // toggle off
      delete newRes[matchId];
    } else {
      newRes[matchId] = team;
    }
    // always clear descendants when a result changes
    for (const desc of getDescendants(matchId)) delete newRes[desc];
    applyPicks({ ...picks, resultados: newRes });
  }

  // ── Clear / Save ──────────────────────────────────────────────────────────

  function clearPhase(ph: Phase) {
    let next: BracketPicks;
    if (ph === "grupos") next = cascadeAll({ ...picks, grupos: {} }, grupos);
    else if (ph === "terceros") next = cascadeAll({ ...picks, terceros: [] }, grupos);
    // arbol: wipe all knockout results
    else next = { ...picks, resultados: {} };
    applyPicks(next);
  }

  function handleSave() {
    setError(null);
    pendingPicks.current = picks;
    flushSave();
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  function isUnlocked(ph: Phase): boolean {
    if (ph === "grupos") return true;
    if (ph === "terceros") return isComplete("grupos");
    return isComplete("grupos") && isComplete("terceros");
  }

  const completedCount = PHASES.filter(p => isComplete(p.id)).length;

  // Terceros: teams that finished 3rd in their group (not in top-2 of any group)
  // ONLY from groups where the user has already selected exactly 2 qualified teams.
  // At most ONE tercero per group: if one is already selected, only show it (for deselection).
  const tercerosAvailable = Object.entries(grupos).flatMap(([g, teams]) => {
    const qualified = picks.grupos?.[g] ?? [];
    // Only allow third-place picks from groups that have exactly 2 qualified
    if (qualified.length !== 2) return [];
    const notQualified = teams.filter(t => !qualified.includes(t));
    // If a team from this group is already selected as tercero, show only that one
    // so the user can deselect it but cannot add a second tercero from the same group.
    const selectedFromGroup = notQualified.find(t => (picks.terceros ?? []).includes(t));
    if (selectedFromGroup) return [selectedFromGroup];
    return notQualified;
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  const allComplete = isComplete("grupos") && isComplete("terceros") && isComplete("arbol");

  const pendingPhases = [
    !isComplete("grupos") && "Grupos",
    !isComplete("terceros") && "Mejores 3°",
    !isComplete("arbol") && "Eliminatorias",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">

      {/* Estado de la porra */}
      {!locked && (
        allComplete ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#00e87a]/20 bg-[#00e87a]/5 px-4 py-2.5">
            <span className="text-[#00e87a] text-sm">✓</span>
            <span className="text-sm font-medium text-[#00e87a]">Tu porra está completada</span>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-2.5">
            <span className="text-amber-400 text-sm mt-px">⚠</span>
            <div>
              <span className="text-sm font-medium text-amber-300">Tu porra está incompleta</span>
              <span className="text-xs text-amber-400/70 ml-2">
                Falta: {pendingPhases.join(" · ")}
              </span>
            </div>
          </div>
        )
      )}

      {/* Phase stepper */}
      <div ref={stepperRef} className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {PHASES.map((p) => {
          const done = isComplete(p.id);
          const active = p.id === phase;
          const unlocked = isUnlocked(p.id);
          return (
            <button
              key={p.id}
              data-phase={p.id}
              onClick={() => unlocked && setPhase(p.id)}
              disabled={!unlocked}
              title={!unlocked ? "Completa la fase anterior primero" : undefined}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-lg font-semibold transition-all ${active
                ? "bg-[#00e87a]/15 text-[#00e87a] border border-[#00e87a]/20"
                : !unlocked
                  ? "opacity-35 cursor-not-allowed text-gray-600 border border-transparent"
                  : done
                    ? "bg-white/5 text-gray-300 border border-white/8"
                    : "text-gray-400 hover:text-gray-400 border border-transparent"
                }`}
            >
              {done && !active && <span className="text-[#00e87a] text-[10px]">✓</span>}
              {!unlocked && <span className="text-[10px]">🔒</span>}
              {p.label}
              {!done && !active && unlocked && (
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

        {/* Always mounted so bracket-capture-inner is always in the DOM for sharing */}
        <div className={phase !== "arbol" ? "hidden" : ""}>
          <ArbolPanel
            picks={picks}
            onPick={pickResult}
            locked={locked}
            gruposComplete={isComplete("grupos")}
            tercerosComplete={isComplete("terceros")}
            allGrupos={grupos}
            oddsMap={oddsMap}
            initialRound={porraComplete ? "FINAL" : undefined}
          />
        </div>
      </div>

      {/* Phase nav */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setPhase(p => {
            const i = PHASES.findIndex(x => x.id === p);
            return i > 0 ? PHASES[i - 1].id : p;
          })}
          disabled={phase === "grupos"}
          className="text-sm text-gray-400 hover:text-gray-300 disabled:opacity-0 transition-colors"
        >
          ← Anterior
        </button>
        <span className="text-xs text-gray-700">{completedCount}/{PHASES.length} completadas</span>
        <button
          onClick={() => setPhase(p => {
            const i = PHASES.findIndex(x => x.id === p);
            return i < PHASES.length - 1 ? PHASES[i + 1].id : p;
          })}
          disabled={phase === "arbol" || (phase === "grupos" && !isComplete(phase))}
          title={!isComplete(phase) ? "Completa esta fase para continuar" : undefined}
          className="text-sm text-gray-400 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente →
        </button>
      </div>

      {/* Save bar */}
      {locked ? (
        <p className="text-center text-xs text-gray-400 py-2">
          🔒 La porra está cerrada — el torneo ya ha comenzado
        </p>
      ) : (
        <div className="flex items-center justify-between gap-4 glass-card px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {error
              ? <span className="text-xs text-red-400">{error}</span>
              : pending
                ? <span className="text-xs text-gray-400 animate-pulse">Guardando…</span>
                : saved
                  ? <span className="text-xs text-[#00e87a]">✓ Guardado automáticamente</span>
                  : <span className="text-xs text-gray-400">{completedCount}/{PHASES.length} fases completadas</span>
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
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Selecciona los dos primeros de cada grupo. Si aciertas el orden, ganarás un punto extra.
      </p>
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
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-lg transition-all duration-100 [touch-action:manipulation] ${on
                        ? "bg-[#00e87a]/15 border border-[#00e87a]/25 text-white"
                        : off
                          ? "opacity-25 cursor-not-allowed text-gray-400"
                          : "border border-white/[0.06] text-gray-400 hover:border-white/15 hover:text-gray-200 active:scale-[0.97] active:bg-[#00e87a]/15 active:border-[#00e87a]/30"
                        }`}
                    >
                      <span className="text-[21px]">{getFlag(team)}</span>
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
        <p className="text-gray-400 text-sm">Completa primero los 2 clasificados de cada grupo para poder seleccionar terceros</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Selecciona los 8 mejores terceros <span className="font-bold">en orden</span> — el primero en que hagas click será el mejor tercero, el último el peor
        <span className="ml-2 text-gray-700 tabular-nums">({selected.length}/8)</span>
      </p>
      <p className="text-xs text-gray-400">
        💡 Solo aparecen los equipos de grupos con 2 clasificados definidos · máximo un tercero por grupo
      </p>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-3 lg:grid-cols-4">
        {available.map(team => {
          const rank = selected.indexOf(team); // 0-based, -1 if not selected
          const on = rank !== -1;
          const off = !on && selected.length >= 8;
          const rankLabel = on ? `${rank + 1}°` : null;
          return (
            <button
              key={team}
              onClick={() => onToggle(team)}
              disabled={locked || off}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[21px] transition-all duration-100 [touch-action:manipulation] ${on
                ? "bg-[#00e87a]/15 border border-[#00e87a]/25 text-white"
                : off
                  ? "opacity-20 cursor-not-allowed border border-white/[0.04] text-gray-700"
                  : "border border-white/[0.07] text-gray-400 hover:border-white/20 hover:text-white bg-white/[0.02] active:scale-[0.97] active:bg-[#00e87a]/15 active:border-[#00e87a]/30"
                }`}
            >
              <span className="text-[27px] shrink-0">{getFlag(team)}</span>
              <span className="truncate text-left text-lg flex-1">{team}</span>
              {rankLabel && (
                <span className="text-[10px] text-[#00e87a] font-bold tabular-nums shrink-0">
                  {rankLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── ArbolPanel ────────────────────────────────────────────────────────────────

interface ArbolPanelProps {
  picks: BracketPicks;
  onPick: (matchId: string, team: string) => void;
  locked: boolean;
  gruposComplete: boolean;
  tercerosComplete: boolean;
  allGrupos: Record<string, string[]>;
  oddsMap?: Record<string, { first: number; draw: number; second: number }>;
  initialRound?: string;
}

function ArbolPanel({ picks, onPick, locked, gruposComplete, tercerosComplete, allGrupos, oddsMap, initialRound }: ArbolPanelProps) {
  const showWarning = !gruposComplete || !tercerosComplete;
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{PHASE_LABEL.arbol}</p>
      {showWarning && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-300/80">
          ⚠️ Completa <strong>Grupos</strong> y <strong>Mejores 3°</strong> para que los emparejamientos de 16avos se resuelvan. Los slots sin resolver aparecerán como “Por definir”.
        </div>
      )}
      <BracketTree picks={picks} onPick={onPick} locked={locked} allGrupos={allGrupos} oddsMap={oddsMap} initialRound={initialRound} />
    </div>
  );
}
