import type { BracketPicks } from "./bracket";
import { ALL_MATCHES, BRACKET_THIRD_TO_DB, PHASE_MATCHES, resolveSlot } from "./bracket";

// Points for correctly predicting a team advances past each round
const ROUND_PTS: Record<string, number> = {
  D32: 2, D16: 5, QF: 7, SF: 10, FINAL: 10,
};

export interface ActualBracket {
  grupos: Record<string, string[]>; // actual standings [1st, 2nd]
  terceros: string[];                 // actual 8 best 3rd-place teams
  resultados: Record<string, string>;  // matchId → actual winning team
  allGrupos: Record<string, string[]>; // all teams per group (structural data)
}

export interface BracketScore {
  total: number;
  dieciseisavos: number; // 1pt per correct group qualifier
  octavos: number; // 2pt per correct D32 winner
  cuartos: number; // 5pt per correct D16 winner
  semifinal: number; // 7pt per correct QF winner
  final: number; // 10pt per correct SF winner (finalist)
  campeon: number; // 10pt for correct champion
}

type PartidoRow = {
  equipoLocal: string;
  equipoVisitante: string;
  golesLocalReal: number | null;
  golesVisitanteReal: number | null;
  estado: string;
  fase: string;
  grupo: string | null;
};

type Stats = { pts: number; gf: number; ga: number; gd: number };
type MatchResult = { local: string; visitante: string; gl: number; gv: number };

function h2hStats(entries: [string, Stats][], matches: MatchResult[]) {
  const tiedSet = new Set(entries.map(([t]) => t));
  const h2h: Record<string, { pts: number; gf: number; gc: number }> = {};
  for (const [t] of entries) h2h[t] = { pts: 0, gf: 0, gc: 0 };
  for (const m of matches) {
    if (!tiedSet.has(m.local) || !tiedSet.has(m.visitante)) continue;
    h2h[m.local].gf += m.gl; h2h[m.local].gc += m.gv;
    h2h[m.visitante].gf += m.gv; h2h[m.visitante].gc += m.gl;
    if (m.gl > m.gv) h2h[m.local].pts += 3;
    else if (m.gl < m.gv) h2h[m.visitante].pts += 3;
    else { h2h[m.local].pts++; h2h[m.visitante].pts++; }
  }
  return h2h;
}

// matches only needed for within-group ties; omit for cross-group ranking (terceros)
function sortedTeams(entries: [string, Stats][], matches: MatchResult[] = []): string[] {
  const byPoints = new Map<number, [string, Stats][]>();
  for (const e of entries) {
    const tier = byPoints.get(e[1].pts) ?? [];
    tier.push(e);
    byPoints.set(e[1].pts, tier);
  }
  const result: string[] = [];
  for (const pts of [...byPoints.keys()].sort((a, b) => b - a)) {
    const tier = byPoints.get(pts)!;
    if (tier.length === 1) { result.push(tier[0][0]); continue; }
    const h2h = h2hStats(tier, matches);
    result.push(
      ...[...tier].sort(([na, a], [nb, b]) => {
        const ha = h2h[na], hb = h2h[nb];
        if (hb.pts !== ha.pts) return hb.pts - ha.pts;
        const h2hGdA = ha.gf - ha.gc, h2hGdB = hb.gf - hb.gc;
        if (h2hGdB !== h2hGdA) return h2hGdB - h2hGdA;
        if (hb.gf !== ha.gf) return hb.gf - ha.gf;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return na.localeCompare(nb);
      }).map(([t]) => t)
    );
  }
  return result;
}

