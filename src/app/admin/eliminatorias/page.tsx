import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getFDKnockoutMatches, normalizeTeamName } from "@/lib/football-data";
import EliminatoriasPanel, { type EliminatoriaRow, type DuplicadoPar } from "@/components/admin/eliminatorias-panel";
import type { Fase } from "@prisma/client";
import worldcupData from "../../../../prisma/data/worldcup.json";

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

interface RawMatch {
  round: string;
  num?: number;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
}

function parseUTCMs(date: string, time: string): number {
  const [hhmm, offsetStr] = time.split(" ");
  const [hours, minutes] = hhmm.split(":").map(Number);
  const offsetHours = parseInt(offsetStr.replace("UTC", ""), 10);
  const utcHours = hours - offsetHours;
  const dt = new Date(`${date}T00:00:00Z`);
  dt.setUTCHours(utcHours, minutes, 0, 0);
  return dt.getTime();
}

// Build a lookup of worldcup.json knockout matches: utcMs → {team1, team2, num}
const wjKnockout = (worldcupData as { matches: RawMatch[] }).matches
  .filter((m) => !m.group)
  .map((m) => ({ utcMs: parseUTCMs(m.date, m.time), team1: m.team1, team2: m.team2, num: m.num ?? 0 }));

function closestWjMatch(utcMs: number) {
  let best = wjKnockout[0];
  let bestDiff = Math.abs(wjKnockout[0].utcMs - utcMs);
  for (const m of wjKnockout) {
    const diff = Math.abs(m.utcMs - utcMs);
    if (diff < bestDiff) { bestDiff = diff; best = m; }
  }
  return best;
}

// Find the DB match nearest in time within ±2h
function nearestDb<T extends { fechaPartido: Date }>(list: T[], utcMs: number): T | null {
  const TWO_H = 2 * 60 * 60 * 1000;
  let best: T | null = null;
  let bestDiff = TWO_H;
  for (const p of list) {
    const diff = Math.abs(p.fechaPartido.getTime() - utcMs);
    if (diff < bestDiff) { bestDiff = diff; best = p; }
  }
  return best;
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

    const fdTime = new Date(fdm.utcDate).getTime();
    // Use nearest-in-time match (not just first within ±2h)
    const db = nearestDb(dbPartidos, fdTime);

    const syncLocal = fdHome ?? db?.equipoLocal ?? null;
    const syncAway = fdAway ?? db?.equipoVisitante ?? null;

    const localOk = !fdHome || db?.equipoLocal === fdHome;
    const awayOk = !fdAway || db?.equipoVisitante === fdAway;
    const alreadyUpToDate = !!db && localOk && awayOk;
    const canSync = !!db && !alreadyUpToDate && (!!fdHome || !!fdAway);

    // Original placeholder names from worldcup.json (for potential revert)
    const wj = closestWjMatch(db?.fechaPartido.getTime() ?? fdTime);
    const originalLocal = wj.team1;
    const originalVisitante = wj.team2;

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
      originalLocal,
      originalVisitante,
      canSync,
      alreadyUpToDate,
    };
  });

  // Detect duplicate team name pairs among knockout DB matches
  const duplicados: DuplicadoPar[] = [];
  const seen = new Map<string, (typeof dbPartidos)[0]>();
  for (const p of dbPartidos) {
    const key = `${p.equipoLocal}|${p.equipoVisitante}`;
    const prev = seen.get(key);
    if (prev) {
      // Find placeholder for each using worldcup.json
      const wj1 = closestWjMatch(prev.fechaPartido.getTime());
      const wj2 = closestWjMatch(p.fechaPartido.getTime());
      duplicados.push({
        a: { id: prev.id, equipoLocal: prev.equipoLocal, equipoVisitante: prev.equipoVisitante, fecha: prev.fechaPartido.toISOString(), placeholder: `${wj1.team1} vs ${wj1.team2}` },
        b: { id: p.id, equipoLocal: p.equipoLocal, equipoVisitante: p.equipoVisitante, fecha: p.fechaPartido.toISOString(), placeholder: `${wj2.team1} vs ${wj2.team2}` },
      });
    } else {
      seen.set(key, p);
    }
  }

  return (
    <div className="space-y-5">
      <EliminatoriasPanel rows={rows} error={error} duplicados={duplicados} />
    </div>
  );
}
