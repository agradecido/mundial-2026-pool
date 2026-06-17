"use client";

import { useState } from "react";
import PartidoCard from "@/components/partido-card";
import PartidoListRow from "@/components/partido-list-row";
import type { EstadoPartido, Fase } from "@prisma/client";

const FASES_ORDEN: Fase[] = [
  "DIECISEISAVOS",
  "OCTAVOS",
  "CUARTOS",
  "SEMIFINAL",
  "TERCER_PUESTO",
  "FINAL",
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
  estadio: string | null;
  ciudad: string | null;
}

interface Props {
  partidos: SerializedPartido[];
  pronosticoMap: Record<string, { golesLocal: number; golesVisitante: number; puntosGanados: number }>;
  oddsMap?: Record<string, { home: number; draw: number; away: number }>;
}

function isPlaceholder(name: string): boolean {
  return /^\d/.test(name) || name.includes("/") || /^[WL]\d/.test(name);
}

function isDefined(p: SerializedPartido): boolean {
  return !isPlaceholder(p.equipoLocal) || !isPlaceholder(p.equipoVisitante);
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


export default function PartidosTabs({
  partidos,
  pronosticoMap,
  oddsMap,
}: Props) {
  const [tab, setTab] = useState<"grupos" | "fecha" | "lista">("fecha");
  const [hidePast, setHidePast] = useState(true);

  // ── Grupos view ──────────────────────────────────────────────
  const grupos = partidos.filter((p) => p.fase === "GRUPOS");
  const eliminatorias = partidos.filter((p) => p.fase !== "GRUPOS");

  const porGrupo = grupos.reduce<Record<string, SerializedPartido[]>>(
    (acc, p) => {
      const g = p.grupo ?? "?";
      (acc[g] ??= []).push(p);
      return acc;
    },
    {},
  );

  const porFase = eliminatorias.reduce<Record<string, SerializedPartido[]>>(
    (acc, p) => {
      (acc[p.fase] ??= []).push(p);
      return acc;
    },
    {},
  );

  const gruposOrdenados = Object.keys(porGrupo).sort();

  // ── Fecha view ───────────────────────────────────────────────
  const porFecha = partidos.reduce<Record<string, SerializedPartido[]>>(
    (acc, p) => {
      const key = getDayKey(p.fechaPartido);
      (acc[key] ??= []).push(p);
      return acc;
    },
    {},
  );

  const fechasOrdenadas = Object.keys(porFecha).sort();
  const todayKey = getDayKey(new Date().toISOString());
  // Past days (before today) descending, then today + future days ascending
  const pastFechas = fechasOrdenadas.filter(k => k < todayKey).reverse();
  const futureFechas = fechasOrdenadas.filter(k => k >= todayKey);
  const fechasParaMostrar = [...pastFechas, ...futureFechas];

  // For lista: FINALIZADO matches in reverse order, then upcoming ascending
  const partidosLista = [
    ...partidos.filter(p => isDefined(p) && p.estado === "FINALIZADO").reverse(),
    ...partidos.filter(p => isDefined(p) && p.estado !== "FINALIZADO"),
  ];

  return (
    <div className="space-y-8">
      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          {(["fecha", "grupos", "lista"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? "bg-[#00e87a]/15 text-[#00e87a] border border-[#00e87a]/20"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "grupos" ? "Por grupos" : t === "fecha" ? "Por fecha" : "Lista"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setHidePast((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
            hidePast
              ? "border-white/10 bg-white/[0.04] text-gray-500 hover:text-gray-300 hover:border-white/20"
              : "border-amber-400/30 bg-amber-400/10 text-amber-400 hover:bg-amber-400/15"
          }`}
        >
          {hidePast ? "Mostrar partidos anteriores" : "Ocultar partidos anteriores"}
        </button>
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
                    <span className="text-sm font-semibold text-gray-300">
                      Grupo {letra}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {porGrupo[letra].filter((p) => !hidePast || p.estado !== "FINALIZADO" || getDayKey(p.fechaPartido) === todayKey).map((p) => (
                      <PartidoCard
                        key={`${p.id}-${pronosticoMap[p.id] ? 1 : 0}`}
                        partido={p}
                        pronostico={pronosticoMap[p.id] ?? null}
                        odds={oddsMap?.[p.id] ?? null}
                      />
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
              <div
                className={`glass-card p-4 ${fase === "FINAL" ? "border-[#00e87a]/20" : ""}`}
              >
                {fase === "FINAL" && (
                  <div className="absolute inset-x-0 top-0 h-px rounded-t-xl bg-gradient-to-r from-transparent via-[#00e87a]/40 to-transparent" />
                )}
                <div className="space-y-1.5">
                  {porFase[fase].filter((p) => isDefined(p) && (!hidePast || p.estado !== "FINALIZADO" || getDayKey(p.fechaPartido) === todayKey)).map((p) => (
                    <PartidoCard
                      key={`${p.id}-${pronosticoMap[p.id] ? 1 : 0}`}
                      partido={p}
                      pronostico={pronosticoMap[p.id] ?? null}
                      odds={oddsMap?.[p.id] ?? null}
                    />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Vista: Lista ── */}
      {tab === "lista" && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-gray-500">
                <th className="px-3 py-2.5 font-medium hidden sm:table-cell">Fecha</th>
                <th className="px-3 py-2.5 font-medium text-right">Local</th>
                <th className="px-3 py-2.5 font-medium text-center">Pronóstico</th>
                <th className="px-3 py-2.5 font-medium">Visitante</th>
                <th className="px-3 py-2.5 font-medium text-center hidden sm:table-cell">Resultado</th>
                <th className="px-3 py-2.5 font-medium text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {partidosLista
                .filter(p => !hidePast || p.estado !== "FINALIZADO" || getDayKey(p.fechaPartido) === todayKey)
                .map(p => (
                  <PartidoListRow
                    key={`${p.id}-${pronosticoMap[p.id] ? 1 : 0}`}
                    partido={p}
                    pronostico={pronosticoMap[p.id] ?? null}
                  />
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Vista: Por fecha ── */}
      {tab === "fecha" && (
        <div className="space-y-8">
          {fechasParaMostrar.map((key) => {
            const all = porFecha[key].filter(isDefined);
            const isToday = key === todayKey;
            const dayPartidos = hidePast ? all.filter((p) => p.estado !== "FINALIZADO" || isToday) : all;
            if (dayPartidos.length === 0) return null;
            return (
              <section key={key}>
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500 capitalize">
                  {formatDayHeader(dayPartidos[0].fechaPartido)}
                </h2>
                <div className="glass-card p-4">
                  <div className="space-y-1.5">
                    {dayPartidos.map((p) => (
                      <PartidoCard
                        key={`${p.id}-${pronosticoMap[p.id] ? 1 : 0}`}
                        partido={p}
                        pronostico={pronosticoMap[p.id] ?? null}
                        odds={oddsMap?.[p.id] ?? null}
                      />
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
