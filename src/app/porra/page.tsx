import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { BracketPicks } from "@/lib/bracket";
import { computeActualBracket, scoreBracket, bracketCompletion } from "@/lib/bracket-scoring";
import PorraRanking from "@/components/porra-ranking";
import type { RankedPorraEntry } from "@/components/porra-ranking";

export default async function PorraRankingPage() {
  const session = await auth();
  const currentUserId = session!.user.id;

  const [porraRecords, partidos] = await Promise.all([
    prisma.pronosticoBracket.findMany({
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.partido.findMany({
      select: {
        equipoLocal: true, equipoVisitante: true,
        golesLocalReal: true, golesVisitanteReal: true,
        fase: true, grupo: true,
      },
    }),
  ]);

  const gruposLetters = [
    ...new Set(partidos.filter(p => p.fase === "GRUPOS").map(p => p.grupo!).filter(Boolean)),
  ].sort();

  const actual = computeActualBracket(partidos);
  const tournamentStarted = Object.keys(actual.resultados).length > 0 || actual.terceros.length > 0;

  const entries: RankedPorraEntry[] = porraRecords
    .map(r => {
      const picks = r.picks as BracketPicks;
      const score = scoreBracket(picks, actual);
      const completion = bracketCompletion(picks, gruposLetters);
      const campeon =
        picks.resultados?.["FINAL"] ??
        (picks as Record<string, unknown>).campeon as string | undefined;
      return { user: r.user, score, completion, campeon };
    })
    .sort((a, b) =>
      b.score.total - a.score.total ||
      b.completion.done - a.completion.done
    );

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Clasificación actual</h1>
          <p className="mt-1 text-sm text-gray-500">
            Clasificación del cuadro eliminatorio · haz clic para ver la porra de cada jugador
          </p>
          {!tournamentStarted && (
            <p className="mt-2 text-xs text-gray-600">
              Las puntuaciones empezarán cuando comience el torneo.
            </p>
          )}
        </div>
        <Link
          href="/llaves"
          className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-colors"
        >
          Mi porra →
        </Link>
      </div>

      {/* Scoring legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
        {[
          ["16avos", "1 pt"],
          ["Octavos", "2 pts"],
          ["Cuartos", "5 pts"],
          ["Semis", "7 pts"],
          ["Final", "10 pts"],
          ["Campeón", "10 pts"],
        ].map(([label, pts]) => (
          <span key={label}>{label} <span className="text-gray-700">{pts}</span></span>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="glass-card p-16 text-center space-y-4">
          <p className="text-gray-600 text-sm">Nadie ha rellenado la porra todavía</p>
          <Link href="/llaves" className="inline-block text-sm text-[#00e87a] hover:underline">
            Rellenar mi porra →
          </Link>
        </div>
      ) : (
        <PorraRanking entries={entries} currentUserId={currentUserId} />
      )}
    </div>
  );
}
