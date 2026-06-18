import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface PuntosEntry {
  name: string;
  image: string | null;
  puntosGanados: number;
  golesLocal: number;
  golesVisitante: number;
}

export async function GET(req: NextRequest) {
  const partidoId = new URL(req.url).searchParams.get("partidoId");
  if (!partidoId) return NextResponse.json({ error: "Missing partidoId" }, { status: 400 });

  const rows = await prisma.pronostico.findMany({
    where: { partidoId, puntosGanados: { gt: 0 } },
    select: { puntosGanados: true, golesLocal: true, golesVisitante: true, user: { select: { name: true, image: true } } },
    orderBy: { puntosGanados: "desc" },
  });

  const data: PuntosEntry[] = rows.map((r) => ({
    name: r.user.name ?? "–",
    image: r.user.image,
    puntosGanados: r.puntosGanados,
    golesLocal: r.golesLocal,
    golesVisitante: r.golesVisitante,
  }));

  return NextResponse.json(data);
}
