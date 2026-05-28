export interface BracketPicks {
  grupos?:     Record<string, string[]>; // index 0 = 1°, index 1 = 2°
  terceros?:   string[];                 // 8 mejores terceros
  resultados?: Record<string, string>;  // matchId → equipo ganador
}

export interface Match {
  id:    string;
  round: "D32" | "D16" | "QF" | "SF" | "FINAL";
  slotA: string;
  slotB: string;
  zone:  number;
}

export const D32_MATCHES: Match[] = [
  // Zona 1 — Grupos A, B, C
  { id: "D32-1",  round: "D32", slotA: "1A",  slotB: "2C",  zone: 1 },
  { id: "D32-2",  round: "D32", slotA: "1C",  slotB: "2A",  zone: 1 },
  { id: "D32-3",  round: "D32", slotA: "1B",  slotB: "3-1", zone: 1 },
  { id: "D32-4",  round: "D32", slotA: "2B",  slotB: "3-2", zone: 1 },
  // Zona 2 — Grupos D, E, F
  { id: "D32-5",  round: "D32", slotA: "1D",  slotB: "2F",  zone: 2 },
  { id: "D32-6",  round: "D32", slotA: "1F",  slotB: "2D",  zone: 2 },
  { id: "D32-7",  round: "D32", slotA: "1E",  slotB: "3-3", zone: 2 },
  { id: "D32-8",  round: "D32", slotA: "2E",  slotB: "3-4", zone: 2 },
  // Zona 3 — Grupos G, H, I
  { id: "D32-9",  round: "D32", slotA: "1G",  slotB: "2I",  zone: 3 },
  { id: "D32-10", round: "D32", slotA: "1I",  slotB: "2G",  zone: 3 },
  { id: "D32-11", round: "D32", slotA: "1H",  slotB: "3-5", zone: 3 },
  { id: "D32-12", round: "D32", slotA: "2H",  slotB: "3-6", zone: 3 },
  // Zona 4 — Grupos J, K, L
  { id: "D32-13", round: "D32", slotA: "1J",  slotB: "2L",  zone: 4 },
  { id: "D32-14", round: "D32", slotA: "1L",  slotB: "2J",  zone: 4 },
  { id: "D32-15", round: "D32", slotA: "1K",  slotB: "3-7", zone: 4 },
  { id: "D32-16", round: "D32", slotA: "2K",  slotB: "3-8", zone: 4 },
];

export const D16_MATCHES: Match[] = [
  { id: "D16-1", round: "D16", slotA: "W:D32-1",  slotB: "W:D32-2",  zone: 1 },
  { id: "D16-2", round: "D16", slotA: "W:D32-3",  slotB: "W:D32-4",  zone: 1 },
  { id: "D16-3", round: "D16", slotA: "W:D32-5",  slotB: "W:D32-6",  zone: 2 },
  { id: "D16-4", round: "D16", slotA: "W:D32-7",  slotB: "W:D32-8",  zone: 2 },
  { id: "D16-5", round: "D16", slotA: "W:D32-9",  slotB: "W:D32-10", zone: 3 },
  { id: "D16-6", round: "D16", slotA: "W:D32-11", slotB: "W:D32-12", zone: 3 },
  { id: "D16-7", round: "D16", slotA: "W:D32-13", slotB: "W:D32-14", zone: 4 },
  { id: "D16-8", round: "D16", slotA: "W:D32-15", slotB: "W:D32-16", zone: 4 },
];

export const QF_MATCHES: Match[] = [
  { id: "QF-1", round: "QF", slotA: "W:D16-1", slotB: "W:D16-2", zone: 1 },
  { id: "QF-2", round: "QF", slotA: "W:D16-3", slotB: "W:D16-4", zone: 2 },
  { id: "QF-3", round: "QF", slotA: "W:D16-5", slotB: "W:D16-6", zone: 3 },
  { id: "QF-4", round: "QF", slotA: "W:D16-7", slotB: "W:D16-8", zone: 4 },
];

export const SF_MATCHES: Match[] = [
  { id: "SF-1", round: "SF", slotA: "W:QF-1", slotB: "W:QF-2", zone: 1 },
  { id: "SF-2", round: "SF", slotA: "W:QF-3", slotB: "W:QF-4", zone: 2 },
];

export const FINAL_MATCH: Match = {
  id: "FINAL", round: "FINAL", slotA: "W:SF-1", slotB: "W:SF-2", zone: 1,
};

export const ALL_MATCHES: Match[] = [
  ...D32_MATCHES, ...D16_MATCHES, ...QF_MATCHES, ...SF_MATCHES, FINAL_MATCH,
];

// Matches played during each selection phase
export const PHASE_MATCHES: Record<string, Match[]> = {
  octavos:   D32_MATCHES,
  cuartos:   D16_MATCHES,
  semifinal: QF_MATCHES,
  final:     SF_MATCHES,
  campeon:   [FINAL_MATCH],
};

export function resolveSlot(
  slot:       string,
  grupos:     Record<string, string[]>,
  terceros:   string[],
  resultados: Record<string, string>,
): string | undefined {
  if (slot.startsWith("W:")) return resultados[slot.slice(2)];
  if (/^[12][A-L]$/.test(slot)) return grupos[slot[1]]?.[slot[0] === "1" ? 0 : 1];
  if (slot.startsWith("3-"))    return terceros[parseInt(slot.slice(2)) - 1];
  return undefined;
}

export function getDescendants(matchId: string): string[] {
  const result: string[] = [];
  const queue  = [matchId];
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

export function cascadeAll(p: BracketPicks): BracketPicks {
  const grupos   = p.grupos   ?? {};
  const terceros = p.terceros ?? [];

  // Remove terceros that are already in a grupo's top-2
  const grupoPicks  = Object.values(grupos).flat();
  const newTerceros = terceros.filter(t => !grupoPicks.includes(t));

  // Validate each stored result against the (possibly updated) teams
  const newRes = { ...(p.resultados ?? {}) };
  for (const match of ALL_MATCHES) {
    const winner = newRes[match.id];
    if (winner === undefined) continue;
    const teamA = resolveSlot(match.slotA, grupos, newTerceros, newRes);
    const teamB = resolveSlot(match.slotB, grupos, newTerceros, newRes);
    // Clear if match unresolvable or stored winner is no longer a participant
    if (teamA === undefined || teamB === undefined || (winner !== teamA && winner !== teamB)) {
      delete newRes[match.id];
      for (const desc of getDescendants(match.id)) delete newRes[desc];
    }
  }

  return { ...p, terceros: newTerceros, resultados: newRes };
}
