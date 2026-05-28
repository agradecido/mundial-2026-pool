import type { BracketPicks } from "./bracket";
import { ALL_MATCHES, PHASE_MATCHES, resolveSlot } from "./bracket";

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
  fase: string;
  grupo: string | null;
};

type Stats = { pts: number; gf: number; ga: number; gd: number };

function sortedTeams(entries: [string, Stats][]): string[] {
  return [...entries]
    .sort(([na, a], [nb, b]) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || na.localeCompare(nb)
    )
    .map(([t]) => t);
}

export function computeActualBracket(partidos: PartidoRow[]): ActualBracket {
  // ── Group standings ──────────────────────────────────────────────────────
  const groupMap: Record<string, Record<string, Stats>> = {};

  for (const p of partidos) {
    if (p.fase !== "GRUPOS" || p.golesLocalReal === null || p.golesVisitanteReal === null) continue;
    const g = p.grupo ?? "?";
    groupMap[g] ??= {};

    const upd = (team: string, gf: number, ga: number) => {
      groupMap[g][team] ??= { pts: 0, gf: 0, ga: 0, gd: 0 };
      groupMap[g][team].pts += gf > ga ? 3 : gf === ga ? 1 : 0;
      groupMap[g][team].gf += gf;
      groupMap[g][team].ga += ga;
      groupMap[g][team].gd += gf - ga;
    };
    upd(p.equipoLocal, p.golesLocalReal, p.golesVisitanteReal);
    upd(p.equipoVisitante, p.golesVisitanteReal, p.golesLocalReal);
  }

  const grupos: Record<string, string[]> = {};
  const thirdCandidates: [string, Stats][] = [];
  const allGrupos: Record<string, string[]> = {};

  for (const [g, stats] of Object.entries(groupMap)) {
    const sorted = sortedTeams(Object.entries(stats));
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
    const p = partidos.find(
      r => r.fase === fase &&
        ((r.equipoLocal === teamA && r.equipoVisitante === teamB) ||
          (r.equipoLocal === teamB && r.equipoVisitante === teamA))
    );
    if (!p || p.golesLocalReal === null || p.golesVisitanteReal === null) continue;

    if (p.golesLocalReal > p.golesVisitanteReal) resultados[match.id] = p.equipoLocal;
    else if (p.golesVisitanteReal > p.golesLocalReal) resultados[match.id] = p.equipoVisitante;
  }

  return { grupos, terceros, resultados, allGrupos };
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
