import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lockThreshold = new Date(Date.now() + 15 * 60 * 1000);

  // Partidos que ya pasaron su límite de 15 min y siguen en PROGRAMADO
  const lockedMatches = await prisma.partido.findMany({
    where: { estado: "PROGRAMADO", fechaPartido: { lte: lockThreshold } },
    select: { id: true },
  });

  if (lockedMatches.length === 0) {
    return NextResponse.json({ ok: true, created: 0 });
  }

  const users = await prisma.user.findMany({ select: { id: true } });

  if (users.length === 0) {
    return NextResponse.json({ ok: true, created: 0 });
  }

  const data = lockedMatches.flatMap((match) =>
    users.map((user) => ({
      userId: user.id,
      partidoId: match.id,
      golesLocal: 0,
      golesVisitante: 0,
    }))
  );

  const result = await prisma.pronostico.createMany({ data, skipDuplicates: true });

  console.log(`[cron/default-pronosticos] created=${result.count} matches=${lockedMatches.length} users=${users.length}`);

  return NextResponse.json({ ok: true, created: result.count });
}
