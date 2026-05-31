import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";
import type { BracketPicks } from "@/lib/bracket";
import { SF_MATCHES } from "@/lib/bracket";
import { computeActualBracket, scoreBracket, bracketCompletion } from "@/lib/bracket-scoring";
import PorraRanking from "@/components/porra-ranking";
import type { RankedPorraEntry } from "@/components/porra-ranking";
import PreTournamentList from "@/components/pre-tournament-list";
import type { PreTournamentEntry } from "@/components/pre-tournament-list";

export default async function PorraRankingPage() {
  const session = await auth();
  const currentUserId = session!.user.id;

  const [usuarios, partidos] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, name: true, image: true,
        ultimoAcceso: true,
        bracketPicks: true,
        pronosticos: { select: { id: true } },
      },
      orderBy: { fechaRegistro: "asc" },
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

  const emptyScore = { total: 0, dieciseisavos: 0, octavos: 0, cuartos: 0, semifinal: 0, final: 0, campeon: 0 };
  const emptyCompletion = { done: 0, total: 7 };

  const entries: RankedPorraEntry[] = usuarios
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

  const preTournamentEntries: PreTournamentEntry[] = [...usuarios]
    .map(u => {
      const picks = (u.bracketPicks?.picks ?? {}) as BracketPicks;
      return { ...u, bracketDone: bracketCompletion(picks, gruposLetters).done };
    })
    .sort((a, b) => {
      if (b.bracketDone !== a.bracketDone)
        return b.bracketDone - a.bracketDone;
      const ta = a.ultimoAcceso?.getTime() ?? 0;
      const tb = b.ultimoAcceso?.getTime() ?? 0;
      return tb - ta;
    })
    .map(u => ({
      id: u.id,
      name: u.name,
      image: u.image,
      ultimoAcceso: u.ultimoAcceso ? u.ultimoAcceso.toISOString() : null,
      numPronosticos: u.pronosticos.length,
      bracketDone: u.bracketDone,
    }));

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Ranking Porra</h1>
          <p className="mt-1 text-sm text-gray-500">
            Clasificación del bracket completo
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href="/porra/stats"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-colors"
          >
            📊 Consenso
            <LinkSpinner className="size-3 shrink-0" />
          </Link>
          <Link
            href="/porra"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-colors"
          >
            Mi porra →
            <LinkSpinner className="size-3 shrink-0" />
          </Link>
        </div>
      </div>

      {!tournamentStarted ? (
        <PreTournamentList
          entries={preTournamentEntries}
          currentUserId={currentUserId}
          mode="porra"
          subtitle="El ranking se mostrará cuando empiece el Mundial. Participantes ordenados por secciones de porra completadas."
        />
      ) : entries.length === 0 ? (
        <div className="glass-card p-16 text-center space-y-4">
          <p className="text-gray-600 text-sm">Nadie ha rellenado la porra todavía</p>
          <Link href="/porra" className="inline-flex items-center gap-2 text-sm text-[#00e87a] hover:underline">
            Rellenar mi porra →
            <LinkSpinner className="size-3.5 shrink-0" />
          </Link>
        </div>
      ) : (
        <PorraRanking entries={entries} currentUserId={currentUserId} />
      )}

    </div>
  );
}
