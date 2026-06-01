import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LlavesSelector from "@/components/llaves-selector";
import ShareBracketButton from "@/components/share-bracket-button";
import type { BracketPicks } from "@/lib/bracket";
import { getMundialOdds, buildPairOddsLookup } from "@/lib/odds-api";

export default async function LlavesPage() {
  const session = await auth();
  const userId = session!.user.id;

  // Build groups map from fixtures
  const [partidos, oddsEvents] = await Promise.all([
    prisma.partido.findMany({
      where: { fase: "GRUPOS" },
      select: { equipoLocal: true, equipoVisitante: true, grupo: true },
    }),
    getMundialOdds(),
  ]);

  const oddsMap = buildPairOddsLookup(oddsEvents);

  const gruposMap: Record<string, Set<string>> = {};
  for (const p of partidos) {
    const g = p.grupo ?? "?";
    gruposMap[g] ??= new Set();
    gruposMap[g].add(p.equipoLocal);
    gruposMap[g].add(p.equipoVisitante);
  }
  const grupos = Object.fromEntries(
    Object.entries(gruposMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, [...v].sort()])
  );

  // Lock 15 minutes before first match
  const first = await prisma.partido.findFirst({ orderBy: { fechaPartido: "asc" } });
  const now = new Date();
  const limite = first ? new Date(first.fechaPartido.getTime() - 15 * 60 * 1000) : null;
  const locked = !!limite && now >= limite;
  const lockDate = limite ?? new Date("2026-06-11");

  // Existing bracket picks
  const bracket = await prisma.pronosticoBracket.findUnique({ where: { userId } });
  const picks = (bracket?.picks ?? {}) as BracketPicks;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-white tracking-tight">Porra</h1>
          <ShareBracketButton userName={session!.user.name ?? "tú"} />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Predice el camino al título · cierra el{" "}
          {lockDate.toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Madrid",
          })}
        </p>
        <p className="mt-0.5 text-xs text-gray-600">
          Puedes modificar tu porra hasta 15 minutos antes del inicio del mundial
        </p>
      </div>

      <LlavesSelector grupos={grupos} initialPicks={picks} locked={locked} oddsMap={oddsMap} />
    </div>
  );
}
