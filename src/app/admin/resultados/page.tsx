import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getFDMatches, normalizeTeamName } from "@/lib/football-data";
import ResultadosPanel, { type MatchRow } from "@/components/admin/resultados-panel";

export const dynamic = "force-dynamic";

export default async function AdminResultadosPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "EDITOR") redirect("/");

  const [{ matches: fdMatches, error }, partidos] = await Promise.all([
    getFDMatches(),
    prisma.partido.findMany({ orderBy: { fechaPartido: "asc" } }),
  ]);

  const rows: MatchRow[] = fdMatches.map((fdMatch) => {
    const homeName = normalizeTeamName(fdMatch.homeTeam.name ?? "");
    const awayName = normalizeTeamName(fdMatch.awayTeam.name ?? "");

    // Intentar match por nombre de equipo primero
    let partido = partidos.find(
      (p) => p.equipoLocal === homeName && p.equipoVisitante === awayName
    );

    // Si no hay match por nombre (rondas eliminatorias con placeholders), buscar por fecha
    if (!partido) {
      const fdTime = new Date(fdMatch.utcDate).getTime();
      partido = partidos.find((p) => Math.abs(p.fechaPartido.getTime() - fdTime) < 2 * 60 * 60 * 1000);
    }

    const fdGolesLocal = fdMatch.score.fullTime.home;
    const fdGolesVisitante = fdMatch.score.fullTime.away;
    const isFinished = fdMatch.status === "FINISHED";

    const alreadyImported =
      !!partido &&
      partido.estado === "FINALIZADO" &&
      partido.golesLocalReal === fdGolesLocal &&
      partido.golesVisitanteReal === fdGolesVisitante;

    const canImport =
      isFinished &&
      !!partido &&
      !alreadyImported &&
      fdGolesLocal !== null &&
      fdGolesVisitante !== null;

    return {
      fdId: fdMatch.id,
      utcDate: fdMatch.utcDate,
      homeTeamFD: fdMatch.homeTeam.name ?? "",
      awayTeamFD: fdMatch.awayTeam.name ?? "",
      homeTeamNorm: homeName,
      awayTeamNorm: awayName,
      fdStatus: fdMatch.status,
      fdGolesLocal,
      fdGolesVisitante,
      fdDuration: fdMatch.score.duration,
      nuestroPartidoId: partido?.id ?? null,
      nuestroEquipoLocal: partido?.equipoLocal ?? null,
      nuestroEquipoVisitante: partido?.equipoVisitante ?? null,
      nuestroGolesLocal: partido?.golesLocalReal ?? null,
      nuestroGolesVisitante: partido?.golesVisitanteReal ?? null,
      nuestroEstado: partido?.estado ?? null,
      alreadyImported,
      canImport,
    };
  });

  return (
    <div className="space-y-5">
      <ResultadosPanel rows={rows} error={error} />
    </div>
  );
}
