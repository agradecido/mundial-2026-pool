import { findThirdsAssignment } from "./thirds-table";

/** Build a map from team name to group letter using the full world-cup groups data. */
function buildTeamGroupMap(allGrupos: Record<string, string[]>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [g, teams] of Object.entries(allGrupos)) {
    for (const team of teams) map[team] = g;
  }
  return map;
}

export interface BracketPicks {
  grupos?: Record<string, string[]>; // index 0 = 1°, index 1 = 2°
  terceros?: string[];                 // 8 mejores terceros
  resultados?: Record<string, string>;  // matchId → equipo ganador
}

export interface Match {
  id: string;
  round: "D32" | "D16" | "QF" | "SF" | "FINAL";
  slotA: string;
  slotB: string;
  zone: number;
}

export const D32_MATCHES: Match[] = [
  // Orden de visualización del árbol (de arriba a abajo). Cada pareja de
  // dieciseisavos consecutivos alimenta el mismo octavo. Referencias FIFA:
  // P73..P88 (28 jun – 3 jul 2026).
  // ── Mitad superior del cuadro (SF-1) ──
  // QF-1 (P97) → D16-1 (P89) + D16-2 (P90)
  { id: "D32-1", round: "D32", slotA: "1E", slotB: "3:D32-1", zone: 1 }, // P74
  { id: "D32-2", round: "D32", slotA: "1I", slotB: "3:D32-2", zone: 1 }, // P77
  { id: "D32-3", round: "D32", slotA: "2A", slotB: "2B", zone: 1 }, // P73
  { id: "D32-4", round: "D32", slotA: "1F", slotB: "2C", zone: 1 }, // P75
  // QF-2 (P98) → D16-3 (P93) + D16-4 (P94)
  { id: "D32-5", round: "D32", slotA: "2K", slotB: "2L", zone: 2 }, // P83
  { id: "D32-6", round: "D32", slotA: "1H", slotB: "2J", zone: 2 }, // P84
  { id: "D32-7", round: "D32", slotA: "1D", slotB: "3:D32-7", zone: 2 }, // P81
  { id: "D32-8", round: "D32", slotA: "1G", slotB: "3:D32-8", zone: 2 }, // P82
  // ── Mitad inferior del cuadro (SF-2) ──
  // QF-3 (P99) → D16-5 (P91) + D16-6 (P92)
  { id: "D32-9", round: "D32", slotA: "1C", slotB: "2F", zone: 3 }, // P76
  { id: "D32-10", round: "D32", slotA: "2E", slotB: "2I", zone: 3 }, // P78
  { id: "D32-11", round: "D32", slotA: "1A", slotB: "3:D32-11", zone: 3 }, // P79
  { id: "D32-12", round: "D32", slotA: "1L", slotB: "3:D32-12", zone: 3 }, // P80
  // QF-4 (P100) → D16-7 (P95) + D16-8 (P96)
  { id: "D32-13", round: "D32", slotA: "1J", slotB: "2H", zone: 4 }, // P86
  { id: "D32-14", round: "D32", slotA: "2D", slotB: "2G", zone: 4 }, // P88
  { id: "D32-15", round: "D32", slotA: "1B", slotB: "3:D32-15", zone: 4 }, // P85
  { id: "D32-16", round: "D32", slotA: "1K", slotB: "3:D32-16", zone: 4 }, // P87
];

export const D16_MATCHES: Match[] = [
  { id: "D16-1", round: "D16", slotA: "W:D32-1", slotB: "W:D32-2", zone: 1 }, // P89
  { id: "D16-2", round: "D16", slotA: "W:D32-3", slotB: "W:D32-4", zone: 1 }, // P90
  { id: "D16-3", round: "D16", slotA: "W:D32-5", slotB: "W:D32-6", zone: 2 }, // P93
  { id: "D16-4", round: "D16", slotA: "W:D32-7", slotB: "W:D32-8", zone: 2 }, // P94
  { id: "D16-5", round: "D16", slotA: "W:D32-9", slotB: "W:D32-10", zone: 3 }, // P91
  { id: "D16-6", round: "D16", slotA: "W:D32-11", slotB: "W:D32-12", zone: 3 }, // P92
  { id: "D16-7", round: "D16", slotA: "W:D32-13", slotB: "W:D32-14", zone: 4 }, // P95
  { id: "D16-8", round: "D16", slotA: "W:D32-15", slotB: "W:D32-16", zone: 4 }, // P96
];

export const QF_MATCHES: Match[] = [
  { id: "QF-1", round: "QF", slotA: "W:D16-1", slotB: "W:D16-2", zone: 1 }, // P97
  { id: "QF-2", round: "QF", slotA: "W:D16-3", slotB: "W:D16-4", zone: 1 }, // P98
  { id: "QF-3", round: "QF", slotA: "W:D16-5", slotB: "W:D16-6", zone: 2 }, // P99
  { id: "QF-4", round: "QF", slotA: "W:D16-7", slotB: "W:D16-8", zone: 2 }, // P100
];

export const SF_MATCHES: Match[] = [
  { id: "SF-1", round: "SF", slotA: "W:QF-1", slotB: "W:QF-2", zone: 1 }, // P101
  { id: "SF-2", round: "SF", slotA: "W:QF-3", slotB: "W:QF-4", zone: 2 }, // P102
];

export const FINAL_MATCH: Match = {
  id: "FINAL", round: "FINAL", slotA: "W:SF-1", slotB: "W:SF-2", zone: 1, // P104
};

export const ALL_MATCHES: Match[] = [
  ...D32_MATCHES, ...D16_MATCHES, ...QF_MATCHES, ...SF_MATCHES, FINAL_MATCH,
];

