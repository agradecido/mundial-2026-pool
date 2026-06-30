import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getFlag } from "@/lib/flags";
import type { BracketPicks } from "@/lib/bracket";
import { computeActualBracket } from "@/lib/bracket-scoring";
import { resolveDbCode } from "@/lib/bracket";
import BracketTree from "@/components/bracket-tree";

type Stats = {
  team: string;
  pj: number; pg: number; pe: number; pp: number;
  gf: number; gc: number; pts: number;
};

type GrupoData = { letra: string; equipos: Stats[] };
type MatchResult = { local: string; visitante: string; gl: number; gv: number };

function sortGroupTeams(teams: Stats[], matches: MatchResult[]): Stats[] {
  const byPoints = new Map<number, Stats[]>();
  for (const t of teams) {
    const tier = byPoints.get(t.pts) ?? [];
    tier.push(t);
    byPoints.set(t.pts, tier);
  }
  const result: Stats[] = [];
  for (const pts of [...byPoints.keys()].sort((a, b) => b - a)) {
    const tier = byPoints.get(pts)!;
    if (tier.length === 1) { result.push(tier[0]); continue; }

    const tiedSet = new Set(tier.map(t => t.team));
    const h2h: Record<string, { pts: number; gf: number; gc: number }> = {};
    for (const t of tier) h2h[t.team] = { pts: 0, gf: 0, gc: 0 };
    for (const m of matches) {
      if (!tiedSet.has(m.local) || !tiedSet.has(m.visitante)) continue;
      h2h[m.local].gf += m.gl; h2h[m.local].gc += m.gv;
      h2h[m.visitante].gf += m.gv; h2h[m.visitante].gc += m.gl;
      if (m.gl > m.gv) h2h[m.local].pts += 3;
      else if (m.gl < m.gv) h2h[m.visitante].pts += 3;
      else { h2h[m.local].pts++; h2h[m.visitante].pts++; }
    }

    result.push(
      ...[...tier].sort((a, b) => {
        const ha = h2h[a.team], hb = h2h[b.team];
        if (hb.pts !== ha.pts) return hb.pts - ha.pts;
        const h2hGdA = ha.gf - ha.gc, h2hGdB = hb.gf - hb.gc;
        if (h2hGdB !== h2hGdA) return h2hGdB - h2hGdA;
        if (hb.gf !== ha.gf) return hb.gf - ha.gf;
        const gdA = a.gf - a.gc, gdB = b.gf - b.gc;
        if (gdB !== gdA) return gdB - gdA;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.team.localeCompare(b.team);
      })
    );
  }
  return result;
}

const getClasificacion = unstable_cache(
  async (): Promise<GrupoData[]> => {
    const partidos = await prisma.partido.findMany({
      where: { fase: "GRUPOS" },
      select: {
        equipoLocal: true,
        equipoVisitante: true,
        golesLocalReal: true,
        golesVisitanteReal: true,
        estado: true,
        grupo: true,
      },
    });

    const groups: Record<string, Record<string, Stats>> = {};
    const groupMatches: Record<string, MatchResult[]> = {};

    for (const p of partidos) {
      if (!p.grupo) continue;
      if (!groups[p.grupo]) groups[p.grupo] = {};
      if (!groupMatches[p.grupo]) groupMatches[p.grupo] = [];

      const init = (t: string): Stats => ({ team: t, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 });
      if (!groups[p.grupo][p.equipoLocal]) groups[p.grupo][p.equipoLocal] = init(p.equipoLocal);
      if (!groups[p.grupo][p.equipoVisitante]) groups[p.grupo][p.equipoVisitante] = init(p.equipoVisitante);

      if (p.estado !== "FINALIZADO" || p.golesLocalReal === null || p.golesVisitanteReal === null) continue;

      const loc = groups[p.grupo][p.equipoLocal];
      const vis = groups[p.grupo][p.equipoVisitante];
      const gl = p.golesLocalReal;
      const gv = p.golesVisitanteReal;

      loc.pj++; vis.pj++;
      loc.gf += gl; loc.gc += gv;
      vis.gf += gv; vis.gc += gl;

      if (gl > gv) { loc.pg++; loc.pts += 3; vis.pp++; }
      else if (gl < gv) { vis.pg++; vis.pts += 3; loc.pp++; }
      else { loc.pe++; loc.pts++; vis.pe++; vis.pts++; }

      groupMatches[p.grupo].push({ local: p.equipoLocal, visitante: p.equipoVisitante, gl, gv });
    }

    return Object.entries(groups)
      .filter(([, teams]) => Object.keys(teams).length > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letra, teams]) => ({
        letra,
        equipos: sortGroupTeams(Object.values(teams), groupMatches[letra] ?? []),
      }));
  },
  ["clasificacion-grupos"],
  { tags: ["ranking"] },
);

