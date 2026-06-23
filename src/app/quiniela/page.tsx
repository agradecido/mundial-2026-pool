import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";
import PartidosTabs from "@/components/partidos-tabs";
import PartidoCard from "@/components/partido-card";
import ResetQuinielaButton from "@/components/reset-quiniela-button";
import { getMundialOdds, buildOddsMap } from "@/lib/odds-api";

export default async function PartidosPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [partidos, pronosticos, oddsEvents, allUsers, userBadge] = await Promise.all([
    prisma.partido.findMany({ orderBy: { fechaPartido: "asc" } }),
    prisma.pronostico.findMany({ where: { userId } }),
    getMundialOdds(),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        fechaRegistro: true,
        pronosticos: { select: { puntosGanados: true } },
        prediccionFutura: { select: { puntosCampeon: true, puntosSubcampeon: true } },
      },
    }),
    prisma.badgeUsuario.findUnique({ where: { userId } }),
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

  const liveMatch = serializedPartidos.find((p) => p.estado === "EN_PROGRESO");
  const nextMatch = serializedPartidos.find((p) => p.estado === "PROGRAMADO" && new Date(p.fechaPartido) > new Date());
  const featuredMatches: typeof liveMatch[] = [];
  if (liveMatch) featuredMatches.push(liveMatch);
  if (nextMatch) featuredMatches.push(nextMatch);

  const getLeaderPronostico = async (match: typeof liveMatch) => {
    if (!match) return null;
    const pronosticosDelPartido = await prisma.pronostico.findMany({
      where: { partidoId: match.id },
      select: { golesLocal: true, golesVisitante: true },
    });

    if (pronosticosDelPartido.length > 0) {
      const conteo = new Map<string, number>();
      for (const p of pronosticosDelPartido) {
        const key = `${p.golesLocal}-${p.golesVisitante}`;
        conteo.set(key, (conteo.get(key) ?? 0) + 1);
      }

      const topMarcador = Array.from(conteo.entries()).sort((a, b) => b[1] - a[1])[0];
      const [golesLocal, golesVisitante] = topMarcador[0].split("-").map(Number);
      return {
        name: null,
        golesLocal,
        golesVisitante,
      };
    }
    return null;
  };

  const leaderPronosticos = await Promise.all(
    featuredMatches.map((m) => getLeaderPronostico(m))
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div className="flex-1">
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

      {/* AI Badge - Full width on mobile */}
      {userBadge && (
        <div className="space-y-0.5 mt-4 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Lo que la IA dice de ti</p>
          <p className="flex items-center gap-1.5 text-sm">
            <span className="text-base leading-none">{userBadge.emoji}</span>
            <span className="font-semibold text-gray-200">{userBadge.titulo}</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">{userBadge.descripcion}</span>
          </p>
        </div>
      )}

      <p className="mt-0 mb-4 text-sm text-gray-500">Pronostica el marcador de cada partido hasta 15 minutos antes del inicio.</p>

      {/* Partidos destacados */}
      {featuredMatches.length > 0 && (
        <section className="space-y-6">
          {featuredMatches.map((match, idx) => {
            if (!match) return null;
            const isLive = liveMatch && match.id === liveMatch.id;
            return (
              <div key={match.id}>
                <div className="mb-3 flex items-center gap-2">
                  {isLive ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-yellow-300">
                      <span className="size-1.5 rounded-full bg-yellow-300 animate-pulse" />En juego
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                      Próximo partido
                    </span>
                  )}
                </div>
                <div className={isLive ? "ring-1 ring-yellow-400/20 rounded-2xl" : "ring-1 ring-white/[0.08] rounded-2xl"}>
                  <PartidoCard
                    partido={match}
                    pronostico={pronosticoMap[match.id] ?? null}
                    odds={oddsMap?.[match.id] ?? null}
                    leaderPronostico={leaderPronosticos[idx] ?? null}
                  />
                </div>
              </div>
            );
          })}
          <div className="mt-8 border-t border-white/[0.05]" />
        </section>
      )}

      <PartidosTabs partidos={serializedPartidos} pronosticoMap={pronosticoMap} oddsMap={oddsMap} />
    </div>
  );
}
