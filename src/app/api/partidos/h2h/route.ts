import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team1 = searchParams.get("team1")?.trim();
  const team2 = searchParams.get("team2")?.trim();

  if (!team1 || !team2) {
    return NextResponse.json(
      { error: "Se requieren los parámetros team1 y team2" },
      { status: 400 }
    );
  }

  const partidos = await prisma.partidoHistorico.findMany({
    where: {
      OR: [
        { equipo1: team1, equipo2: team2 },
        { equipo1: team2, equipo2: team1 },
      ],
    },
    orderBy: { fecha: "desc" },
  });

  if (partidos.length === 0) {
    return NextResponse.json({
      partidosJugados: 0,
      victoriasTeam1: 0,
      victoriasTeam2: 0,
      empates: 0,
      golesTotalesTeam1: 0,
      golesTotalesTeam2: 0,
      historial: [],
    });
  }

  let victoriasTeam1 = 0;
  let victoriasTeam2 = 0;
  let empates = 0;
  let golesTotalesTeam1 = 0;
  let golesTotalesTeam2 = 0;

  const historial = partidos.map((p) => {
    // Normalizar para que team1 consultado sea siempre el primer equipo
    const invertido = p.equipo1 === team2;
    const golesT1 = invertido ? p.goles2 : p.goles1;
    const golesT2 = invertido ? p.goles1 : p.goles2;

    golesTotalesTeam1 += golesT1;
    golesTotalesTeam2 += golesT2;

    if (golesT1 > golesT2) victoriasTeam1++;
    else if (golesT2 > golesT1) victoriasTeam2++;
    else empates++;

    return {
      torneo: p.torneo,
      fase: p.fase,
      fecha: p.fecha.toISOString(),
      equipo1: team1,
      equipo2: team2,
      goles1: golesT1,
      goles2: golesT2,
    };
  });

  return NextResponse.json({
    partidosJugados: partidos.length,
    victoriasTeam1,
    victoriasTeam2,
    empates,
    golesTotalesTeam1,
    golesTotalesTeam2,
    historial,
  });
}