// FIFA match number → bracket match ID (from worldcup.json `num` field)
export const NUM_TO_MATCHID: Record<number, string> = {
  73: "D32-3",  74: "D32-1",  75: "D32-4",  76: "D32-9",
  77: "D32-2",  78: "D32-10", 79: "D32-11", 80: "D32-12",
  81: "D32-7",  82: "D32-8",  83: "D32-5",  84: "D32-6",
  85: "D32-15", 86: "D32-13", 87: "D32-16", 88: "D32-14",
  89: "D16-1",  90: "D16-2",  91: "D16-5",  92: "D16-6",
  93: "D16-3",  94: "D16-4",  95: "D16-7",  96: "D16-8",
  97: "QF-1",   98: "QF-2",   99: "QF-3",  100: "QF-4",
  101: "SF-1", 102: "SF-2",
};

/**
 * Resolve a DB slot code (e.g. "2A", "1E", "W74") to an actual team name
 * using the current bracket state. Returns undefined if the team is not yet known.
 */
export function resolveDbCode(
  code: string,
  bracket: { grupos: Record<string, string[]>; resultados: Record<string, string> }
): string | undefined {
  // "1X" or "2X" → first/second in group X
  const gm = code.match(/^([12])([A-L])$/);
  if (gm) return bracket.grupos[gm[2]]?.[gm[1] === "1" ? 0 : 1];

  // "W{num}" → winner of a previous match
  const wm = code.match(/^W(\d+)$/);
  if (wm) {
    const matchId = NUM_TO_MATCHID[parseInt(wm[1])];
    if (matchId) return bracket.resultados[matchId];
  }

  return undefined;
}

// Matches played during each selection phase
export const PHASE_MATCHES: Record<string, Match[]> = {
  octavos: D32_MATCHES,
  cuartos: D16_MATCHES,
  semifinal: QF_MATCHES,
  final: SF_MATCHES,
  campeon: [FINAL_MATCH],
};

export function resolveSlot(
  slot: string,
  grupos: Record<string, string[]>,
  terceros: string[],
  resultados: Record<string, string>,
  allGrupos?: Record<string, string[]>,
): string | undefined {
  if (slot.startsWith("W:")) return resultados[slot.slice(2)];
  if (/^[12][A-L]$/.test(slot)) return grupos[slot[1]]?.[slot[0] === "1" ? 0 : 1];
  if (slot.startsWith("3:")) {
    if (!allGrupos || terceros.length !== 8) return undefined;
    const matchId = slot.slice(2);
    const teamGroup = buildTeamGroupMap(allGrupos);
    const terceroGroups = terceros
      .map(t => teamGroup[t])
      .filter((g): g is string => g !== undefined);
    if (terceroGroups.length !== 8) return undefined;
    const assignment = findThirdsAssignment(terceroGroups);
    if (!assignment) return undefined;
    const groupForSlot = assignment[matchId];
    if (!groupForSlot) return undefined;
    return terceros.find(t => teamGroup[t] === groupForSlot);
  }
  return undefined;
}

export function getDescendants(matchId: string): string[] {
  const result: string[] = [];
  const queue = [matchId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const m of ALL_MATCHES) {
      if (m.slotA === `W:${id}` || m.slotB === `W:${id}`) {
        result.push(m.id);
        queue.push(m.id);
      }
    }
  }
  return result;
}

export function cascadeAll(p: BracketPicks, allGrupos?: Record<string, string[]>): BracketPicks {
  const grupos = p.grupos ?? {};
  const terceros = p.terceros ?? [];

  // Remove terceros that are already in a grupo's top-2 (they can't be a "third"
  // and a qualifier at the same time).
  const grupoPicks = Object.values(grupos).flat();
  let newTerceros = terceros.filter(t => !grupoPicks.includes(t));

  // Drop unknown teams and keep at most one tercero per group (preserving order).
  //
  // NOTE: we intentionally DO NOT drop a tercero just because its group is
  // temporarily missing one of its two qualifiers. Editing the qualifiers of a
  // group passes through a transient "1 qualified" state, and pruning here would
  // silently — and permanently — delete an already-chosen tercero. A tercero only
  // becomes invalid if it turns into a top-2 pick (handled above) or duplicates a
  // group (handled below); group completeness is validated separately in the UI
  // and does not affect third-place scoring (which depends only on which groups
  // contribute a third, not on how many qualifiers each group has).
  if (allGrupos) {
    const teamGroupMap = buildTeamGroupMap(allGrupos);
    const seenGroups = new Set<string>();
    newTerceros = newTerceros.filter(t => {
      const group = teamGroupMap[t];
      if (!group) return false; // Unknown team, remove it
      if (seenGroups.has(group)) return false; // already a tercero from this group
      seenGroups.add(group);
      return true;
    });
  }

  // Validate each stored result against the (possibly updated) teams
  const newRes = { ...(p.resultados ?? {}) };
  for (const match of ALL_MATCHES) {
    const winner = newRes[match.id];
    if (winner === undefined) continue;
    const teamA = resolveSlot(match.slotA, grupos, newTerceros, newRes, allGrupos);
    const teamB = resolveSlot(match.slotB, grupos, newTerceros, newRes, allGrupos);
    // Clear if match unresolvable or stored winner is no longer a participant
    if (teamA === undefined || teamB === undefined || (winner !== teamA && winner !== teamB)) {
      delete newRes[match.id];
      for (const desc of getDescendants(match.id)) delete newRes[desc];
    }
  }

  return { ...p, terceros: newTerceros, resultados: newRes };
}
