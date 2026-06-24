"use client";

import { useState } from "react";
import PartidoCard from "./partido-card";
import type { SerializedPartido } from "./partidos-tabs";

interface Props {
  partidos: SerializedPartido[];
  pronosticoMap: Record<string, { golesLocal: number; golesVisitante: number; puntosGanados: number }>;
  oddsMap?: Record<string, { home: number; draw: number; away: number }>;
}

export default function PastMatchesSection({ partidos, pronosticoMap, oddsMap }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <section className="space-y-4">
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all bg-white/[0.04] border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20"
      >
        <span>{isExpanded ? "−" : "+"}</span>
        <span className="text-xs font-semibold uppercase tracking-widest">
          Partidos anteriores ({partidos.length})
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-1.5 pl-0">
          {partidos.map((partido) => (
            <PartidoCard
              key={`${partido.id}-past`}
              partido={partido}
              pronostico={pronosticoMap[partido.id] ?? null}
              odds={oddsMap?.[partido.id] ?? null}
            />
          ))}
        </div>
      )}
    </section>
  );
}
