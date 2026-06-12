import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";
import PartidosTabs from "@/components/partidos-tabs";
import ResetQuinielaButton from "@/components/reset-quiniela-button";
import { getMundialOdds, buildOddsMap } from "@/lib/odds-api";

export default async function PartidosPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [partidos, pronosticos, oddsEvents, allUsers] = await Promise.all([
    prisma.partido.findMany({ orderBy: { fechaPartido: "asc" } }),
    prisma.pronostico.findMany({ where: { userId } }),
    getMundialOdds(),
    prisma.user.findMany({
      select: {
        id: true,
        fechaRegistro: true,
        pronosticos: { select: { puntosGanados: true } },
        prediccionFutura: { select: { puntosCampeon: true, puntosSubcampeon: true } },
      },
    }),
  ]);

  // Ranking position (mismo criterio que quiniela/ranking)
  const scored = allUsers
    .map(u => {
      const total = u.pronosticos.reduce((s, p) => s + p.puntosGanados, 0)
        + (u.prediccionFutura ? u.prediccionFutura.puntosCampeon + u.prediccionFutura.puntosSubcampeon : 0);
      const exactos = u.pronosticos.filter(p => p.puntosGanados === 5 || p.puntosGanados === 10).length;
      const tendencias = u.pronosticos.filter(p => p.puntosGanados === 3 || p.puntosGanados === 6).length;
      return { id: u.id, total, exactos, tendencias, fechaRegistro: u.fechaRegistro };
    })
    .sort((a, b) =>
      b.total - a.total || b.exactos - a.exactos || b.tendencias - a.tendencias ||
      a.fechaRegistro.getTime() - b.fechaRegistro.getTime()
    );

  const rankIdx = scored.findIndex(u => u.id === userId);
  const rankPosition = rankIdx >= 0 ? rankIdx + 1 : null;
  const userPts = rankIdx >= 0 ? scored[rankIdx].total : 0;

  const pronosticoMap = Object.fromEntries(
    pronosticos.map((p) => [p.partidoId, { golesLocal: p.golesLocal, golesVisitante: p.golesVisitante, puntosGanados: p.puntosGanados }])
  );

  const oddsByTeams = buildOddsMap(oddsEvents);
  const oddsMap: Record<string, { home: number; draw: number; away: number }> = {};
  for (const p of partidos) {
    const odds = oddsByTeams.get(`${p.equipoLocal}|${p.equipoVisitante}`);
    if (odds) oddsMap[p.id] = odds;
  }

  const serializedPartidos = partidos.map((p) => ({
    ...p,
    fechaPartido: p.fechaPartido.toISOString(),
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Quiniela</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/quiniela/ranking"
            className="inline-flex items-center gap-2 rounded-lg border border-[#00e87a]/40 bg-[#00e87a]/15 px-3 py-1.5 text-xs text-[#00e87a] hover:bg-[#00e87a]/25 hover:border-[#00e87a]/60 transition-colors"
          >
            {rankPosition !== null ? `${rankPosition}º · ${userPts} pts` : "Ranking"}
            <LinkSpinner className="size-3 shrink-0" />
          </Link>
          <ResetQuinielaButton />
        </div>
      </div>

      <PartidosTabs partidos={serializedPartidos} pronosticoMap={pronosticoMap} oddsMap={oddsMap} />
    </div>
  );
}
