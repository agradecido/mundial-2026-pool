import { NextRequest, NextResponse } from "next/server";
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

interface FDMatchDetail {
  id: number;
  status: string;
  minute?: number | null;
  score: {
    duration: string;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  goals?: unknown[];
  bookings?: unknown[];
}

async function syncStatus(team1: string, team2: string, fd: FDMatchDetail) {
  const dbm = await prisma.partido.findFirst({
    where: {
      AND: [
        { estado: { not: "FINALIZADO" } },
        {
          OR: [
            { equipoLocal: team1, equipoVisitante: team2 },
            { equipoLocal: team2, equipoVisitante: team1 },
          ],
        },
      ],
    },
    select: { id: true, equipoLocal: true, estado: true },
  });
  if (!dbm) return; // Already finalized or not found

  const swapped = dbm.equipoLocal === team2;

  if (fd.status === "IN_PLAY" || fd.status === "PAUSED") {
    if (dbm.estado === "PROGRAMADO") {
      await prisma.partido.update({ where: { id: dbm.id }, data: { estado: "EN_PROGRESO" } });
    }
  } else if (fd.status === "FINISHED") {
    const home = swapped ? fd.score.fullTime.away : fd.score.fullTime.home;
    const away = swapped ? fd.score.fullTime.home : fd.score.fullTime.away;
    if (home === null || away === null) return;

    const users = await prisma.user.findMany({ select: { id: true } });
    await prisma.pronostico.createMany({
      data: users.map((u) => ({
        userId: u.id, partidoId: dbm.id, golesLocal: 0, golesVisitante: 0,
      })),
      skipDuplicates: true,
    });
    await prisma.partido.update({
      where: { id: dbm.id },
      data: { estado: "FINALIZADO", golesLocalReal: home, golesVisitanteReal: away },
    });
    await recalcularPuntosPartido(dbm.id);

    revalidateTag("ranking", "max");
    revalidatePath("/quiniela");
    revalidatePath("/quiniela/ranking");
    revalidatePath("/ranking");
    revalidatePath("/admin/partidos");
    revalidatePath("/admin/resultados");
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const team1 = searchParams.get("team1");
  const team2 = searchParams.get("team2");
  if (!team1 || !team2) {
    return NextResponse.json({ error: "Missing team params" }, { status: 400 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!apiKey) {
    return NextResponse.json({ error: "API no configurada" }, { status: 503 });
  }

  const now = new Date();
  const dateFrom = new Date(now.getTime() - 86_400_000).toISOString().split("T")[0];
  const dateTo   = new Date(now.getTime() + 86_400_000).toISOString().split("T")[0];

  const listRes = await fetch(
    `${BASE_URL}/competitions/WC/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
    { headers: { "X-Auth-Token": apiKey }, cache: "no-store" },
  );
  if (!listRes.ok) {
    return NextResponse.json({ error: `FD API error ${listRes.status}` }, { status: 502 });
  }

  const { matches } = await listRes.json() as { matches: Array<{ id: number; homeTeam: { name: string }; awayTeam: { name: string } }> };

  const match = matches.find((m) => {
    const home = norm(m.homeTeam.name);
    const away = norm(m.awayTeam.name);
    return (home === team1 && away === team2) || (home === team2 && away === team1);
  });
  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado en la API" }, { status: 404 });
  }

  const matchRes = await fetch(
    `${BASE_URL}/matches/${match.id}`,
    { headers: { "X-Auth-Token": apiKey }, cache: "no-store" },
  );
  if (!matchRes.ok) {
    return NextResponse.json({ error: `FD match error ${matchRes.status}` }, { status: 502 });
  }

  const matchData = await matchRes.json() as FDMatchDetail;

  // Sync status to DB as a side effect (fire-and-forget; errors don't block the response)
  syncStatus(team1, team2, matchData).catch(() => {});

  return NextResponse.json(matchData);
}
