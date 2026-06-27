import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";
import PartidosTabs from "@/components/partidos-tabs";
import ResetQuinielaButton from "@/components/reset-quiniela-button";
import { getMundialOdds, buildOddsMap } from "@/lib/odds-api";
import { computeActualBracket } from "@/lib/bracket-scoring";
import { resolveDbCode } from "@/lib/bracket";

export default async function PartidosPage() {
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();

  void prisma.user.update({ where: { id: userId }, data: { ultimoAccesoQuiniela: now } });

  const [partidos, pronosticos, oddsEvents, allUsers, userBadge, allPartidosForBracket] = await Promise.all([
    prisma.partido.findMany({ orderBy: { fechaPartido: "asc" } }),
    prisma.pronostico.findMany({ where: { userId } }),
    getMundialOdds(),
    prisma.user.findMany({
      where: { suspendido: false },
      select: {
        id: true,
        name: true,
        fechaRegistro: true,
        pronosticos: { select: { puntosGanados: true } },
        prediccionFutura: { select: { puntosCampeon: true, puntosSubcampeon: true } },
      },
    }),
    prisma.badgeUsuario.findUnique({ where: { userId } }),
    prisma.partido.findMany({
      select: {
        equipoLocal: true, equipoVisitante: true,
        golesLocalReal: true, golesVisitanteReal: true,
        estado: true, fase: true, grupo: true, fechaPartido: true,
      },
    }),
  ]);

  // ── Actual bracket (confirmed qualifiers: complete groups + math-locked teams) ─

  type TeamData = { pts: number; remaining: number };
  const totalPerGroup: Record<string, number> = {};
  const finalizadoPerGroup: Record<string, number> = {};
  const allGruposMap: Record<string, string[]> = {};
  const groupStandings: Record<string, Record<string, TeamData>> = {};

  for (const p of allPartidosForBracket) {
    if (p.fase !== "GRUPOS" || !p.grupo) continue;
    const g = p.grupo;
    totalPerGroup[g] = (totalPerGroup[g] ?? 0) + 1;

    if (!allGruposMap[g]) allGruposMap[g] = [];
    for (const t of [p.equipoLocal, p.equipoVisitante])
      if (!allGruposMap[g].includes(t)) allGruposMap[g].push(t);

    groupStandings[g] ??= {};
    groupStandings[g][p.equipoLocal] ??= { pts: 0, remaining: 0 };
    groupStandings[g][p.equipoVisitante] ??= { pts: 0, remaining: 0 };

    if (p.estado === "FINALIZADO" && p.golesLocalReal !== null && p.golesVisitanteReal !== null) {
      finalizadoPerGroup[g] = (finalizadoPerGroup[g] ?? 0) + 1;
      const gl = p.golesLocalReal, gv = p.golesVisitanteReal;
      if (gl > gv) groupStandings[g][p.equipoLocal].pts += 3;
      else if (gl < gv) groupStandings[g][p.equipoVisitante].pts += 3;
      else { groupStandings[g][p.equipoLocal].pts++; groupStandings[g][p.equipoVisitante].pts++; }
    } else if (p.estado !== "FINALIZADO") {
      groupStandings[g][p.equipoLocal].remaining++;
      groupStandings[g][p.equipoVisitante].remaining++;
    }
  }

  const completeGroups = new Set(
    Object.entries(totalPerGroup)
      .filter(([g, total]) => (finalizadoPerGroup[g] ?? 0) >= total)
      .map(([g]) => g)
  );
  const pastPartidos = allPartidosForBracket.filter(p => p.fechaPartido <= now);
  const rawBracket = computeActualBracket(pastPartidos);

  // Exact qualifiers for finished groups
  const bracketGrupos = Object.fromEntries(
    Object.entries(rawBracket.grupos).filter(([g]) => completeGroups.has(g))
  );

  // Add mathematically confirmed qualifiers from incomplete groups.
  // 1st is confirmed only if no other team can reach or tie their points.
  // 2nd is confirmed only if 1st is confirmed AND no remaining team can reach or tie 2nd's points.
  for (const [grupo, teams] of Object.entries(groupStandings)) {
    if (completeGroups.has(grupo)) continue;
    const sorted = Object.entries(teams)
      .map(([team, d]) => ({ team, ...d }))
      .sort((a, b) => b.pts - a.pts);
    const maxPts = (t: (typeof sorted)[0]) => t.pts + 3 * t.remaining;

    const first = sorted[0];
    if (sorted.some(t => t.team !== first.team && maxPts(t) >= first.pts)) continue;

    const second = sorted[1];
    if (!second) { bracketGrupos[grupo] = [first.team]; continue; }
    const second2ndChallenged = sorted.some(
      t => t.team !== first.team && t.team !== second.team && maxPts(t) >= second.pts
    );
    bracketGrupos[grupo] = second2ndChallenged ? [first.team] : [first.team, second.team];
  }

  const teamToGroup: Record<string, string> = {};
  for (const [g, ts] of Object.entries(allGruposMap)) for (const t of ts) teamToGroup[t] = g;
  const bracketTerceros = rawBracket.terceros.filter(t => completeGroups.has(teamToGroup[t] ?? ""));
  const actualBracket = { ...rawBracket, grupos: bracketGrupos, terceros: bracketTerceros };

  // Ranking position (mismo criterio que quiniela/ranking)
  const scored = allUsers
    .map(u => {
      const total = u.pronosticos.reduce((s, p) => s + p.puntosGanados, 0)
        + (u.prediccionFutura ? u.prediccionFutura.puntosCampeon + u.prediccionFutura.puntosSubcampeon : 0);
      const exactos = u.pronosticos.filter(p => p.puntosGanados === 5 || p.puntosGanados === 10).length;
      const tendencias = u.pronosticos.filter(p => p.puntosGanados === 3 || p.puntosGanados === 6).length;
      return { id: u.id, total, exactos, tendencias, fechaRegistro: u.fechaRegistro };
    })
    .sort((a, b) =>
      b.total - a.total || b.exactos - a.exactos || b.tendencias - a.tendencias ||
      a.fechaRegistro.getTime() - b.fechaRegistro.getTime()
    );

  const rankIdx = scored.findIndex(u => u.id === userId);
  const rankPosition = rankIdx >= 0 ? rankIdx + 1 : null;
  const userPts = rankIdx >= 0 ? scored[rankIdx].total : 0;

  const pronosticoMap = Object.fromEntries(
    pronosticos.map((p) => [p.partidoId, { golesLocal: p.golesLocal, golesVisitante: p.golesVisitante, puntosGanados: p.puntosGanados }])
  );

  const oddsByTeams = buildOddsMap(oddsEvents);
  const oddsMap: Record<string, { home: number; draw: number; away: number }> = {};
  for (const p of partidos) {
    const odds = oddsByTeams.get(`${p.equipoLocal}|${p.equipoVisitante}`);
    if (odds) oddsMap[p.id] = odds;
  }

  // Detect DB slot codes (e.g. "1E", "2B", "W74", "3A/B/C/D/F")
  // vs. real team names already entered by an admin.
  const isSlotCode = (name: string) =>
    /^\d/.test(name) || name.includes("/") || /^[WL]\d/.test(name);

  const serializedPartidos = partidos.flatMap((p) => {
    const base = { ...p, fechaPartido: p.fechaPartido.toISOString() };
    if (p.fase === "GRUPOS") return [base];

    const localIsSlot = isSlotCode(p.equipoLocal);
    const visitanteIsSlot = isSlotCode(p.equipoVisitante);

    // Both are already real team names (admin updated) — show as-is
    if (!localIsSlot && !visitanteIsSlot) return [base];

    // Resolve whichever slots we can; keep real names unchanged
    const resolvedLocal = localIsSlot
      ? resolveDbCode(p.equipoLocal, actualBracket)
      : p.equipoLocal;
    const resolvedVisitante = visitanteIsSlot
      ? resolveDbCode(p.equipoVisitante, actualBracket)
      : p.equipoVisitante;

    // Skip only if every slot is still unresolved
    if (resolvedLocal === undefined && resolvedVisitante === undefined) return [];

    return [{
      ...base,
      equipoLocal: resolvedLocal ?? "Por definir",
      equipoVisitante: resolvedVisitante ?? "Por definir",
    }];
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">Quiniela</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/quiniela/ranking"
            className="inline-flex items-center gap-2 rounded-lg border border-[#00e87a]/40 bg-[#00e87a]/15 px-3 py-1.5 text-xs text-[#00e87a] hover:bg-[#00e87a]/25 hover:border-[#00e87a]/60 transition-colors"
          >
            {rankPosition !== null ? `${rankPosition}º · ${userPts} pts` : "Ranking"}
            <LinkSpinner className="size-3 shrink-0" />
          </Link>
          <ResetQuinielaButton />
        </div>
      </div>

      <PartidosTabs
        partidos={serializedPartidos}
        pronosticoMap={pronosticoMap}
        oddsMap={oddsMap}
        userBadge={userBadge ? { emoji: userBadge.emoji, titulo: userBadge.titulo, descripcion: userBadge.descripcion } : null}
      />
    </div>
  );
}
