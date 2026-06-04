import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { BracketPicks } from "@/lib/bracket";
import { SF_MATCHES } from "@/lib/bracket";
import { computeActualBracket, scoreBracket, bracketCompletion } from "@/lib/bracket-scoring";
import type { RankedPorraEntry } from "@/components/porra-ranking";
import RankingTabs from "@/components/ranking-tabs";
import type { PreTournamentEntry } from "@/components/pre-tournament-list";
import type { GrupoPorraEntry } from "@/components/grupos-porra-ranking";

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const currentUserId = session!.user.id;
  const params = await searchParams;
  const activeTab = params.tab === "porra" ? "porra" : params.tab === "grupos" ? "grupos" : "quiniela";

  // Fetch data for Quiniela ranking
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      image: true,
      fechaRegistro: true,
      ultimoAcceso: true,
      pronosticos: {
        select: { puntosGanados: true },
      },
      prediccionFutura: {
        select: { puntosCampeon: true, puntosSubcampeon: true },
      },
      bracketPicks: true,
    },
  });

  // Process Quiniela ranking
  const quinielaRanking = users
    .map((u) => {
      const puntosPartidos = u.pronosticos.reduce((s, p) => s + p.puntosGanados, 0);
      const pf = u.prediccionFutura;
      const puntosEspeciales = pf
        ? pf.puntosCampeon + pf.puntosSubcampeon
        : 0;
      const total = puntosPartidos + puntosEspeciales;
      const exactos = u.pronosticos.filter(
        (p) => p.puntosGanados === 5 || p.puntosGanados === 10
      ).length;
      const tendencias = u.pronosticos.filter(
        (p) => p.puntosGanados === 3 || p.puntosGanados === 6
      ).length;
      return { id: u.id, name: u.name, image: u.image, total, exactos, tendencias, fechaRegistro: u.fechaRegistro };
    })
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.exactos !== a.exactos) return b.exactos - a.exactos;
      if (b.tendencias !== a.tendencias) return b.tendencias - a.tendencias;
      return a.fechaRegistro.getTime() - b.fechaRegistro.getTime();
    })
    .map(({ fechaRegistro: _, ...u }) => u);

  // Process Porra ranking
  const partidos = await prisma.partido.findMany({
    select: {
      equipoLocal: true,
      equipoVisitante: true,
      golesLocalReal: true,
      golesVisitanteReal: true,
      fase: true,
      grupo: true,
    },
  });

  const gruposLetters = [
    ...new Set(partidos.filter(p => p.fase === "GRUPOS").map(p => p.grupo!).filter(Boolean)),
  ].sort();

  const actual = computeActualBracket(partidos);
  const emptyScore = { total: 0, dieciseisavos: 0, octavos: 0, cuartos: 0, semifinal: 0, final: 0, campeon: 0 };
  const emptyCompletion = { done: 0, total: 7 };

  const porraEntries: RankedPorraEntry[] = users
    .map(u => {
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
      const finalists = SF_MATCHES.map(m => picks.resultados?.[m.id]).filter(Boolean) as string[];
      const subcampeon = finalists.find(f => f !== campeon);
      return { user: { id: u.id, name: u.name, image: u.image }, score, completion, campeon, subcampeon };
    })
    .sort((a, b) =>
      b.score.total - a.score.total ||
      b.completion.done - a.completion.done
    );

  // Detect if tournament has started (first match kicked off)
  const firstPartido = await prisma.partido.findFirst({
    orderBy: { fechaPartido: "asc" },
    select: { fechaPartido: true },
  });
  const tournamentStarted =
    !!firstPartido && firstPartido.fechaPartido.getTime() <= Date.now();

  const withBracketDone = users.map((u) => {
    const picks = (u.bracketPicks?.picks ?? {}) as BracketPicks;
    const done = bracketCompletion(picks, gruposLetters).done;
    return { ...u, bracketDone: done };
  });

  const preTournamentQuinielaEntries: PreTournamentEntry[] = [...withBracketDone]
    .sort((a, b) => {
      if (b.pronosticos.length !== a.pronosticos.length)
        return b.pronosticos.length - a.pronosticos.length;
      const ta = a.ultimoAcceso?.getTime() ?? 0;
      const tb = b.ultimoAcceso?.getTime() ?? 0;
      return tb - ta;
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
      if (b.bracketDone !== a.bracketDone)
        return b.bracketDone - a.bracketDone;
      const ta = a.ultimoAcceso?.getTime() ?? 0;
      const tb = b.ultimoAcceso?.getTime() ?? 0;
      return tb - ta;
    })
    .map((u) => ({
      id: u.id,
      name: u.name,
      image: u.image,
      ultimoAcceso: u.ultimoAcceso ? u.ultimoAcceso.toISOString() : null,
      numPronosticos: u.pronosticos.length,
      bracketDone: u.bracketDone,
    }));

  // Compute grupos ranking using already-scored porraEntries
  const userScoreMap = new Map(porraEntries.map(e => [e.user.id, e.score.total]));
  const grupos = await prisma.grupo.findMany({
    include: { miembros: { select: { userId: true } } },
    orderBy: { nombre: "asc" },
  });
  const gruposRanking: GrupoPorraEntry[] = grupos
    .map(g => {
      const scores = g.miembros.map(m => userScoreMap.get(m.userId) ?? 0);
      const total = scores.reduce((s, p) => s + p, 0);
      const numMiembros = scores.length;
      const media = numMiembros > 0 ? total / numMiembros : 0;
      return { id: g.id, nombre: g.nombre, codigo: g.codigo, numMiembros, total, media };
    })
    .sort((a, b) => b.media - a.media || b.total - a.total || a.nombre.localeCompare(b.nombre));

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
        quinielaRanking={quinielaRanking}
        porraEntries={porraEntries}
        gruposRanking={gruposRanking}
        currentUserId={currentUserId}
        tournamentStarted={tournamentStarted}
        preTournamentQuinielaEntries={preTournamentQuinielaEntries}
        preTournamentPorraEntries={preTournamentPorraEntries}
      />
    </div>
  );
}