const getActualBracket = unstable_cache(
  async () => {
    const now = new Date();
    const partidos = await prisma.partido.findMany({
      select: {
        id: true,
        equipoLocal: true,
        equipoVisitante: true,
        golesLocalReal: true,
        golesVisitanteReal: true,
        ganadorPenales: true,
        estado: true,
        fase: true,
        grupo: true,
        fechaPartido: true,
      },
    });

    // allGrupos includes all teams regardless of match date, so the group
    // composition is always known for third-place slot resolution.
    const allGrupos: Record<string, string[]> = {};
    for (const p of partidos) {
      if (p.fase !== "GRUPOS" || !p.grupo) continue;
      if (!allGrupos[p.grupo]) allGrupos[p.grupo] = [];
      for (const t of [p.equipoLocal, p.equipoVisitante]) {
        if (!allGrupos[p.grupo].includes(t)) allGrupos[p.grupo].push(t);
      }
    }

    // Count total and finalizado matches per group to detect complete groups.
    const totalPerGroup: Record<string, number> = {};
    const finalizadoPerGroup: Record<string, number> = {};
    for (const p of partidos) {
      if (p.fase !== "GRUPOS" || !p.grupo) continue;
      totalPerGroup[p.grupo] = (totalPerGroup[p.grupo] ?? 0) + 1;
      if (p.estado === "FINALIZADO" && p.fechaPartido <= now) {
        finalizadoPerGroup[p.grupo] = (finalizadoPerGroup[p.grupo] ?? 0) + 1;
      }
    }
    const completeGroups = new Set(
      Object.entries(totalPerGroup)
        .filter(([g, total]) => (finalizadoPerGroup[g] ?? 0) >= total)
        .map(([g]) => g)
    );

    // Only pass matches that have already started.
    const pastPartidos = partidos.filter(p => p.fechaPartido <= now);
    const bracket = computeActualBracket(pastPartidos);

    // Exact qualifiers for finished groups.
    const grupos = Object.fromEntries(
      Object.entries(bracket.grupos).filter(([g]) => completeGroups.has(g))
    );

    // Math-confirmed qualifiers from incomplete groups.
    // A team's position is confirmed if no rival can exceed their points, AND
    // any rival that could only tie has already lost the head-to-head to them.
    type TeamData = { pts: number; gf: number; gc: number; remainingOpponents: Set<string> };
    const groupStandings: Record<string, Record<string, TeamData>> = {};
    const groupH2H: Record<string, Map<string, string | null>> = {};

    for (const p of partidos) {
      if (p.fase !== "GRUPOS" || !p.grupo) continue;
      const g = p.grupo;
      groupStandings[g] ??= {};
      groupH2H[g] ??= new Map();
      groupStandings[g][p.equipoLocal] ??= { pts: 0, gf: 0, gc: 0, remainingOpponents: new Set() };
      groupStandings[g][p.equipoVisitante] ??= { pts: 0, gf: 0, gc: 0, remainingOpponents: new Set() };
      if (p.estado === "FINALIZADO" && p.golesLocalReal !== null && p.golesVisitanteReal !== null) {
        const gl = p.golesLocalReal, gv = p.golesVisitanteReal;
        const loc = groupStandings[g][p.equipoLocal];
        const vis = groupStandings[g][p.equipoVisitante];
        if (gl > gv) loc.pts += 3; else if (gl < gv) vis.pts += 3; else { loc.pts++; vis.pts++; }
        loc.gf += gl; loc.gc += gv;
        vis.gf += gv; vis.gc += gl;
        const h2hKey = [p.equipoLocal, p.equipoVisitante].sort().join("|");
        groupH2H[g].set(h2hKey, gl > gv ? p.equipoLocal : gl < gv ? p.equipoVisitante : null);
      } else if (p.estado !== "FINALIZADO") {
        groupStandings[g][p.equipoLocal].remainingOpponents.add(p.equipoVisitante);
        groupStandings[g][p.equipoVisitante].remainingOpponents.add(p.equipoLocal);
      }
    }

    // True if `other` can still deny `leader` their confirmed position.
    const canChallenge = (
      leader: string, leaderPts: number,
      other: string, otherData: TeamData,
      h2hMap: Map<string, string | null>
    ): boolean => {
      const maxPtsOther = otherData.pts + 3 * otherData.remainingOpponents.size;
      if (maxPtsOther > leaderPts) return true;
      if (maxPtsOther < leaderPts) return false;
      // Can tie on points: check h2h to break the tie.
      if (otherData.remainingOpponents.has(leader)) return true; // h2h match still pending
      const h2hKey = [leader, other].sort().join("|");
      return h2hMap.get(h2hKey) !== leader; // leader didn't clearly win the h2h
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
      if (!second) { grupos[grupo] = [first.team]; continue; }
      const secondChallenged = sorted.some(
        t => t.team !== first.team && t.team !== second.team &&
             canChallenge(second.team, second.pts, t.team, t, h2hMap)
      );
      grupos[grupo] = secondChallenged ? [first.team] : [first.team, second.team];
    }

    // Build team→group map to filter terceros from incomplete groups.
    const teamToGroup: Record<string, string> = {};
    for (const [g, teams] of Object.entries(allGrupos)) {
      for (const t of teams) teamToGroup[t] = g;
    }
    const terceros = bracket.terceros.filter(t => completeGroups.has(teamToGroup[t] ?? ""));

    const fullBracket = { ...bracket, grupos, terceros, allGrupos };

    const isSlotCode = (name: string) =>
      /^\d/.test(name) || name.includes("/") || /^[WL]\d/.test(name);

    const knockoutFases = new Set(["DIECISEISAVOS", "OCTAVOS"]);
    const knockoutPartidos = partidos
      .filter(p => knockoutFases.has(p.fase))
      .sort((a, b) => a.fechaPartido.getTime() - b.fechaPartido.getTime())
      .map(p => {
        const local = isSlotCode(p.equipoLocal)
          ? (resolveDbCode(p.equipoLocal, fullBracket) ?? p.equipoLocal)
          : p.equipoLocal;
        const visitante = isSlotCode(p.equipoVisitante)
          ? (resolveDbCode(p.equipoVisitante, fullBracket) ?? p.equipoVisitante)
          : p.equipoVisitante;
        return {
          id: p.id,
          fase: p.fase,
          fechaPartido: p.fechaPartido.toISOString(),
          equipoLocal: local,
          equipoVisitante: visitante,
          golesLocalReal: p.golesLocalReal,
          golesVisitanteReal: p.golesVisitanteReal,
          estado: p.estado,
        };
      });

    return { ...fullBracket, knockoutPartidos };
  },
  ["clasificacion-bracket"],
  { tags: ["ranking"] },
);

