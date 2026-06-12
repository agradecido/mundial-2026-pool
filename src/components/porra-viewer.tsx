"use client";

import { useState } from "react";
import { getFlag } from "@/lib/flags";
import type { BracketPicks } from "@/lib/bracket";
import BracketTree from "@/components/bracket-tree";

type Phase = "grupos" | "terceros" | "arbol";

const PHASES: Array<{ id: Phase; label: string }> = [
  { id: "grupos", label: "Grupos" },
  { id: "terceros", label: "Mejores 3°" },
  { id: "arbol", label: "Eliminatorias" },
];

interface Props {
  picks: BracketPicks;
  grupos: Record<string, string[]>;
  oddsMap?: Record<string, { first: number; draw: number; second: number }>;
}

export default function PorraViewer({ picks, grupos, oddsMap }: Props) {
  const gruposLetters = Object.keys(grupos).sort();
  const [phase, setPhase] = useState<Phase>("arbol");

  return (
    <div className="space-y-6">
      {/* Phase tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {PHASES.map(p => {
          const active = p.id === phase;
          return (
            <button
              key={p.id}
              onClick={() => setPhase(p.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-base font-semibold transition-all ${
                active
                  ? "bg-[#00e87a]/15 text-[#00e87a] border border-[#00e87a]/20"
                  : "text-gray-400 hover:text-gray-300 border border-transparent"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {phase === "grupos" && (
        <GruposStatic grupos={grupos} gruposLetters={gruposLetters} picks={picks.grupos ?? {}} />
      )}
      {phase === "terceros" && (
        <TercerosStatic selected={picks.terceros ?? []} />
      )}
      <div className={phase !== "arbol" ? "hidden" : ""}>
        <BracketTree
          picks={picks}
          locked={true}
          allGrupos={grupos}
          oddsMap={oddsMap}
          initialRound="FINAL"
        />
      </div>
    </div>
  );
}

function GruposStatic({
  grupos,
  gruposLetters,
  picks,
}: {
  grupos: Record<string, string[]>;
  gruposLetters: string[];
  picks: Record<string, string[]>;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Tus clasificados de cada grupo</p>
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
              </div>
              <div className="space-y-1">
                {teams.map(team => {
                  const idx = selected.indexOf(team);
                  const on = idx !== -1;
                  const orderLabel = idx === 0 ? "1°" : idx === 1 ? "2°" : null;
                  return (
                    <div
                      key={team}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-lg ${
                        on
                          ? "bg-[#00e87a]/15 border border-[#00e87a]/25 text-white"
                          : "opacity-20 text-gray-600 border border-transparent"
                      }`}
                    >
                      <span className="text-[21px]">{getFlag(team)}</span>
                      <span className="truncate flex-1 text-left">{team}</span>
                      {orderLabel && (
                        <span className="text-[10px] text-[#00e87a] font-bold tabular-nums shrink-0">
                          {orderLabel}
                        </span>
                      )}
                    </div>
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

function TercerosStatic({ selected }: { selected: string[] }) {
  if (selected.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-gray-400 text-sm">No seleccionaste mejores terceros</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Tus 8 mejores terceros seleccionados</p>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-3 lg:grid-cols-4">
        {selected.map((team, idx) => (
          <div
            key={team}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#00e87a]/15 border border-[#00e87a]/25 text-white"
          >
            <span className="text-[21px] shrink-0">{getFlag(team)}</span>
            <span className="truncate text-left text-lg flex-1">{team}</span>
            <span className="text-[10px] text-[#00e87a] font-bold tabular-nums shrink-0">
              {idx + 1}°
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