export function computeActualBracket(partidos: PartidoRow[]): ActualBracket {
  // ── Group standings ──────────────────────────────────────────────────────
  const groupMap: Record<string, Record<string, Stats>> = {};
  const groupMatches: Record<string, MatchResult[]> = {};

  for (const p of partidos) {
    if (p.fase !== "GRUPOS" || p.estado !== "FINALIZADO" || p.golesLocalReal === null || p.golesVisitanteReal === null) continue;
    const g = p.grupo ?? "?";
    groupMap[g] ??= {};
    groupMatches[g] ??= [];

    const upd = (team: string, gf: number, ga: number) => {
      groupMap[g][team] ??= { pts: 0, gf: 0, ga: 0, gd: 0 };
      groupMap[g][team].pts += gf > ga ? 3 : gf === ga ? 1 : 0;
      groupMap[g][team].gf += gf;
      groupMap[g][team].ga += ga;
      groupMap[g][team].gd += gf - ga;
    };
    upd(p.equipoLocal, p.golesLocalReal, p.golesVisitanteReal);
    upd(p.equipoVisitante, p.golesVisitanteReal, p.golesLocalReal);
    groupMatches[g].push({ local: p.equipoLocal, visitante: p.equipoVisitante, gl: p.golesLocalReal, gv: p.golesVisitanteReal });
  }

  const grupos: Record<string, string[]> = {};
  const thirdCandidates: [string, Stats][] = [];
  const allGrupos: Record<string, string[]> = {};

  for (const [g, stats] of Object.entries(groupMap)) {
    const sorted = sortedTeams(Object.entries(stats), groupMatches[g] ?? []);
    grupos[g] = sorted.slice(0, 2);
    allGrupos[g] = Object.keys(stats);
    if (sorted[2]) thirdCandidates.push([sorted[2], stats[sorted[2]]]);
  }

  const terceros = sortedTeams(thirdCandidates).slice(0, 8);

  // ── Knockout results ─────────────────────────────────────────────────────
  const roundToFase: Record<string, string> = {
    D32: "DIECISEISAVOS", D16: "OCTAVOS", QF: "CUARTOS", SF: "SEMIFINAL", FINAL: "FINAL",
  };

  const resultados: Record<string, string> = {};

  for (const match of ALL_MATCHES) {
    const teamA = resolveSlot(match.slotA, grupos, terceros, resultados, allGrupos);
    const teamB = resolveSlot(match.slotB, grupos, terceros, resultados, allGrupos);
    if (!teamA || !teamB) continue;

    const fase = roundToFase[match.round];
    const winner = findKnockoutWinner(partidos, match.slotA, match.slotB, teamA, teamB, fase);
    if (winner) resultados[match.id] = winner;
  }

  return { grupos, terceros, resultados, allGrupos };
}

/** Find the winning team name for a knockout match, checking both real names and raw slot codes. */
function findKnockoutWinner(
  partidos: PartidoRow[],
  slotA: string,
  slotB: string,
  teamA: string,
  teamB: string,
  fase: string,
): string | undefined {
  const dbSlotA = BRACKET_THIRD_TO_DB[slotA] ?? slotA;
  const dbSlotB = BRACKET_THIRD_TO_DB[slotB] ?? slotB;

  const p = partidos.find(
    r => r.fase === fase &&
      ((r.equipoLocal === teamA && r.equipoVisitante === teamB) ||
        (r.equipoLocal === teamB && r.equipoVisitante === teamA) ||
        (r.equipoLocal === dbSlotA && r.equipoVisitante === dbSlotB) ||
        (r.equipoLocal === dbSlotB && r.equipoVisitante === dbSlotA))
  );

  if (!p) return undefined;
  if (p.estado !== "FINALIZADO" || p.golesLocalReal === null || p.golesVisitanteReal === null) return undefined;
  if (p.golesLocalReal === p.golesVisitanteReal) return undefined;

  const localIsA = p.equipoLocal === teamA || p.equipoLocal === dbSlotA;
  const localWins = p.golesLocalReal > p.golesVisitanteReal;
  const winnerIsA = localIsA ? localWins : !localWins;
  return winnerIsA ? teamA : teamB;
}

const PHASE_TO_SCORE_KEY: Record<string, keyof BracketScore> = {
  D32: "octavos", D16: "cuartos", QF: "semifinal", SF: "final", FINAL: "campeon",
};

export function scoreBracket(picks: BracketPicks, actual: ActualBracket): BracketScore {
  const s: BracketScore = { total: 0, dieciseisavos: 0, octavos: 0, cuartos: 0, semifinal: 0, final: 0, campeon: 0 };

  // 1pt per correctly predicted group qualifier (top-2)
  for (const [g, teams] of Object.entries(picks.grupos ?? {})) {
    for (const t of teams) {
      if ((actual.grupos[g] ?? []).includes(t)) { s.dieciseisavos++; s.total++; }
    }
  }
  // 1pt per correctly predicted 3rd-place qualifier
  for (const t of picks.terceros ?? []) {
    if (actual.terceros.includes(t)) { s.dieciseisavos++; s.total++; }
  }

  // KO rounds
  for (const match of ALL_MATCHES) {
    const pick = picks.resultados?.[match.id];
    const real = actual.resultados[match.id];
    if (!pick || !real || pick !== real) continue;
    const key = PHASE_TO_SCORE_KEY[match.round];
    const pts = ROUND_PTS[match.round] ?? 0;
    (s as unknown as Record<string, number>)[key] += pts;
    s.total += pts;
  }

  return s;
}

export function bracketCompletion(picks: BracketPicks, gruposLetters: string[]): { done: number; total: number } {
  let done = 0;
  const total = 7;

  if (gruposLetters.every(g => (picks.grupos?.[g]?.length ?? 0) === 2)) done++;
  if ((picks.terceros?.length ?? 0) === 8) done++;
  for (const phase of ["octavos", "cuartos", "semifinal", "final", "campeon"]) {
    const matches = PHASE_MATCHES[phase] ?? [];
    if (matches.length > 0 && matches.every(m => picks.resultados?.[m.id] !== undefined)) done++;
  }

  return { done, total };
}