export default async function ClasificacionPage() {
  const [grupos, bracket, session] = await Promise.all([
    getClasificacion(),
    getActualBracket(),
    auth(),
  ]);

  const userBracket = session?.user
    ? await prisma.pronosticoBracket.findUnique({
        where: { userId: session.user.id },
        select: { picks: true },
      })
    : null;

  const userGrupos = (userBracket?.picks as BracketPicks | null)?.grupos ?? {};
  const userTerceros = (userBracket?.picks as BracketPicks | null)?.terceros ?? [];

  const tercerosList = grupos
    .filter(g => g.equipos.length >= 3 && g.equipos[2].pj > 0)
    .map(g => ({
      ...g.equipos[2],
      grupo: g.letra,
      complete: g.equipos.every(e => e.pj === 3),
    }))
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const gdA = a.gf - a.gc, gdB = b.gf - b.gc;
      if (gdB !== gdA) return gdB - gdA;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.localeCompare(b.team);
    });

  const bracketPicks: BracketPicks = {
    grupos: bracket.grupos,
    terceros: bracket.terceros,
    resultados: bracket.resultados,
  };

  const hasKnockoutTeams = Object.keys(bracket.grupos).length > 0;
  const { knockoutPartidos } = bracket as typeof bracket & {
    knockoutPartidos: Array<{
      id: string; fase: string; fechaPartido: string;
      equipoLocal: string; equipoVisitante: string;
      golesLocalReal: number | null; golesVisitanteReal: number | null;
      estado: string;
    }>;
  };
  const hasKnockoutMatches = knockoutPartidos?.length > 0;
  const hasStartedKnockout = knockoutPartidos?.some(p => p.estado !== "PROGRAMADO");
  const subtitle = hasStartedKnockout ? "Fase Eliminatoria · Mundial 2026" : "Fase de Grupos · Mundial 2026";

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Clasificación</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>

      {/* Knockout bracket */}
      {hasKnockoutTeams && (
        <div className="mb-12">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white">Eliminatorias</h2>
            <p className="text-sm text-gray-500 mt-1">Se actualiza conforme se confirman posiciones</p>
          </div>
          <BracketTree
            picks={bracketPicks}
            locked
            allGrupos={bracket.allGrupos}
            emptyChampionLabel="Por confirmar"
            split
          />
        </div>
      )}

      {/* Knockout match results */}
      {hasKnockoutMatches && (
        <KnockoutResultsSection partidos={knockoutPartidos} />
      )}

      {/* Fase de grupos */}
      {grupos.length === 0 ? (
        <div className="glass-card p-16 text-center text-gray-600">
          Los partidos de la fase de grupos aún no han comenzado
        </div>
      ) : (
        <div className={hasKnockoutMatches || hasKnockoutTeams ? "mt-12" : ""}>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4 text-[11px] text-gray-600">
            {Object.keys(userGrupos).length > 0 ? (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500/70" />
                  Puesto exacto
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500/30" />
                  Clasificado (puesto cambiado)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500/40" />
                  No en tu porra
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-yellow-500/50" />
                  Posible 3º clasificado
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00e87a]/70" />
                  Clasificado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-yellow-500/50" />
                  Posible 3º clasificado
                </span>
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {grupos.map(({ letra, equipos }) => (
              <GrupoCard key={letra} letra={letra} equipos={equipos} userPicks={userGrupos[letra]} terceros={userTerceros} />
            ))}
          </div>
        </div>
      )}

      {/* 8 mejores terceros */}
      {tercerosList.length > 0 && (
        <div className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white">8 Mejores Terceros</h2>
            <p className="text-sm text-gray-500 mt-1">Los 8 mejores de 12 clasifican a dieciseisavos</p>
          </div>
          <TercerosList terceros={tercerosList} userTerceros={userTerceros} />
        </div>
      )}
    </>
  );
}

