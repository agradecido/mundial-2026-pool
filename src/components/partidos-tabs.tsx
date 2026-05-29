"use client";

import { useState } from "react";
import PartidoCard from "@/components/partido-card";
import type { EstadoPartido, Fase } from "@prisma/client";

const FASES_ORDEN: Fase[] = [
  "DIECISEISAVOS", "OCTAVOS", "CUARTOS", "SEMIFINAL", "TERCER_PUESTO", "FINAL",
];

const FASE_LABEL: Record<Fase, string> = {
  GRUPOS: "Fase de Grupos",
  DIECISEISAVOS: "Dieciseisavos de Final",
  OCTAVOS: "Octavos de Final",
  CUARTOS: "Cuartos de Final",
  SEMIFINAL: "Semifinales",
  TERCER_PUESTO: "Tercer y Cuarto Puesto",
  FINAL: "Final",
};

export interface SerializedPartido {
  id: string;
  equipoLocal: string;
  equipoVisitante: string;
  fechaPartido: string;
  fase: Fase;
  estado: EstadoPartido;
  golesLocalReal: number | null;
  golesVisitanteReal: number | null;
  grupo: string | null;
}

interface Props {
  partidos: SerializedPartido[];
  pronosticoMap: Record<string, { golesLocal: number; golesVisitante: number }>;
}

function getDayKey(iso: string): string {
  const parts = new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Madrid",
  }).formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const d = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${m}-${d}`;
}

function formatDayHeader(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  });
}

export default function PartidosTabs({ partidos, pronosticoMap }: Props) {
  const [tab, setTab] = useState<"grupos" | "fecha">("fecha");

  // ── Grupos view ──────────────────────────────────────────────
  const grupos = partidos.filter((p) => p.fase === "GRUPOS");
  const eliminatorias = partidos.filter((p) => p.fase !== "GRUPOS");

  const porGrupo = grupos.reduce<Record<string, SerializedPartido[]>>((acc, p) => {
    const g = p.grupo ?? "?";
    (acc[g] ??= []).push(p);
    return acc;
  }, {});

  const porFase = eliminatorias.reduce<Record<string, SerializedPartido[]>>((acc, p) => {
    (acc[p.fase] ??= []).push(p);
    return acc;
  }, {});

  const gruposOrdenados = Object.keys(porGrupo).sort();

  // ── Fecha view ───────────────────────────────────────────────
  const porFecha = partidos.reduce<Record<string, SerializedPartido[]>>((acc, p) => {
    const key = getDayKey(p.fechaPartido);
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  const fechasOrdenadas = Object.keys(porFecha).sort();

  return (
    <div className="space-y-8">
      {/* Tab selector */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit">
        {(["grupos", "fecha"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t
                ? "bg-[#00e87a]/15 text-[#00e87a] border border-[#00e87a]/20"
                : "text-gray-500 hover:text-gray-300"
              }`}
          >
            {t === "grupos" ? "Por grupos" : "Por fecha"}
          </button>
        ))}
      </div>

      {/* ── Vista: Por grupos ── */}
      {tab === "grupos" && (
        <div className="space-y-10">
          <section>
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-500">
              Fase de Grupos
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {gruposOrdenados.map((letra) => (
                <div key={letra} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00e87a]/10 text-xs font-bold text-[#00e87a]">
                      {letra}
                    </span>
                    <span className="text-sm font-semibold text-gray-300">Grupo {letra}</span>
                  </div>
                  <div className="space-y-1.5">
                    {porGrupo[letra].map((p) => (
                       <PartidoCard key={`${p.id}-${pronosticoMap[p.id] ? 1 : 0}`} partido={p} pronostico={pronosticoMap[p.id] ?? null} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {FASES_ORDEN.filter((f) => porFase[f]?.length).map((fase) => (
            <section key={fase}>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
                {FASE_LABEL[fase]}
              </h2>
              <div className={`glass-card p-4 ${fase === "FINAL" ? "border-[#00e87a]/20" : ""}`}>
                {fase === "FINAL" && (
                  <div className="absolute inset-x-0 top-0 h-px rounded-t-xl bg-gradient-to-r from-transparent via-[#00e87a]/40 to-transparent" />
                )}
                <div className="space-y-1.5">
                  {porFase[fase].map((p) => (
                    <PartidoCard key={`${p.id}-${pronosticoMap[p.id] ? 1 : 0}`} partido={p} pronostico={pronosticoMap[p.id] ?? null} />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Vista: Por fecha ── */}
      {tab === "fecha" && (
        <div className="space-y-8">
          {fechasOrdenadas.map((key) => {
            const dayPartidos = porFecha[key];
            return (
              <section key={key}>
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500 capitalize">
                  {formatDayHeader(dayPartidos[0].fechaPartido)}
                </h2>
                <div className="glass-card p-4">
                  <div className="space-y-1.5">
                    {dayPartidos.map((p) => (
                      <PartidoCard key={`${p.id}-${pronosticoMap[p.id] ? 1 : 0}`} partido={p} pronostico={pronosticoMap[p.id] ?? null} />
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
