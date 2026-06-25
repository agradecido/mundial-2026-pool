import { prisma } from "@/lib/prisma";
import {
  D32_MATCHES,
  D16_MATCHES,
  QF_MATCHES,
  SF_MATCHES,
  FINAL_MATCH,
  resolveSlot,
} from "@/lib/bracket";

export interface ResolveResult {
  updated: Array<{ bracketMatchId: string; field: "equipoLocal" | "equipoVisitante"; team: string }>;
  skipped: Array<{ bracketMatchId: string; reason: string }>;
}

const GROUPS = "ABCDEFGHIJKL".split("");

type Stats = { pts: number; gf: number; ga: number; gd: number };

function sortedByStandings(entries: [string, Stats][]): string[] {
  return [...entries]
    .sort(([na, a], [nb, b]) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || na.localeCompare(nb)
    )
    .map(([t]) => t);
}

export async function resolveKnockoutParticipants(): Promise<ResolveResult> {
  const result: ResolveResult = { updated: [], skipped: [] };

  // ── 1. Load group match results ───────────────────────────────────────────
  const gruposPartidos = await prisma.partido.findMany({
    where: { fase: "GRUPOS", golesLocalReal: { not: null }, golesVisitanteReal: { not: null } },
    select: {
      grupo: true,
      equipoLocal: true,
      equipoVisitante: true,
      golesLocalReal: true,
      golesVisitanteReal: true,
    },
  });

  // Count finished matches per group
  const groupFinished: Record<string, number> = {};
  for (const p of gruposPartidos) {
    const g = p.grupo ?? "?";
    groupFinished[g] = (groupFinished[g] ?? 0) + 1;
  }

  // Compute standings — only for groups where all 6 matches are finished
  const groupStatsMap: Record<string, Record<string, Stats>> = {};
  for (const p of gruposPartidos) {
    const g = p.grupo ?? "?";
    if (groupFinished[g] < 6) continue;
    groupStatsMap[g] ??= {};
    const upd = (team: string, gf: number, ga: number) => {
      groupStatsMap[g][team] ??= { pts: 0, gf: 0, ga: 0, gd: 0 };
      groupStatsMap[g][team].pts += gf > ga ? 3 : gf === ga ? 1 : 0;
      groupStatsMap[g][team].gf += gf;
      groupStatsMap[g][team].ga += ga;
      groupStatsMap[g][team].gd += gf - ga;
    };
    upd(p.equipoLocal, p.golesLocalReal!, p.golesVisitanteReal!);
    upd(p.equipoVisitante, p.golesVisitanteReal!, p.golesLocalReal!);
  }

  // Build grupos (1st/2nd) and allGrupos (all teams) for complete groups
  const grupos: Record<string, string[]> = {};
  const allGrupos: Record<string, string[]> = {};
  const thirdCandidates: [string, Stats][] = [];

  for (const [g, stats] of Object.entries(groupStatsMap)) {
    const sorted = sortedByStandings(Object.entries(stats));
    grupos[g] = sorted.slice(0, 2);
    allGrupos[g] = Object.keys(stats);
    if (sorted[2]) thirdCandidates.push([sorted[2], stats[sorted[2]]]);
  }

  // 3rd-place teams only usable once all 12 groups are complete
  const allGroupsDone = GROUPS.every(g => g in groupStatsMap);
  const terceros = allGroupsDone ? sortedByStandings(thirdCandidates).slice(0, 8) : [];

  // ── 2. Load knockout Partidos (indexed by bracketMatchId) ─────────────────
  const knockoutPartidos = await prisma.partido.findMany({
    where: { fase: { not: "GRUPOS" }, bracketMatchId: { not: null } },
    select: {
      id: true,
      bracketMatchId: true,
      equipoLocal: true,
      equipoVisitante: true,
      estado: true,
      golesLocalReal: true,
      golesVisitanteReal: true,
    },
  });

  const byBracketId = new Map(knockoutPartidos.map(p => [p.bracketMatchId!, p]));

  // Build resultados from finished knockout matches
  const resultados: Record<string, string> = {};
  for (const p of knockoutPartidos) {
    if (
      p.estado !== "FINALIZADO" ||
      p.golesLocalReal === null ||
      p.golesVisitanteReal === null
    ) continue;
    resultados[p.bracketMatchId!] =
      p.golesLocalReal >= p.golesVisitanteReal ? p.equipoLocal : p.equipoVisitante;
  }

  // ── 3. Resolve all rounds ─────────────────────────────────────────────────
  const allRoundMatches = [
    ...D32_MATCHES,
    ...D16_MATCHES,
    ...QF_MATCHES,
    ...SF_MATCHES,
    FINAL_MATCH,
  ];

  const updates: Array<{ id: string; equipoLocal?: string; equipoVisitante?: string }> = [];

  for (const match of allRoundMatches) {
    const partido = byBracketId.get(match.id);
    if (!partido) {
      result.skipped.push({ bracketMatchId: match.id, reason: "no Partido encontrado en BD" });
      continue;
    }

    // Never overwrite a finished match
    if (partido.estado === "FINALIZADO") continue;

    const resolvedA = resolveSlot(match.slotA, grupos, terceros, resultados, allGrupos);
    const resolvedB = resolveSlot(match.slotB, grupos, terceros, resultados, allGrupos);

    const patch: { equipoLocal?: string; equipoVisitante?: string } = {};

    if (resolvedA && resolvedA !== partido.equipoLocal) {
      patch.equipoLocal = resolvedA;
      result.updated.push({ bracketMatchId: match.id, field: "equipoLocal", team: resolvedA });
    }
    if (resolvedB && resolvedB !== partido.equipoVisitante) {
      patch.equipoVisitante = resolvedB;
      result.updated.push({ bracketMatchId: match.id, field: "equipoVisitante", team: resolvedB });
    }

    if (Object.keys(patch).length > 0) {
      updates.push({ id: partido.id, ...patch });
    }
  }

  // ── 4. Apply updates ──────────────────────────────────────────────────────
  await Promise.all(
    updates.map(({ id, ...data }) =>
      prisma.partido.update({ where: { id }, data })
    )
  );

  return result;
}