type KnockoutPartido = {
  id: string; fase: string; fechaPartido: string;
  equipoLocal: string; equipoVisitante: string;
  golesLocalReal: number | null; golesVisitanteReal: number | null;
  estado: string;
};

const FASE_LABEL: Record<string, string> = {
  DIECISEISAVOS: "Dieciseisavos de Final",
  OCTAVOS: "Octavos de Final",
  CUARTOS: "Cuartos de Final",
  SEMIFINAL: "Semifinales",
  TERCER_PUESTO: "Tercer y Cuarto Puesto",
  FINAL: "Final",
};

const ESTADO_BADGE: Record<string, string> = {
  EN_PROGRESO: "En juego",
  FINALIZADO: "Finalizado",
};

function KnockoutResultsSection({ partidos }: { partidos: KnockoutPartido[] }) {
  const byFase: Record<string, KnockoutPartido[]> = {};
  for (const p of partidos) {
    (byFase[p.fase] ??= []).push(p);
  }
  const faseOrder = ["DIECISEISAVOS", "OCTAVOS", "CUARTOS", "SEMIFINAL", "TERCER_PUESTO", "FINAL"];
  const fasesPresentes = faseOrder.filter(f => byFase[f]?.length);

  return (
    <div className="mt-12 space-y-8">
      {fasesPresentes.map(fase => (
        <div key={fase}>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white">{FASE_LABEL[fase] ?? fase}</h2>
          </div>
          <div className="glass-card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-white/[0.04]">
                {(byFase[fase] ?? []).map(p => {
                  const isSlot = (n: string) => /^\d/.test(n) || n.includes("/") || /^[WL]\d/.test(n);
                  const localSlot = isSlot(p.equipoLocal);
                  const visitanteSlot = isSlot(p.equipoVisitante);
                  const played = p.golesLocalReal !== null && p.golesVisitanteReal !== null;
                  const fecha = new Date(p.fechaPartido).toLocaleDateString("es-ES", {
                    weekday: "short", day: "numeric", month: "short",
                    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid",
                  });
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="pl-4 pr-2 py-3 text-xs text-gray-600 whitespace-nowrap w-32">{fecha}</td>
                      <td className="px-2 py-3 text-right">
                        <span className={`text-sm font-medium ${localSlot ? "text-gray-500 font-mono text-xs" : "text-gray-200"}`}>
                          {!localSlot && <span className="mr-1.5">{getFlag(p.equipoLocal)}</span>}
                          {p.equipoLocal}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {played ? (
                          <span className="font-mono font-bold text-white tabular-nums">
                            {p.golesLocalReal} – {p.golesVisitanteReal}
                          </span>
                        ) : (
                          <span className="text-gray-700 text-xs">vs</span>
                        )}
                        {p.estado === "EN_PROGRESO" && (
                          <span className="ml-1.5 text-[10px] text-amber-400 font-semibold">● {ESTADO_BADGE[p.estado]}</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-left">
                        <span className={`text-sm font-medium ${visitanteSlot ? "text-gray-500 font-mono text-xs" : "text-gray-200"}`}>
                          {!visitanteSlot && <span className="mr-1.5">{getFlag(p.equipoVisitante)}</span>}
                          {p.equipoVisitante}
                        </span>
                      </td>
                      <td className="pr-4 pl-2 py-3 text-right w-20">
                        {p.estado === "FINALIZADO" && (
                          <span className="text-[10px] text-emerald-600">{ESTADO_BADGE[p.estado]}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

type TerceroEntry = Stats & { grupo: string; complete: boolean };

function TercerosList({ terceros, userTerceros }: { terceros: TerceroEntry[]; userTerceros: string[] }) {
  const hasUserPicks = userTerceros.length > 0;
  return (
    <div className="glass-card !p-0 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="pl-3 pr-1 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600">#</th>
            <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600">Equipo</th>
            <th className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">Grupo</th>
            <th className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">PJ</th>
            <th className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">G</th>
            <th className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">E</th>
            <th className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">P</th>
            <th className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">GD</th>
            <th className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">GF</th>
            <th className="pr-3 pl-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">Pts</th>
          </tr>
        </thead>
        <tbody>
          {terceros.map((t, i) => {
            const qualifies = i < 8;
            const gd = t.gf - t.gc;
            const userPicked = userTerceros.includes(t.team);
            const rowCls = hasUserPicks
              ? (userPicked ? (qualifies ? "bg-green-500/[0.10]" : "bg-amber-500/[0.08]") : (qualifies ? "bg-red-500/[0.06]" : ""))
              : (qualifies ? "bg-[#00e87a]/[0.02]" : "");
            return (
              <tr key={t.team} className={`border-b border-white/[0.03] last:border-0 ${rowCls}`}>
                <td className="pl-3 pr-1 py-2.5">
                  <span className={`text-xs font-bold ${qualifies ? "text-[#00e87a]" : "text-gray-700"}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base leading-none shrink-0">{getFlag(t.team)}</span>
                    <span className={`text-xs font-medium truncate ${qualifies ? "text-gray-200" : "text-gray-500"}`}>
                      {t.team}
                    </span>
                    {hasUserPicks && userPicked && (
                      <span className={`shrink-0 text-[10px] whitespace-nowrap ${qualifies ? "text-green-400" : "text-amber-400"}`}>
                        (tu porra)
                      </span>
                    )}
                    {!t.complete && (
                      <span className="shrink-0 text-[10px] text-gray-600 whitespace-nowrap">●</span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2.5 text-center">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white/[0.06] text-[10px] font-bold text-gray-400">
                    {t.grupo}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-400 tabular-nums">{t.pj}</td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-500 tabular-nums hidden sm:table-cell">{t.pg}</td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-500 tabular-nums hidden sm:table-cell">{t.pe}</td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-500 tabular-nums hidden sm:table-cell">{t.pp}</td>
                <td className="px-2 py-2.5 text-center text-xs tabular-nums">
                  <span className={gd > 0 ? "text-[#00e87a]" : gd < 0 ? "text-red-400/70" : "text-gray-600"}>
                    {gd > 0 ? `+${gd}` : gd}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-400 tabular-nums hidden sm:table-cell">{t.gf}</td>
                <td className="pr-3 pl-2 py-2.5 text-center">
                  <span className={`text-sm font-bold tabular-nums ${qualifies ? "text-white" : "text-gray-500"}`}>
                    {t.pts}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {terceros.some(t => !t.complete) && (
        <p className="px-4 py-2.5 text-[11px] text-gray-600 border-t border-white/[0.04]">
          ● Grupo no finalizado — la posición puede cambiar
        </p>
      )}
    </div>
  );
}

function rowBg(i: number, team: string, userPicks?: string[]): string {
  if (i >= 2) return "";
  if (!userPicks?.length) return "bg-[#00e87a]/[0.03]";
  const pickedAt = userPicks.indexOf(team);
  if (pickedAt === i) return "bg-green-500/[0.18]";      // exact position
  if (pickedAt >= 0) return "bg-green-500/[0.07]";       // right team, wrong slot
  return "bg-red-500/[0.08]";                            // not picked in top 2
}

function userPickLabel(team: string, groupPicks?: string[], terceros?: string[]): string | null {
  if (groupPicks?.[0] === team) return "tú: 1º";
  if (groupPicks?.[1] === team) return "tú: 2º";
  if (terceros?.includes(team)) return "tú: mejor 3º";
  return null;
}

function GrupoCard({ letra, equipos, userPicks, terceros }: { letra: string; equipos: Stats[]; userPicks?: string[]; terceros?: string[] }) {
  return (
    <div className="glass-card !p-0 overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-[#00e87a]/10 text-[11px] font-bold text-[#00e87a]">
          {letra}
        </span>
        <span className="text-sm font-semibold text-gray-300">Grupo {letra}</span>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.04]">
            <th className="pl-3 pr-1 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600">#</th>
            <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600">Equipo</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">PJ</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">G</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">E</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">P</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">GF</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">GC</th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">GD</th>
            <th className="pr-3 pl-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">Pts</th>
          </tr>
        </thead>
        <tbody>
          {equipos.map((e, i) => {
            const gd = e.gf - e.gc;
            const qualifies = i < 2;
            const thirdPlace = i === 2;
            return (
              <tr
                key={e.team}
                className={`border-b border-white/[0.03] last:border-0 ${rowBg(i, e.team, userPicks)}`}
              >
                <td className="pl-3 pr-1 py-2.5">
                  <span className={`text-xs font-bold ${qualifies ? "text-[#00e87a]" : thirdPlace ? "text-yellow-500/60" : "text-gray-700"}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base leading-none shrink-0">{getFlag(e.team)}</span>
                    <span className={`text-xs font-medium truncate ${qualifies ? "text-gray-200" : "text-gray-400"}`}>
                      {e.team}
                    </span>
                    {(() => {
                      const label = userPickLabel(e.team, userPicks, terceros);
                      if (!label) return null;
                      return (
                        <span className="shrink-0 text-[10px] text-gray-500 whitespace-nowrap">
                          ({label})
                        </span>
                      );
                    })()}
                  </div>
                </td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-400 tabular-nums">{e.pj}</td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-500 tabular-nums hidden sm:table-cell">{e.pg}</td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-500 tabular-nums hidden sm:table-cell">{e.pe}</td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-500 tabular-nums hidden sm:table-cell">{e.pp}</td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-400 tabular-nums">{e.gf}</td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-400 tabular-nums">{e.gc}</td>
                <td className="px-2 py-2.5 text-center text-xs tabular-nums">
                  <span className={gd > 0 ? "text-[#00e87a]" : gd < 0 ? "text-red-400/70" : "text-gray-600"}>
                    {gd > 0 ? `+${gd}` : gd}
                  </span>
                </td>
                <td className="pr-3 pl-2 py-2.5 text-center">
                  <span className={`text-sm font-bold tabular-nums ${qualifies ? "text-white" : "text-gray-500"}`}>
                    {e.pts}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
