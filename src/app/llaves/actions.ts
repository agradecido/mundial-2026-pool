"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { BracketPicks } from "@/lib/bracket";

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
