"use client";

import { getFlag } from "@/lib/flags";
import {
    D32_MATCHES, D16_MATCHES, QF_MATCHES, SF_MATCHES, FINAL_MATCH,
    resolveSlot,
} from "@/lib/bracket";
import type { BracketPicks } from "@/lib/bracket";

// ── Champion path ────────────────────────────────────────────────────────────

/** Returns the set of matchIds that are on the winning path to the champion. */
function buildChampionPath(resultados: Record<string, string>): Set<string> {
    const path = new Set<string>();
    const allMatches = [...D32_MATCHES, ...D16_MATCHES, ...QF_MATCHES, ...SF_MATCHES, FINAL_MATCH];

    const champion = resultados["FINAL"];
    if (!champion) return path;

    // BFS backwards from FINAL
    const queue: string[] = ["FINAL"];
    while (queue.length > 0) {
        const id = queue.shift()!;
        const winner = resultados[id];
        if (!winner) continue;
        path.add(id);

        // Find the two predecessors of this match (matches whose winner feeds this match's slotA or slotB)
        const match = allMatches.find(m => m.id === id);
        if (!match) continue;
        for (const slot of [match.slotA, match.slotB]) {
            if (slot.startsWith("W:")) {
                const predId = slot.slice(2);
                const predWinner = resultados[predId];
                if (predWinner && predWinner === winner) {
                    // This predecessor's winner fed into this match's winner
                    queue.push(predId);
                }
            }
        }
    }

    return path;
}

// ── TeamRow ──────────────────────────────────────────────────────────────────

function TeamRow({
    team,
    isWinner,
    onChampionPath,
}: {
    team: string | undefined;
    isWinner: boolean;
    onChampionPath: boolean;
}) {
    const isOnPath = onChampionPath && isWinner;
    if (!team) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 border border-dashed border-white/[0.08] rounded-md">
                <span className="text-gray-700 text-[10px]">?</span>
                <span className="text-gray-700 text-[10px] truncate">Por definir</span>
            </div>
        );
    }
    return (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${isWinner
                ? isOnPath
                    ? "bg-[#00e87a]/10 border border-[#00e87a]/20"
                    : "bg-white/[0.04] border border-white/[0.08]"
                : "border border-transparent"
            }`}>
            <span className="text-[11px] leading-none shrink-0">{getFlag(team)}</span>
            <span className={`text-[10px] truncate leading-none ${isWinner ? (isOnPath ? "text-[#00e87a]" : "text-white") : "text-gray-600"
                }`}>
                {team}
            </span>
        </div>
    );
}

// ── MatchCell ────────────────────────────────────────────────────────────────

interface MatchCellProps {
    matchId: string;
    teamA: string | undefined;
    teamB: string | undefined;
    winner: string | undefined;
    onChampionPath: boolean;
    /** Height of the whole slot allocated to this cell (used for connector sizing) */
    slotHeight: number;
    /** Which half of the slot this connector should bridge to (top or bottom) */
    connectorSide?: "top" | "bottom" | "single";
}

function MatchCell({
    matchId,
    teamA,
    teamB,
    winner,
    onChampionPath,
    slotHeight,
    connectorSide,
}: MatchCellProps) {
    const borderColor = onChampionPath
        ? "border-[#00e87a]/30"
        : "border-white/[0.08]";

    // Connector: a "]"-shaped div on the right side linking to the parent match
    const connectorEl = connectorSide && connectorSide !== "single" ? (
        <div
            aria-hidden
            className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 pointer-events-none ${onChampionPath ? "border-[#00e87a]/30" : "border-white/[0.07]"
                }`}
            style={{
                height: `${slotHeight / 2}px`,
                borderRight: "1px solid",
                borderTop: connectorSide === "top" ? "1px solid" : undefined,
                borderBottom: connectorSide === "bottom" ? "1px solid" : undefined,
                top: connectorSide === "top" ? "50%" : undefined,
                bottom: connectorSide === "bottom" ? "50%" : undefined,
                transform: connectorSide === "top" ? "translateY(-100%)" : "none",
            }}
        />
    ) : null;

    return (
        <div
            data-match={matchId}
            className="relative flex flex-col justify-center pr-3"
            style={{ height: `${slotHeight}px` }}
        >
            <div className={`flex flex-col gap-0.5 rounded-lg border ${borderColor} bg-[#0c0c18] overflow-hidden`}>
                <TeamRow team={teamA} isWinner={winner === teamA} onChampionPath={onChampionPath} />
                <div className={`h-px ${onChampionPath ? "bg-[#00e87a]/15" : "bg-white/[0.05]"}`} />
                <TeamRow team={teamB} isWinner={winner === teamB} onChampionPath={onChampionPath} />
            </div>
            {connectorEl}
        </div>
    );
}

// ── Column ───────────────────────────────────────────────────────────────────

interface ColumnProps {
    label: string;
    children: React.ReactNode;
}

function Column({ label, children }: ColumnProps) {
    return (
        <div className="flex flex-col min-w-[130px]">
            <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest text-center mb-2 shrink-0">
                {label}
            </p>
            <div className="flex flex-col flex-1">
                {children}
            </div>
        </div>
    );
}

// ── BracketTree ──────────────────────────────────────────────────────────────

const BASE_SLOT = 52; // px per slot in D32 (smallest unit)

