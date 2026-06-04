import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";
import GrupoInviteModal from "@/components/grupo-invite-modal";
import type { BracketPicks } from "@/lib/bracket";
import { SF_MATCHES } from "@/lib/bracket";
import { computeActualBracket, scoreBracket, bracketCompletion } from "@/lib/bracket-scoring";
import PorraRanking from "@/components/porra-ranking";
import type { RankedPorraEntry } from "@/components/porra-ranking";
import PreTournamentWithModal from "@/components/pre-tournament-with-modal";
import type { PreTournamentEntry } from "@/components/pre-tournament-list";

export default async function GrupoPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=/grupo/${codigo}`);

  const grupo = await prisma.grupo.findUnique({
    where: { codigo },
    include: {
      miembros: { select: { userId: true } },
    },
  });
  if (!grupo) notFound();

  const isMember = grupo.miembros.some((m) => m.userId === session.user.id);
  if (!isMember) redirect(`/grupo/${codigo}/unirse`);

  const memberIds = grupo.miembros.map((m) => m.userId);

  const [usuarios, partidos] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: memberIds } },
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
      if (b.bracketDone !== a.bracketDone) return b.bracketDone - a.bracketDone;
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

  const isCreador = grupo.creadorId === session.user.id;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/grupos" className="hover:text-white transition-colors">Mis Grupos</Link>
            <span>/</span>
            <span>{grupo.nombre}</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{grupo.nombre}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {memberIds.length} {memberIds.length === 1 ? "participante" : "participantes"}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {isCreador && !tournamentStarted && (
            <GrupoInviteModal codigo={codigo} />
          )}
          {isCreador && (
            <Link
              href={`/grupo/${codigo}/ajustes`}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-gray-500 hover:border-white/20 hover:text-white transition-colors"
              title="Ajustes del grupo"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              <LinkSpinner className="size-3 shrink-0" />
            </Link>
          )}
        </div>
      </div>

      {!tournamentStarted ? (
        <PreTournamentWithModal
          entries={preTournamentEntries}
          currentUserId={session.user.id}
          mode="porra"
          subtitle="El ranking se mostrará cuando empiece el Mundial."
        />
      ) : entries.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <p className="text-gray-600 text-sm">Nadie ha rellenado la porra todavía</p>
        </div>
      ) : (
        <PorraRanking entries={entries} currentUserId={session.user.id} />
      )}
    </div>
  );
}
