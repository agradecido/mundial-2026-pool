import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";
import PartidosTabs from "@/components/partidos-tabs";
import ResetQuinielaButton from "@/components/reset-quiniela-button";
import { getMundialOdds, buildOddsMap } from "@/lib/odds-api";
import { computeActualBracket } from "@/lib/bracket-scoring";
import { resolveDbCode } from "@/lib/bracket";
import { getConfiguracion } from "@/lib/configuracion";

export default async function PartidosPage() {
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();

  void prisma.user.update({ where: { id: userId }, data: { ultimoAccesoQuiniela: now } });

  const [partidos, pronosticos, oddsEvents, allUsers, userBadge, allPartidosForBracket, configuracion] = await Promise.all([
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
        ganadorPenales: true,
        estado: true, fase: true, grupo: true, fechaPartido: true,
      },
    }),
    getConfiguracion(),
  ]);

  // ── Actual bracket (confirmed qualifiers: complete groups + math-locked teams) ─

  type TeamData = { pts: number; gf: number; gc: number; remainingOpponents: Set<string> };
  const totalPerGroup: Record<string, number> = {};
  const finalizadoPerGroup: Record<string, number> = {};
  const allGruposMap: Record<string, string[]> = {};
  const groupStandings: Record<string, Record<string, TeamData>> = {};
  const groupH2H: Record<string, Map<string, string | null>> = {};

  for (const p of allPartidosForBracket) {
    if (p.fase !== "GRUPOS" || !p.grupo) continue;
    const g = p.grupo;
    totalPerGroup[g] = (totalPerGroup[g] ?? 0) + 1;

    if (!allGruposMap[g]) allGruposMap[g] = [];
    for (const t of [p.equipoLocal, p.equipoVisitante])
      if (!allGruposMap[g].includes(t)) allGruposMap[g].push(t);

    groupStandings[g] ??= {};
    groupH2H[g] ??= new Map();
    groupStandings[g][p.equipoLocal] ??= { pts: 0, gf: 0, gc: 0, remainingOpponents: new Set() };
    groupStandings[g][p.equipoVisitante] ??= { pts: 0, gf: 0, gc: 0, remainingOpponents: new Set() };

    if (p.estado === "FINALIZADO" && p.golesLocalReal !== null && p.golesVisitanteReal !== null) {
      finalizadoPerGroup[g] = (finalizadoPerGroup[g] ?? 0) + 1;
      const gl = p.golesLocalReal, gv = p.golesVisitanteReal;
      const loc = groupStandings[g][p.equipoLocal], vis = groupStandings[g][p.equipoVisitante];
      if (gl > gv) loc.pts += 3; else if (gl < gv) vis.pts += 3; else { loc.pts++; vis.pts++; }
      loc.gf += gl; loc.gc += gv; vis.gf += gv; vis.gc += gl;
      const h2hKey = [p.equipoLocal, p.equipoVisitante].sort().join("|");
      groupH2H[g].set(h2hKey, gl > gv ? p.equipoLocal : gl < gv ? p.equipoVisitante : null);
    } else if (p.estado !== "FINALIZADO") {
      groupStandings[g][p.equipoLocal].remainingOpponents.add(p.equipoVisitante);
      groupStandings[g][p.equipoVisitante].remainingOpponents.add(p.equipoLocal);
    }
  }

  const slotGroupStandings: Record<string, { team: string; pts: number; gd: number; gf: number }[]> = {};
  for (const [grupo, teams] of Object.entries(groupStandings)) {
    slotGroupStandings[grupo] = Object.entries(teams)
      .map(([team, d]) => ({ team, pts: d.pts, gd: d.gf - d.gc, gf: d.gf }))
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.team.localeCompare(b.team);
      });
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

  // Math-confirmed qualifiers from incomplete groups.
  // A rival can only challenge if they can exceed the leader's pts, OR tie on pts
  // when the h2h match hasn't been played yet or the leader didn't win it.
  const canChallenge = (
    leader: string, leaderPts: number,
    other: string, otherData: TeamData,
    h2hMap: Map<string, string | null>
  ): boolean => {
    const maxPtsOther = otherData.pts + 3 * otherData.remainingOpponents.size;
    if (maxPtsOther > leaderPts) return true;
    if (maxPtsOther < leaderPts) return false;
    if (otherData.remainingOpponents.has(leader)) return true;
    const h2hKey = [leader, other].sort().join("|");
    return h2hMap.get(h2hKey) !== leader;
  };

  for (const [grupo, teams] of Object.entries(groupStandings)) {
    if (completeGroups.has(grupo)) continue;
    const h2hMap = groupH2H[grupo] ?? new Map();
    const sorted = Object.entries(teams)
      .map(([team, d]) => ({ team, ...d }))
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        const gdA = a.gf - a.gc, gdB = b.gf - b.gc;
        if (gdB !== gdA) return gdB - gdA;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.team.localeCompare(b.team);
      });

    const first = sorted[0];
    if (sorted.some(t => t.team !== first.team && canChallenge(first.team, first.pts, t.team, t, h2hMap))) continue;

    const second = sorted[1];
    if (!second) { bracketGrupos[grupo] = [first.team]; continue; }
    const secondChallenged = sorted.some(
      t => t.team !== first.team && t.team !== second.team &&
           canChallenge(second.team, second.pts, t.team, t, h2hMap)
    );
    bracketGrupos[grupo] = secondChallenged ? [first.team] : [first.team, second.team];
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
      equipoLocal: resolvedLocal ?? p.equipoLocal,
      equipoVisitante: resolvedVisitante ?? p.equipoVisitante,
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
        slotGroupStandings={slotGroupStandings}
        mostrarPronosticosAntes={configuracion.mostrarPronosticosAntes}
      />
    </div>
  );
}
