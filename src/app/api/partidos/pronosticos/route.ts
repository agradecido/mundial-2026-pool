import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface PronosticoEntry {
  name: string;
  image: string | null;
  golesLocal: number;
  golesVisitante: number;
}

export async function GET(req: NextRequest) {
  const partidoId = new URL(req.url).searchParams.get("partidoId");
  if (!partidoId) return NextResponse.json({ error: "Missing partidoId" }, { status: 400 });

  const partido = await prisma.partido.findUnique({
    where: { id: partidoId },
    select: { estado: true, fechaPartido: true },
  });
  if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  // Los pronósticos de los demás usuarios permanecen ocultos hasta que empiece el partido.
  const hasStarted = partido.estado !== "PROGRAMADO" || Date.now() >= partido.fechaPartido.getTime();
  if (!hasStarted) return NextResponse.json([]);

  const rows = await prisma.pronostico.findMany({
    where: { partidoId },
    select: {
      golesLocal: true,
      golesVisitante: true,
      user: { select: { name: true, image: true } },
    },
  });

  const data: PronosticoEntry[] = rows.map((r) => ({
    name: r.user.name ?? "–",
    image: r.user.image,
    golesLocal: r.golesLocal,
    golesVisitante: r.golesVisitante,
  }));

  return NextResponse.json(data);
}
