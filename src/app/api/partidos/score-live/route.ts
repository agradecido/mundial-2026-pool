import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalcularPuntosPartido } from "@/lib/scoring";
import { revalidatePath, revalidateTag } from "next/cache";
import { fetchLiveScore, type ScoreData } from "@/lib/football-data";

// Runs on every request (not cached) — updates DB estado when FD shows a transition
async function syncMatchState(team1: string, team2: string, score: ScoreData) {
  const { status, home, away } = score;
  if (status !== "IN_PLAY" && status !== "PAUSED" && status !== "FINISHED") return;

  const dbm = await prisma.partido.findFirst({
    where: {
      estado: { not: "FINALIZADO" },
      OR: [
        { equipoLocal: team1, equipoVisitante: team2 },
        { equipoLocal: team2, equipoVisitante: team1 },
      ],
    },
    select: { id: true, equipoLocal: true, estado: true },
  });
  if (!dbm) return;

  if (status === "IN_PLAY" || status === "PAUSED") {
    if (dbm.estado === "PROGRAMADO") {
      await prisma.partido.update({ where: { id: dbm.id }, data: { estado: "EN_PROGRESO" } });
      revalidatePath("/quiniela");
    }
    return;
  }

  // FINISHED
  const swapped = dbm.equipoLocal === team2;
  const golesLocal     = swapped ? away : home;
  const golesVisitante = swapped ? home : away;

  const users = await prisma.user.findMany({ select: { id: true } });
  await prisma.pronostico.createMany({
    data: users.map((u) => ({ userId: u.id, partidoId: dbm.id, golesLocal: 0, golesVisitante: 0 })),
    skipDuplicates: true,
  });
  await prisma.partido.update({
    where: { id: dbm.id },
    data: { estado: "FINALIZADO", golesLocalReal: golesLocal, golesVisitanteReal: golesVisitante },
  });
  await recalcularPuntosPartido(dbm.id);

  revalidateTag("ranking", "max");
  revalidatePath("/quiniela");
  revalidatePath("/quiniela/ranking");
  revalidatePath("/ranking");
  revalidatePath("/admin/partidos");
  revalidatePath("/admin/resultados");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const team1 = searchParams.get("team1");
  const team2 = searchParams.get("team2");
  if (!team1 || !team2) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const score = await fetchLiveScore(team1, team2);
  if (!score) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Sync DB estado as a side effect — does not block the response
  syncMatchState(team1, team2, score).catch(() => {});

  return NextResponse.json({ home: score.home, away: score.away });
}
