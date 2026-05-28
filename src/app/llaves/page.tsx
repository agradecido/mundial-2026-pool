import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LlavesSelector from "@/components/llaves-selector";
import type { BracketPicks } from "@/lib/bracket";

export default async function LlavesPage() {
  const session = await auth();
  const userId = session!.user.id;

  // Build groups map from fixtures
  const partidos = await prisma.partido.findMany({
    where: { fase: "GRUPOS" },
    select: { equipoLocal: true, equipoVisitante: true, grupo: true },
  });

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

  // Lock at first match kickoff
  const first = await prisma.partido.findFirst({ orderBy: { fechaPartido: "asc" } });
  const locked = !!first && Date.now() >= first.fechaPartido.getTime();
  const lockDate = first?.fechaPartido ?? new Date("2026-06-11");

  // Existing bracket picks
  const bracket = await prisma.pronosticoBracket.findUnique({ where: { userId } });
  const picks = (bracket?.picks ?? {}) as BracketPicks;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Porra</h1>
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
        <h2 className="mt-6 text-lg font-semibold text-white">Sistema de puntuación</h2>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white">
          {[
            ["Dieciseisavos", "1 pt"],
            ["Octavos", "2 pts"],
            ["Cuartos", "5 pts"],
            ["Semifinal", "7 pts"],
            ["Final", "10 pts"],
            ["Campeón", "10 pts"],
          ].map(([label, pts]) => (
            <span key={label}>
              {label} <span className="text-gray-500">{pts}</span>
            </span>
          ))}
        </div>
        <h2 className="mt-6 text-lg font-semibold text-white">Cómo rellenar la porra</h2>
        <p className="mt-1 text-xs text-gray-500">1. Selecciona el primero y segundo clasificado de cada grupo</p>
        <p className="mt-1 text-xs text-gray-500">2. Selecciona los 8 mejores terceros</p>
        <p className="mt-1 text-xs text-gray-500">3. Ve ronda a ronda haciendo tus predicciones</p>
      </div>

      <LlavesSelector grupos={grupos} initialPicks={picks} locked={locked} />
    </div>
  );
}