export default function BracketTree({ picks }: { picks: BracketPicks }) {
    const grupos = picks.grupos ?? {};
    const terceros = picks.terceros ?? [];
    const resultados = picks.resultados ?? {};

    const championPath = buildChampionPath(resultados);

    // Resolve all matches
    function resolvedMatch(matchId: string, slotA: string, slotB: string) {
        return {
            teamA: resolveSlot(slotA, grupos, terceros, resultados),
            teamB: resolveSlot(slotB, grupos, terceros, resultados),
            winner: resultados[matchId],
        };
    }

    // Total bracket height = 16 D32 matches * BASE_SLOT
    const totalHeight = 16 * BASE_SLOT;

    // D32 — 16 matches, each gets BASE_SLOT height
    // D16 — 8 matches, each gets 2×BASE_SLOT
    // QF  — 4 matches, each gets 4×BASE_SLOT
    // SF  — 2 matches, each gets 8×BASE_SLOT
    // FIN — 1 match,   each gets 16×BASE_SLOT

    const slotHeights: Record<string, number> = {
        D32: BASE_SLOT,
        D16: BASE_SLOT * 2,
        QF: BASE_SLOT * 4,
        SF: BASE_SLOT * 8,
        FINAL: BASE_SLOT * 16,
    };

    // Connector side: even-index matches get "top" (upper of pair), odd-index get "bottom"
    function connectorSide(idx: number): "top" | "bottom" {
        return idx % 2 === 0 ? "top" : "bottom";
    }

    const champion = resultados["FINAL"];

    return (
        <div className="overflow-x-auto scrollbar-none -mx-5 px-5">
            <div
                className="flex gap-0 items-stretch"
                style={{ minWidth: 920, height: totalHeight }}
            >
                {/* ── Column 1: 16avos (D32) ── */}
                <Column label="16avos">
                    <div className="flex flex-col" style={{ height: totalHeight }}>
                        {D32_MATCHES.map((m) => {
                            const { teamA, teamB, winner } = resolvedMatch(m.id, m.slotA, m.slotB);
                            const idx = D32_MATCHES.indexOf(m);
                            return (
                                <MatchCell
                                    key={m.id}
                                    matchId={m.id}
                                    teamA={teamA}
                                    teamB={teamB}
                                    winner={winner}
                                    onChampionPath={championPath.has(m.id)}
                                    slotHeight={slotHeights.D32}
                                    connectorSide={connectorSide(idx)}
                                />
                            );
                        })}
                    </div>
                </Column>

                {/* ── Column 2: Octavos (D16) ── */}
                <Column label="1/8">
                    <div className="flex flex-col" style={{ height: totalHeight }}>
                        {D16_MATCHES.map((m, idx) => {
                            const { teamA, teamB, winner } = resolvedMatch(m.id, m.slotA, m.slotB);
                            return (
                                <MatchCell
                                    key={m.id}
                                    matchId={m.id}
                                    teamA={teamA}
                                    teamB={teamB}
                                    winner={winner}
                                    onChampionPath={championPath.has(m.id)}
                                    slotHeight={slotHeights.D16}
                                    connectorSide={connectorSide(idx)}
                                />
                            );
                        })}
                    </div>
                </Column>

                {/* ── Column 3: Cuartos (QF) ── */}
                <Column label="1/4">
                    <div className="flex flex-col" style={{ height: totalHeight }}>
                        {QF_MATCHES.map((m, idx) => {
                            const { teamA, teamB, winner } = resolvedMatch(m.id, m.slotA, m.slotB);
                            return (
                                <MatchCell
                                    key={m.id}
                                    matchId={m.id}
                                    teamA={teamA}
                                    teamB={teamB}
                                    winner={winner}
                                    onChampionPath={championPath.has(m.id)}
                                    slotHeight={slotHeights.QF}
                                    connectorSide={connectorSide(idx)}
                                />
                            );
                        })}
                    </div>
                </Column>

                {/* ── Column 4: Semifinal (SF) ── */}
                <Column label="Semis">
                    <div className="flex flex-col" style={{ height: totalHeight }}>
                        {SF_MATCHES.map((m, idx) => {
                            const { teamA, teamB, winner } = resolvedMatch(m.id, m.slotA, m.slotB);
                            return (
                                <MatchCell
                                    key={m.id}
                                    matchId={m.id}
                                    teamA={teamA}
                                    teamB={teamB}
                                    winner={winner}
                                    onChampionPath={championPath.has(m.id)}
                                    slotHeight={slotHeights.SF}
                                    connectorSide={connectorSide(idx)}
                                />
                            );
                        })}
                    </div>
                </Column>

                {/* ── Column 5: Final ── */}
                <Column label="Final">
                    <div className="flex flex-col" style={{ height: totalHeight }}>
                        {(() => {
                            const m = FINAL_MATCH;
                            const { teamA, teamB, winner } = resolvedMatch(m.id, m.slotA, m.slotB);
                            return (
                                <MatchCell
                                    key={m.id}
                                    matchId={m.id}
                                    teamA={teamA}
                                    teamB={teamB}
                                    winner={winner}
                                    onChampionPath={championPath.has(m.id)}
                                    slotHeight={slotHeights.FINAL}
                                    connectorSide="single"
                                />
                            );
                        })()}
                    </div>
                </Column>

                {/* ── Column 6: Campeón ── */}
                <div className="flex flex-col min-w-[140px] items-center justify-center">
                    <div className={`rounded-xl border px-4 py-4 flex flex-col items-center gap-2 ${champion
                            ? "border-[#00e87a]/40 bg-[#00e87a]/5"
                            : "border-dashed border-white/10 bg-white/[0.01]"
                        }`}>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/80">
                            Campeón del mundo
                        </p>
                        {champion ? (
                            <>
                                <span className="text-3xl leading-none">{getFlag(champion)}</span>
                                <span className="text-sm font-bold text-[#00e87a] text-center leading-tight">
                                    {champion}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="text-3xl leading-none text-gray-700">❓</span>
                                <span className="text-[10px] text-gray-700 italic text-center">Sin pick</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
