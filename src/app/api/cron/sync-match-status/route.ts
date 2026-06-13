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

interface FDMatch {
  status: string;
  score: {
    duration: string;
    fullTime: { home: number | null; away: number | null };
  };
  homeTeam: { name: string };
  awayTeam: { name: string };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 503 });

  // 3-day window: yesterday → tomorrow (covers late-night matches and timezone drift)
  const now = new Date();
  const dateFrom = new Date(now.getTime() - 86_400_000).toISOString().split("T")[0];
  const dateTo   = new Date(now.getTime() + 86_400_000).toISOString().split("T")[0];

  const res = await fetch(
    `${BASE_URL}/competitions/WC/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
    { headers: { "X-Auth-Token": apiKey }, cache: "no-store" },
  );
  if (!res.ok) return NextResponse.json({ error: `FD API ${res.status}` }, { status: 502 });

  const { matches } = await res.json() as { matches: FDMatch[] };

  // Only process matches not yet finalized in our DB
  const dbMatches = await prisma.partido.findMany({
    where: { estado: { in: ["PROGRAMADO", "EN_PROGRESO"] } },
    select: { id: true, equipoLocal: true, equipoVisitante: true, estado: true },
  });

  let setLive = 0;
  let setFinished = 0;

  for (const fdm of matches) {
    const homeNorm = norm(fdm.homeTeam.name);
    const awayNorm = norm(fdm.awayTeam.name);

    const dbm = dbMatches.find(
      (m) =>
        (m.equipoLocal === homeNorm && m.equipoVisitante === awayNorm) ||
        (m.equipoLocal === awayNorm  && m.equipoVisitante === homeNorm),
    );
    if (!dbm) continue;

    // Was the match stored with home/away swapped vs FD?
    const swapped = dbm.equipoLocal === awayNorm;

    if (fdm.status === "IN_PLAY" || fdm.status === "PAUSED") {
      if (dbm.estado === "PROGRAMADO") {
        await prisma.partido.update({ where: { id: dbm.id }, data: { estado: "EN_PROGRESO" } });
        setLive++;
      }
    } else if (fdm.status === "FINISHED") {
      const rawHome = fdm.score.fullTime.home;
      const rawAway = fdm.score.fullTime.away;
      if (rawHome === null || rawAway === null) continue;

      // fullTime for PENALTY_SHOOTOUT = score after extra time (correct per quiniela rules)
      const golesLocal     = swapped ? rawAway : rawHome;
      const golesVisitante = swapped ? rawHome : rawAway;

      // Ensure default pronosticos exist before recalculating
      const users = await prisma.user.findMany({ select: { id: true } });
      await prisma.pronostico.createMany({
        data: users.map((u) => ({
          userId: u.id,
          partidoId: dbm.id,
          golesLocal: 0,
          golesVisitante: 0,
        })),
        skipDuplicates: true,
      });

      await prisma.partido.update({
        where: { id: dbm.id },
        data: { estado: "FINALIZADO", golesLocalReal: golesLocal, golesVisitanteReal: golesVisitante },
      });

      await recalcularPuntosPartido(dbm.id);
      setFinished++;
    }
  }

  if (setLive > 0 || setFinished > 0) {
    revalidateTag("ranking", "max");
    revalidatePath("/quiniela");
    revalidatePath("/quiniela/ranking");
    revalidatePath("/ranking");
    revalidatePath("/admin/partidos");
    revalidatePath("/admin/resultados");
  }

  return NextResponse.json({ ok: true, setLive, setFinished });
}
