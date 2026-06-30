import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import type { BracketPicks } from "@/lib/bracket";
import { SF_MATCHES } from "@/lib/bracket";
import { computeActualBracket, scoreBracket, bracketCompletion } from "@/lib/bracket-scoring";
import type { RankedPorraEntry } from "@/components/porra-ranking";
import RankingTabs from "@/components/ranking-tabs";
import type { PreTournamentEntry } from "@/components/pre-tournament-list";
import type { GrupoPorraEntry } from "@/components/grupos-porra-ranking";

type TendenciaReciente = "up2" | "up1" | "flat" | "down1" | "down2" | null;

function computeTrend(pts: number[]): TendenciaReciente {
  if (pts.length < 10) return null;
  const recentAvg = pts.slice(0, 5).reduce((s, p) => s + p, 0) / 5;
  const olderAvg = pts.slice(5, 10).reduce((s, p) => s + p, 0) / 5;
  const diff = recentAvg - olderAvg;
  if (diff > 1.5) return "up2";
  if (diff > 0.5) return "up1";
  if (diff < -1.5) return "down2";
  if (diff < -0.5) return "down1";
  return "flat";
}

const getRankingData = unstable_cache(
  async () => {
    const [users, partidos, firstPartido, grupos] = await Promise.all([
      prisma.user.findMany({
        where: { suspendido: false },
        select: {
          id: true,
          name: true,
          image: true,
          fechaRegistro: true,
          ultimoAcceso: true,
          pronosticos: {
            select: {
              puntosGanados: true,
              partido: { select: { fechaPartido: true, estado: true } },
            },
          },
          prediccionFutura: {
            select: { puntosCampeon: true, puntosSubcampeon: true },
          },
          bracketPicks: true,
        },
      }),
      prisma.partido.findMany({
        select: {
          equipoLocal: true,
          equipoVisitante: true,
          golesLocalReal: true,
          golesVisitanteReal: true,
          ganadorPenales: true,
          estado: true,
          fase: true,
          grupo: true,
        },
      }),
      prisma.partido.findFirst({
        orderBy: { fechaPartido: "asc" },
        select: { fechaPartido: true },
      }),
      prisma.grupo.findMany({
        include: { miembros: { select: { userId: true } } },
        orderBy: { nombre: "asc" },
      }),
    ]);

    // Quiniela ranking
    const quinielaRanking = users
      .map((u) => {
        const finished = u.pronosticos.filter((p) => p.partido.estado === "FINALIZADO");
        const puntosPartidos = finished.reduce((s, p) => s + p.puntosGanados, 0);
        const pf = u.prediccionFutura;
        const puntosEspeciales = pf ? pf.puntosCampeon + pf.puntosSubcampeon : 0;
        const total = puntosPartidos + puntosEspeciales;
        const exactos = finished.filter((p) => p.puntosGanados === 5 || p.puntosGanados === 10).length;
        const tendencias = finished.filter((p) => p.puntosGanados === 3 || p.puntosGanados === 6).length;
        const last10pts = [...finished]
          .sort((a, b) => b.partido.fechaPartido.getTime() - a.partido.fechaPartido.getTime())
          .slice(0, 10)
          .map((p) => p.puntosGanados);
        const tendenciaReciente = computeTrend(last10pts);
        return { id: u.id, name: u.name, image: u.image, total, exactos, tendencias, tendenciaReciente, fechaRegistro: u.fechaRegistro };
      })
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.exactos !== a.exactos) return b.exactos - a.exactos;
        if (b.tendencias !== a.tendencias) return b.tendencias - a.tendencias;
        return a.fechaRegistro.getTime() - b.fechaRegistro.getTime();
      })
      .map(({ fechaRegistro: _, ...u }) => u);

    // Porra ranking
    const gruposLetters = [
      ...new Set(partidos.filter((p) => p.fase === "GRUPOS").map((p) => p.grupo!).filter(Boolean)),
    ].sort();

    const actual = computeActualBracket(partidos);
    const emptyScore = { total: 0, dieciseisavos: 0, octavos: 0, cuartos: 0, semifinal: 0, final: 0, campeon: 0 };
    const emptyCompletion = { done: 0, total: 7 };

    const porraEntries: RankedPorraEntry[] = users
      .map((u) => {
        const r = u.bracketPicks;
        if (!r) {
          return { user: { id: u.id, name: u.name, image: u.image }, score: emptyScore, completion: emptyCompletion, campeon: undefined, subcampeon: undefined };
        }
        const picks = r.picks as BracketPicks;
        const score = scoreBracket(picks, actual);
        const completion = bracketCompletion(picks, gruposLetters);
        const campeon =
          picks.resultados?.["FINAL"] ??
          (picks as Record<string, unknown>).campeon as string | undefined;
        const finalists = SF_MATCHES.map((m) => picks.resultados?.[m.id]).filter(Boolean) as string[];
        const subcampeon = finalists.find((f) => f !== campeon);
        return { user: { id: u.id, name: u.name, image: u.image }, score, completion, campeon, subcampeon };
      })
      .sort((a, b) => b.score.total - a.score.total || b.completion.done - a.completion.done);

    const tournamentStarted = !!firstPartido && firstPartido.fechaPartido.getTime() <= Date.now();

    const withBracketDone = users.map((u) => {
      const picks = (u.bracketPicks?.picks ?? {}) as BracketPicks;
      const done = bracketCompletion(picks, gruposLetters).done;
      return { ...u, bracketDone: done };
    });

    const preTournamentQuinielaEntries: PreTournamentEntry[] = [...withBracketDone]
      .sort((a, b) => {
        if (b.pronosticos.length !== a.pronosticos.length) return b.pronosticos.length - a.pronosticos.length;
        return (b.ultimoAcceso?.getTime() ?? 0) - (a.ultimoAcceso?.getTime() ?? 0);
      })
      .map((u) => ({
        id: u.id,
        name: u.name,
        image: u.image,
        ultimoAcceso: u.ultimoAcceso ? u.ultimoAcceso.toISOString() : null,
        numPronosticos: u.pronosticos.length,
        bracketDone: u.bracketDone,
      }));

    const preTournamentPorraEntries: PreTournamentEntry[] = [...withBracketDone]
      .sort((a, b) => {
        if (b.bracketDone !== a.bracketDone) return b.bracketDone - a.bracketDone;
        return (b.ultimoAcceso?.getTime() ?? 0) - (a.ultimoAcceso?.getTime() ?? 0);
      })
      .map((u) => ({
        id: u.id,
        name: u.name,
        image: u.image,
        ultimoAcceso: u.ultimoAcceso ? u.ultimoAcceso.toISOString() : null,
        numPronosticos: u.pronosticos.length,
        bracketDone: u.bracketDone,
      }));

    // Grupos ranking
    const userScoreMap = new Map(porraEntries.map((e) => [e.user.id, e.score.total]));
    const gruposRanking: GrupoPorraEntry[] = grupos
      .map((g) => {
        const scores = g.miembros.map((m) => userScoreMap.get(m.userId) ?? 0);
        const total = scores.reduce((s, p) => s + p, 0);
        const numMiembros = scores.length;
        const media = numMiembros > 0 ? total / numMiembros : 0;
        return { id: g.id, nombre: g.nombre, codigo: g.codigo, numMiembros, total, media };
      })
      .sort((a, b) => b.media - a.media || b.total - a.total || a.nombre.localeCompare(b.nombre));

    return { quinielaRanking, porraEntries, gruposRanking, tournamentStarted, preTournamentQuinielaEntries, preTournamentPorraEntries };
  },
  ["ranking-all"],
  { tags: ["ranking"] }
);

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // livePartidos is NOT inside getRankingData (which is cached) so it's always fresh
  const [session, params, data, livePartidos] = await Promise.all([
    auth(),
    searchParams,
    getRankingData(),
    prisma.partido.findMany({
      where: { estado: "EN_PROGRESO" },
      select: {
        id: true,
        equipoLocal: true,
        equipoVisitante: true,
        fase: true,
        pronosticos: {
          select: { userId: true, golesLocal: true, golesVisitante: true },
        },
      },
    }),
  ]);
  const currentUserId = session!.user.id;
  const activeTab = params.tab === "porra" ? "porra" : params.tab === "grupos" ? "grupos" : "quiniela";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Rankings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Clasificaciones de ambas competiciones
        </p>
      </div>

      <RankingTabs
        activeTab={activeTab}
        quinielaRanking={data.quinielaRanking}
        porraEntries={data.porraEntries}
        gruposRanking={data.gruposRanking}
        currentUserId={currentUserId}
        tournamentStarted={data.tournamentStarted}
        preTournamentQuinielaEntries={data.preTournamentQuinielaEntries}
        preTournamentPorraEntries={data.preTournamentPorraEntries}
        livePartidos={livePartidos}
      />
    </div>
  );
}
