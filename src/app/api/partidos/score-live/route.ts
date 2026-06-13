import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { recalcularPuntosPartido } from "@/lib/scoring";
import { revalidatePath, revalidateTag } from "next/cache";

const BASE_URL = "https://api.football-data.org/v4";

const FD_TO_DB: Record<string, string> = {
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Congo DR": "DR Congo",
  "Korea Republic": "South Korea",
  "United States": "USA",
  "Cape Verde Islands": "Cape Verde",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Czechia": "Czech Republic",
};
function norm(name: string) { return FD_TO_DB[name] ?? name; }

type ScoreData = { home: number; away: number; status: string };

// Cached 60s so concurrent users share one FD API call per live match
const fetchLiveScore = unstable_cache(
  async (team1: string, team2: string): Promise<ScoreData | null> => {
    const apiKey = process.env.FOOTBALL_DATA_API_TOKEN;
    if (!apiKey) return null;

    const now = new Date();
    const dateFrom = new Date(now.getTime() - 86_400_000).toISOString().split("T")[0];
    const dateTo   = new Date(now.getTime() + 86_400_000).toISOString().split("T")[0];

    const res = await fetch(
      `${BASE_URL}/competitions/WC/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      { headers: { "X-Auth-Token": apiKey }, cache: "no-store" },
    );
    if (!res.ok) return null;

    const { matches } = await res.json() as {
      matches: Array<{
        status: string;
        homeTeam: { name: string };
        awayTeam: { name: string };
        score: { fullTime: { home: number | null; away: number | null } };
      }>;
    };

    const match = matches.find((m) => {
      const home = norm(m.homeTeam.name);
      const away = norm(m.awayTeam.name);
      return (home === team1 && away === team2) || (home === team2 && away === team1);
    });
    if (!match) return null;

    const swapped = norm(match.homeTeam.name) === team2;
    const rawHome = match.score.fullTime.home ?? 0;
    const rawAway = match.score.fullTime.away ?? 0;

    return {
      home: swapped ? rawAway : rawHome,
      away: swapped ? rawHome : rawAway,
      status: match.status,
    };
  },
  ["score-live"],
  { revalidate: 60 },
);

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
