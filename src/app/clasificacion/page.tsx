import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getFlag } from "@/lib/flags";

type Stats = {
  team: string;
  pj: number; pg: number; pe: number; pp: number;
  gf: number; gc: number; pts: number;
};

type GrupoData = { letra: string; equipos: Stats[] };

const getClasificacion = unstable_cache(
  async (): Promise<GrupoData[]> => {
    const partidos = await prisma.partido.findMany({
      where: { fase: "GRUPOS" },
      select: {
        equipoLocal: true,
        equipoVisitante: true,
        golesLocalReal: true,
        golesVisitanteReal: true,
        estado: true,
        grupo: true,
      },
    });

    const groups: Record<string, Record<string, Stats>> = {};

    for (const p of partidos) {
      if (!p.grupo) continue;
      if (!groups[p.grupo]) groups[p.grupo] = {};

      const init = (t: string): Stats => ({ team: t, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 });
      if (!groups[p.grupo][p.equipoLocal]) groups[p.grupo][p.equipoLocal] = init(p.equipoLocal);
      if (!groups[p.grupo][p.equipoVisitante]) groups[p.grupo][p.equipoVisitante] = init(p.equipoVisitante);

      if (p.estado !== "FINALIZADO" || p.golesLocalReal === null || p.golesVisitanteReal === null) continue;

      const loc = groups[p.grupo][p.equipoLocal];
      const vis = groups[p.grupo][p.equipoVisitante];
      const gl = p.golesLocalReal;
      const gv = p.golesVisitanteReal;

      loc.pj++; vis.pj++;
      loc.gf += gl; loc.gc += gv;
      vis.gf += gv; vis.gc += gl;

      if (gl > gv) { loc.pg++; loc.pts += 3; vis.pp++; }
      else if (gl < gv) { vis.pg++; vis.pts += 3; loc.pp++; }
      else { loc.pe++; loc.pts++; vis.pe++; vis.pts++; }
    }

    return Object.entries(groups)
      .filter(([, teams]) => Object.keys(teams).length > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letra, teams]) => ({
        letra,
        equipos: Object.values(teams).sort((a, b) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          const gdA = a.gf - a.gc, gdB = b.gf - b.gc;
          if (gdB !== gdA) return gdB - gdA;
          if (b.gf !== a.gf) return b.gf - a.gf;
          return a.team.localeCompare(b.team);
        }),
      }));
  },
  ["clasificacion-grupos"],
  { tags: ["ranking"] },
);

export default async function ClasificacionPage() {
  const grupos = await getClasificacion();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Clasificación</h1>
        <p className="text-sm text-gray-500 mt-1">Fase de Grupos · Mundial 2026</p>
      </div>

      {grupos.length === 0 ? (
        <div className="glass-card p-16 text-center text-gray-600">
          Los partidos de la fase de grupos aún no han comenzado
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 text-[11px] text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00e87a]/70" />
              Clasificado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500/50" />
              Posible 3º clasificado
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {grupos.map(({ letra, equipos }) => (
              <GrupoCard key={letra} letra={letra} equipos={equipos} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function GrupoCard({ letra, equipos }: { letra: string; equipos: Stats[] }) {
  return (
    <div className="glass-card !p-0 overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-[#00e87a]/10 text-[11px] font-bold text-[#00e87a]">
          {letra}
        </span>
        <span className="text-sm font-semibold text-gray-300">Grupo {letra}</span>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.04]">
            <th className="pl-3 pr-1 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600">#</th>
            <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600">Equipo</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">PJ</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">G</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">E</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">P</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">GF</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">GC</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">GD</th>
            <th className="pr-3 pl-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">Pts</th>
          </tr>
        </thead>
        <tbody>
          {equipos.map((e, i) => {
            const gd = e.gf - e.gc;
            const qualifies = i < 2;
            const thirdPlace = i === 2;
            return (
              <tr
                key={e.team}
                className={`border-b border-white/[0.03] last:border-0 ${qualifies ? "bg-[#00e87a]/[0.03]" : ""}`}
              >
                <td className="pl-3 pr-1 py-2.5">
                  <span className={`text-xs font-bold ${qualifies ? "text-[#00e87a]" : thirdPlace ? "text-yellow-500/60" : "text-gray-700"}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base leading-none shrink-0">{getFlag(e.team)}</span>
                    <span className={`text-xs font-medium truncate ${qualifies ? "text-gray-200" : "text-gray-400"}`}>
                      {e.team}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-400 tabular-nums">{e.pj}</td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-500 tabular-nums hidden sm:table-cell">{e.pg}</td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-500 tabular-nums hidden sm:table-cell">{e.pe}</td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-500 tabular-nums hidden sm:table-cell">{e.pp}</td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-400 tabular-nums">{e.gf}</td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-400 tabular-nums">{e.gc}</td>
                <td className="px-2 py-2.5 text-center text-xs tabular-nums">
                  <span className={gd > 0 ? "text-[#00e87a]" : gd < 0 ? "text-red-400/70" : "text-gray-600"}>
                    {gd > 0 ? `+${gd}` : gd}
                  </span>
                </td>
                <td className="pr-3 pl-2 py-2.5 text-center">
                  <span className={`text-sm font-bold tabular-nums ${qualifies ? "text-white" : "text-gray-500"}`}>
                    {e.pts}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
