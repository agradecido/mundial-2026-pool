import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getFlag } from "@/lib/flags";
import type { BracketPicks } from "@/lib/bracket";
import { computeActualBracket } from "@/lib/bracket-scoring";
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
        equipoLocal: true,
        equipoVisitante: true,
        golesLocalReal: true,
        golesVisitanteReal: true,
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

    // Also add mathematically confirmed qualifiers from incomplete groups:
    // build current standings + remaining matches, then check if fewer than 2
    // other teams can reach or tie a team's current points (>= to cover tiebreaker risk).
    type TeamData = { pts: number; remaining: number };
    const groupStandings: Record<string, Record<string, TeamData>> = {};
    for (const p of partidos) {
      if (p.fase !== "GRUPOS" || !p.grupo) continue;
      const g = p.grupo;
      groupStandings[g] ??= {};
      groupStandings[g][p.equipoLocal] ??= { pts: 0, remaining: 0 };
      groupStandings[g][p.equipoVisitante] ??= { pts: 0, remaining: 0 };
      if (p.estado === "FINALIZADO" && p.golesLocalReal !== null && p.golesVisitanteReal !== null) {
        const gl = p.golesLocalReal, gv = p.golesVisitanteReal;
        if (gl > gv) groupStandings[g][p.equipoLocal].pts += 3;
        else if (gl < gv) groupStandings[g][p.equipoVisitante].pts += 3;
        else { groupStandings[g][p.equipoLocal].pts++; groupStandings[g][p.equipoVisitante].pts++; }
      } else if (p.estado !== "FINALIZADO") {
        groupStandings[g][p.equipoLocal].remaining++;
        groupStandings[g][p.equipoVisitante].remaining++;
      }
    }
    for (const [grupo, teams] of Object.entries(groupStandings)) {
      if (completeGroups.has(grupo)) continue;
      const sorted = Object.entries(teams)
        .map(([team, d]) => ({ team, ...d }))
        .sort((a, b) => b.pts - a.pts);
      const maxPts = (t: (typeof sorted)[0]) => t.pts + 3 * t.remaining;

      // 1st is confirmed only if no other team can reach or tie their points.
      const first = sorted[0];
      if (sorted.some(t => t.team !== first.team && maxPts(t) >= first.pts)) continue;

      // 2nd is confirmed only if no other team (excluding confirmed 1st) can reach or tie their points.
      const second = sorted[1];
      if (!second) { grupos[grupo] = [first.team]; continue; }
      const second2ndChallenged = sorted.some(
        t => t.team !== first.team && t.team !== second.team && maxPts(t) >= second.pts
      );
      grupos[grupo] = second2ndChallenged ? [first.team] : [first.team, second.team];
    }

    // Build team→group map to filter terceros from incomplete groups.
    const teamToGroup: Record<string, string> = {};
    for (const [g, teams] of Object.entries(allGrupos)) {
      for (const t of teams) teamToGroup[t] = g;
    }
    const terceros = bracket.terceros.filter(t => completeGroups.has(teamToGroup[t] ?? ""));

    return { ...bracket, grupos, terceros, allGrupos };
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

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Clasificación</h1>
        <p className="text-sm text-gray-500 mt-1">Fase de Grupos · Mundial 2026</p>
      </div>

      {grupos.length === 0 ? (
        <div className="glass-card p-16 text-center text-gray-600">
          Los partidos de la fase de grupos aún no han comenzado
        </div>
      ) : (
        <>
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
        </>
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

      {/* Knockout bracket */}
      {hasKnockoutTeams && (
        <div className="mt-12">
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
    </>
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
