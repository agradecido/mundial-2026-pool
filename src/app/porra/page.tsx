import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";
import type { BracketPicks } from "@/lib/bracket";
import { getMundialOdds, buildPairOddsLookup } from "@/lib/odds-api";
import { computeActualBracket, scoreBracket } from "@/lib/bracket-scoring";
import PorraViewer from "@/components/porra-viewer";
import ShareBracketButton from "@/components/share-bracket-button";

export default async function LlavesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [partidos, oddsEvents, allBrackets] = await Promise.all([
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
    getMundialOdds(),
    prisma.pronosticoBracket.findMany({
      select: { userId: true, picks: true },
    }),
  ]);

  const oddsMap = buildPairOddsLookup(oddsEvents);

  // Build groups map from group-stage fixtures
  const gruposMap: Record<string, Set<string>> = {};
  for (const p of partidos.filter(p => p.fase === "GRUPOS")) {
    const g = p.grupo ?? "?";
    gruposMap[g] ??= new Set();
    gruposMap[g].add(p.equipoLocal);
    gruposMap[g].add(p.equipoVisitante);
  }
  const grupos = Object.fromEntries(
    Object.entries(gruposMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, [...v].sort()])
  );

  const actual = computeActualBracket(partidos);

  // User's picks and score
  const userBracket = allBrackets.find(b => b.userId === userId);
  const picks = (userBracket?.picks ?? {}) as BracketPicks;
  const userScore = scoreBracket(picks, actual);

  // Ranking position among all participants with a bracket
  const ranked = allBrackets
    .map(b => ({ userId: b.userId, total: scoreBracket(b.picks as BracketPicks, actual).total }))
    .sort((a, b) => b.total - a.total);

  const rankIdx = ranked.findIndex(b => b.userId === userId);
  const rankPosition = rankIdx >= 0 ? rankIdx + 1 : null;
  const totalParticipants = ranked.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Mi Porra</h1>
          <p className="mt-1 text-sm text-gray-500">Tu bracket del Mundial 2026</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ShareBracketButton userName={session!.user.name ?? "tú"} picks={picks} grupos={grupos} />
          <Link
            href="/porra/ranking"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-colors shrink-0"
          >
            Ranking →
            <LinkSpinner className="size-3 shrink-0" />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 text-center space-y-1">
          <p className="text-3xl font-bold text-[#00e87a]">{userScore.total}</p>
          <p className="text-xs text-gray-500">puntos</p>
        </div>
        <div className="glass-card p-4 text-center space-y-1">
          {rankPosition !== null ? (
            <>
              <p className="text-3xl font-bold text-white">{rankPosition}°</p>
              <p className="text-xs text-gray-500">de {totalParticipants}</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-600">—</p>
              <p className="text-xs text-gray-500">sin bracket</p>
            </>
          )}
        </div>
      </div>

      {/* Static bracket viewer */}
      <PorraViewer picks={picks} grupos={grupos} oddsMap={oddsMap} />
    </div>
  );
}
