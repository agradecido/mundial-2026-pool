"use client";

import { useState, useEffect } from "react";
import PartidoCard from "./partido-card";
import type { SerializedPartido } from "./partidos-tabs";

interface Props {
  partidos: SerializedPartido[];
  pronosticoMap: Record<string, { golesLocal: number; golesVisitante: number; puntosGanados: number }>;
  oddsMap?: Record<string, { home: number; draw: number; away: number }>;
}

export default function PastMatchesSection({ partidos, pronosticoMap, oddsMap }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scrollPos, setScrollPos] = useState(0);

  const handleToggle = () => {
    if (!isExpanded) {
      // Save current scroll position before expanding
      setScrollPos(window.scrollY);
    }
    setIsExpanded(!isExpanded);
  };

  useEffect(() => {
    if (isExpanded && scrollPos !== undefined) {
      // Restore scroll position after content is rendered
      const timer = setTimeout(() => {
        window.scrollTo(0, scrollPos);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, scrollPos]);

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
          {[...partidos].reverse().map((partido) => (
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
