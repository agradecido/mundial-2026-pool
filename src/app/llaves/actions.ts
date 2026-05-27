"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface BracketPicks {
  grupos?:    Record<string, string[]>; // { A: ["España", "México"], ... }
  terceros?:  string[];                 // 8 best 3rd-place qualifiers
  octavos?:   string[];                 // 16 teams through to round of 16
  cuartos?:   string[];                 // 8 quarter-finalists
  semifinal?: string[];                 // 4 semi-finalists
  final?:     string[];                 // 2 finalists
  campeon?:   string;                   // champion
}

export async function guardarBracket(picks: BracketPicks) {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado" };

  // Lock at first match kickoff
  const first = await prisma.partido.findFirst({ orderBy: { fechaPartido: "asc" } });
  if (first && Date.now() >= first.fechaPartido.getTime()) {
    return { error: "Las llaves están cerradas — el torneo ya ha comenzado" };
  }

  await prisma.pronosticoBracket.upsert({
    where:  { userId: session.user.id },
    update: { picks: picks as object },
    create: { userId: session.user.id, picks: picks as object },
  });

  return { ok: true };
}
