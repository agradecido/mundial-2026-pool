import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PartidoCard from "@/components/partido-card";
import type { Fase } from "@prisma/client";

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

export default async function PartidosPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [partidos, pronosticos] = await Promise.all([
    prisma.partido.findMany({ orderBy: { fechaPartido: "asc" } }),
    prisma.pronostico.findMany({ where: { userId } }),
  ]);

  const pronosticoMap = Object.fromEntries(pronosticos.map((p) => [p.partidoId, p]));

  const grupos = partidos.filter((p) => p.fase === "GRUPOS");
  const eliminatorias = partidos.filter((p) => p.fase !== "GRUPOS");

  const porGrupo = grupos.reduce<Record<string, typeof grupos>>((acc, p) => {
    const g = p.grupo ?? "?";
    (acc[g] ??= []).push(p);
    return acc;
  }, {});

  const porFase = eliminatorias.reduce<Record<string, typeof eliminatorias>>((acc, p) => {
    (acc[p.fase] ??= []).push(p);
    return acc;
  }, {});

  function ser(p: (typeof partidos)[0]) {
    return { ...p, fechaPartido: p.fechaPartido.toISOString() };
  }

  const gruposOrdenados = Object.keys(porGrupo).sort();
  const totalPronosticos = pronosticos.length;
  const pct = Math.round((totalPronosticos / 104) * 100);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Partidos</h1>
          <p className="mt-1 text-sm text-gray-500">104 partidos · Mundial 2026</p>
        </div>
        {/* Progress pill */}
        <div className="text-right">
          <p className="text-xs text-gray-600 mb-1">{totalPronosticos} / 104 pronósticos</p>
          <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00e87a] to-emerald-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Fase de grupos ── */}
      <section>
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Fase de Grupos
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {gruposOrdenados.map((letra) => (
            <div key={letra} className="glass-card p-4">
              {/* Group header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00e87a]/10 text-xs font-bold text-[#00e87a]">
                  {letra}
                </span>
                <span className="text-sm font-semibold text-gray-300">Grupo {letra}</span>
              </div>
              <div className="space-y-1.5">
                {porGrupo[letra].map((p) => (
                  <PartidoCard
                    key={p.id}
                    partido={ser(p)}
                    pronostico={pronosticoMap[p.id] ?? null}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Fases eliminatorias ── */}
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
                <PartidoCard
                  key={p.id}
                  partido={ser(p)}
                  pronostico={pronosticoMap[p.id] ?? null}
                />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
