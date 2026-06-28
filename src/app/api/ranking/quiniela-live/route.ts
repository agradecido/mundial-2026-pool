import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularPuntos } from "@/lib/scoring";
import type { Fase } from "@prisma/client";

export type LiveRankingEntry = {
  id: string;
  name: string | null;
  image: string | null;
  total: number;
  delta: number; // extra pts from currently live matches
};

// Module-level cache — shared within the same serverless instance.
// TTL of 30 s so multiple live cards don't hammer the DB / score-live on every render.
let cache: { data: LiveRankingEntry[]; expiresAt: number } | null = null;

export async function GET(req: NextRequest) {
  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.data);
  }

  // 1. EN_PROGRESO matches with all user pronósticos
  const livePartidos = await prisma.partido.findMany({
    where: { estado: "EN_PROGRESO" },
    select: {
      id: true,
      equipoLocal: true,
      equipoVisitante: true,
      fase: true,
      pronosticos: {
        select: { userId: true, golesLocal: true, golesVisitante: true },
      },
    },
  });

  if (livePartidos.length === 0) {
    return NextResponse.json([]);
  }

  // 2. Live scores — reuse the existing score-live route (which has its own 60s cache)
  const origin = req.nextUrl.origin;
  const scoreResults = await Promise.all(
    livePartidos.map(async p => {
      try {
        const res = await fetch(
          `${origin}/api/partidos/score-live?team1=${encodeURIComponent(p.equipoLocal)}&team2=${encodeURIComponent(p.equipoVisitante)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return null;
        const { home, away } = await res.json() as { home: number; away: number };
        return { fase: p.fase as Fase, home, away, pronosticos: p.pronosticos };
      } catch {
        return null;
      }
    }),
  );

  const validScores = scoreResults.filter((r): r is NonNullable<typeof r> => r !== null);

  // 3. Extra projected points per user from live matches
  const extraPoints = new Map<string, number>();
  for (const { fase, home, away, pronosticos } of validScores) {
    for (const pr of pronosticos) {
      const pts = calcularPuntos(
        { golesLocal: pr.golesLocal, golesVisitante: pr.golesVisitante },
        { golesLocal: home, golesVisitante: away },
        fase,
      );
      extraPoints.set(pr.userId, (extraPoints.get(pr.userId) ?? 0) + pts);
    }
  }

  // 4. Base scores from FINALIZADO partidos + predicciones futuras
  const users = await prisma.user.findMany({
    where: { suspendido: false },
    select: {
      id: true,
      name: true,
      image: true,
      fechaRegistro: true,
      pronosticos: {
        where: { partido: { estado: "FINALIZADO" } },
        select: { puntosGanados: true },
      },
      prediccionFutura: {
        select: { puntosCampeon: true, puntosSubcampeon: true },
      },
    },
  });

  // 5. Compute adjusted totals, sort, return top 5
  const ranked: LiveRankingEntry[] = users
    .map(u => {
      const base =
        u.pronosticos.reduce((s, p) => s + p.puntosGanados, 0) +
        (u.prediccionFutura
          ? u.prediccionFutura.puntosCampeon + u.prediccionFutura.puntosSubcampeon
          : 0);
      const delta = extraPoints.get(u.id) ?? 0;
      return { id: u.id, name: u.name, image: u.image, total: base + delta, delta, fechaRegistro: u.fechaRegistro };
    })
    .sort((a, b) => b.total - a.total || a.fechaRegistro.getTime() - b.fechaRegistro.getTime())
    .slice(0, 5)
    .map(({ fechaRegistro: _, ...u }) => u);

  cache = { data: ranked, expiresAt: Date.now() + 30_000 };
  return NextResponse.json(ranked);
}
