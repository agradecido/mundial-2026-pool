import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getFDKnockoutMatches, normalizeTeamName } from "@/lib/football-data";
import EliminatoriasPanel, { type EliminatoriaRow } from "@/components/admin/eliminatorias-panel";
import type { Fase } from "@prisma/client";

export const dynamic = "force-dynamic";

const FD_STAGE_TO_FASE: Record<string, string> = {
  LAST_32: "Dieciseisavos",
  LAST_16: "Octavos",
  QUARTER_FINALS: "Cuartos",
  SEMI_FINALS: "Semifinal",
  THIRD_PLACE: "3.er puesto",
  FINAL: "Final",
};

const KNOCKOUT_FASES: Fase[] = [
  "DIECISEISAVOS",
  "OCTAVOS",
  "CUARTOS",
  "SEMIFINAL",
  "TERCER_PUESTO",
  "FINAL",
];

function isPlaceholder(name: string): boolean {
  return /^\d/.test(name) || name.includes("/") || /^[WL]\d/.test(name);
}

export default async function AdminEliminatoriasPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const [{ matches: fdMatches, error }, dbPartidos] = await Promise.all([
    getFDKnockoutMatches(),
    prisma.partido.findMany({
      where: { fase: { in: KNOCKOUT_FASES } },
      orderBy: { fechaPartido: "asc" },
    }),
  ]);

  const rows: EliminatoriaRow[] = fdMatches.map((fdm) => {
    const fdHome = fdm.homeTeam.name ? normalizeTeamName(fdm.homeTeam.name) : null;
    const fdAway = fdm.awayTeam.name ? normalizeTeamName(fdm.awayTeam.name) : null;

    // Match by date (±2 hours), since DB has placeholder names
    const fdTime = new Date(fdm.utcDate).getTime();
    const db = dbPartidos.find(
      (p) => Math.abs(p.fechaPartido.getTime() - fdTime) < 2 * 60 * 60 * 1000,
    ) ?? null;

    // Effective values to write: use API team if confirmed, keep DB value otherwise
    const syncLocal = fdHome ?? db?.equipoLocal ?? null;
    const syncAway = fdAway ?? db?.equipoVisitante ?? null;

    // Up to date: all API-confirmed teams already match what's in DB
    const localOk = !fdHome || db?.equipoLocal === fdHome;
    const awayOk = !fdAway || db?.equipoVisitante === fdAway;
    const alreadyUpToDate = !!db && localOk && awayOk;

    // Can sync: DB exists, at least one API team is confirmed, and something would change
    const canSync = !!db && !alreadyUpToDate && (!!fdHome || !!fdAway);

    return {
      fdId: fdm.id,
      utcDate: fdm.utcDate,
      fdStage: fdm.stage,
      faseLabel: FD_STAGE_TO_FASE[fdm.stage] ?? fdm.stage,
      fdHomeTeam: fdHome,
      fdAwayTeam: fdAway,
      fdStatus: fdm.status,
      dbPartidoId: db?.id ?? null,
      dbEquipoLocal: db?.equipoLocal ?? null,
      dbEquipoVisitante: db?.equipoVisitante ?? null,
      dbEstado: db?.estado ?? null,
      syncEquipoLocal: syncLocal,
      syncEquipoVisitante: syncAway,
      canSync,
      alreadyUpToDate,
    };
  });

  return (
    <div className="space-y-5">
      <EliminatoriasPanel rows={rows} error={error} />
    </div>
  );
}
