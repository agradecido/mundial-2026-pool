"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { BracketPicks } from "@/lib/bracket";
import type { BracketScore } from "@/lib/bracket-scoring";
import { computeActualBracket, scoreBracket } from "@/lib/bracket-scoring";

export type UserBracketData = {
  user: { id: string; name: string | null; image: string | null };
  picks: BracketPicks;
  score: BracketScore;
  actual: { grupos: Record<string, string[]>; terceros: string[]; resultados: Record<string, string>; allGrupos: Record<string, string[]> };
  gruposLetters: string[];
};

export async function getUserBracket(userId: string): Promise<UserBracketData> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const [record, partidos] = await Promise.all([
    prisma.pronosticoBracket.findUniqueOrThrow({
      where: { userId },
      include: { user: { select: { id: true, name: true, image: true } } },
    }),
    prisma.partido.findMany({
      select: {
        equipoLocal: true, equipoVisitante: true,
        golesLocalReal: true, golesVisitanteReal: true,
        fase: true, grupo: true,
      },
    }),
  ]);

  const picks = record.picks as BracketPicks;
  const actual = computeActualBracket(partidos);
  const score = scoreBracket(picks, actual);
  const gruposLetters = [
    ...new Set(
      partidos.filter(p => p.fase === "GRUPOS").map(p => p.grupo!).filter(Boolean)
    ),
  ].sort();

  return { user: record.user, picks, score, actual, gruposLetters };
}
