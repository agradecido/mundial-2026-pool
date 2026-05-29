"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { BracketPicks } from "@/lib/bracket";
import { computeActualBracket, scoreBracket, type BracketScore, type ActualBracket } from "@/lib/bracket-scoring";

export interface UserBracketData {
  user: {
    name: string | null;
    image: string | null;
  };
  picks: BracketPicks;
  score: BracketScore;
  actual: ActualBracket;
}

export async function guardarBracket(picks: BracketPicks) {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado" };

  // Lock at first match kickoff
  const first = await prisma.partido.findFirst({ orderBy: { fechaPartido: "asc" } });
  if (first && Date.now() >= first.fechaPartido.getTime()) {
    return { error: "La porra está cerrada — el torneo ya ha comenzado" };
  }

  await prisma.pronosticoBracket.upsert({
    where: { userId: session.user.id },
    update: { picks: picks as object },
    create: { userId: session.user.id, picks: picks as object },
  });

  return { ok: true };
}

export async function getUserBracket(userId: string): Promise<UserBracketData> {
  const [user, partidos] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        image: true,
        bracketPicks: true,
      },
    }),
    prisma.partido.findMany({
      select: {
        equipoLocal: true,
        equipoVisitante: true,
        golesLocalReal: true,
        golesVisitanteReal: true,
        fase: true,
        grupo: true,
      },
    }),
  ]);

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  const picks = (user.bracketPicks?.picks ?? {}) as BracketPicks;
  const actual = computeActualBracket(partidos);
  const score = scoreBracket(picks, actual);

  return {
    user: {
      name: user.name,
      image: user.image,
    },
    picks,
    score,
    actual,
  };
}
