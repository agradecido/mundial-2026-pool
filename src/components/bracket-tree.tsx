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
    matchId,
    team,
    isWinner,
    onChampionPath,
    onPick,
    locked,
}: {
    matchId: string;
    team: string | undefined;
    isWinner: boolean;
    onChampionPath: boolean;
    onPick?: (matchId: string, team: string) => void;
    locked?: boolean;
}) {
    const isOnPath = onChampionPath && isWinner;
    if (!team) {
        return (
            <div className="flex items-center gap-1.5 lg:gap-2 px-1.5 py-1 lg:px-2 lg:py-1 border border-dashed border-white/[0.12] rounded-md">
                <span className="text-gray-700 text-[10px] lg:text-[13px] opacity-40">?</span>
                <span className="text-gray-700 text-[10px] lg:text-[13px] truncate">Por definir</span>
            </div>
        );
    }
    const editable = !!onPick && !locked;
    const baseCls = `flex items-center gap-1.5 lg:gap-2 px-1.5 py-1 lg:px-2 lg:py-1 rounded-md transition-colors w-full text-left border ${isWinner
        ? isOnPath
            ? "bg-[#00e87a]/10 border-[#00e87a]/40"
            : "bg-white/[0.06] border-white/[0.18]"
        : "bg-white/[0.015] border-white/[0.08]"
        } ${editable ? "cursor-pointer hover:bg-white/[0.06] hover:border-white/[0.20]" : ""}`;
    const content = (
        <>
            <span className={`text-[11px] lg:text-[14px] leading-none shrink-0 transition-opacity ${isWinner ? "opacity-100" : "opacity-60"}`}>{getFlag(team)}</span>
            <span className={`text-[10px] lg:text-[13px] truncate leading-none ${isWinner ? (isOnPath ? "text-[#00e87a]" : "text-white") : "text-gray-400"
                }`}>
                {team}
            </span>
        </>
    );
    if (editable) {
        return (
            <button type="button" onClick={() => onPick!(matchId, team)} className={baseCls}>
                {content}
            </button>
        );
    }
    return <div className={baseCls}>{content}</div>;
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
    onPick?: (matchId: string, team: string) => void;
    locked?: boolean;
}

function MatchCell({
    matchId,
    teamA,
    teamB,
    winner,
    onChampionPath,
    slotHeight,
    connectorSide,
    onPick,
    locked,
}: MatchCellProps) {
    // Connector geometry (inside this cell's slotHeight × column-width box):
    //   - Card is centered at y = slotHeight/2
    //   - Parent (next round) sits at y = slotHeight (upper of pair) or y = 0 (lower of pair)
    //   - We draw an "L" / reversed "L" using two borders on a small box on the right gutter
    //
    //   Upper match (┐):  box [top=slotHeight/2 .. bottom=slotHeight], borderTop + borderRight
    //                      → horizontal stroke at card-center going right, vertical going down to slot bottom
    //   Lower match (└):  box [top=0 .. bottom=slotHeight/2], borderBottom + borderRight
    //                      → horizontal stroke at card-center going right, vertical going up to slot top
    const connectorColor = onChampionPath ? "#00e87a99" : "rgba(255,255,255,0.22)";
    const connectorEl = connectorSide && connectorSide !== "single" ? (
        <div
            aria-hidden
            className="absolute right-1 w-3 lg:w-4 pointer-events-none"
            style={{
                top: connectorSide === "top" ? `calc(var(--s) * ${slotHeight / BASE_SLOT} / 2)` : 0,
                height: `calc(var(--s) * ${slotHeight / BASE_SLOT} / 2)`,
                borderRight: `1px solid ${connectorColor}`,
                borderTop: connectorSide === "top" ? `1px solid ${connectorColor}` : undefined,
                borderBottom: connectorSide === "bottom" ? `1px solid ${connectorColor}` : undefined,
            }}
        />
    ) : null;

    return (
        <div
            data-match={matchId}
            className="relative flex flex-col justify-center pr-6 lg:pr-8 py-1"
            style={{ height: `calc(var(--s) * ${slotHeight / BASE_SLOT})` }}
        >
            <div className="flex flex-col gap-0.5 lg:gap-1 p-1.5 lg:p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] transition-colors">
                <TeamRow matchId={matchId} team={teamA} isWinner={winner === teamA} onChampionPath={onChampionPath} onPick={onPick} locked={locked} />
                <div className="flex items-center justify-center py-0.5">
                    <span className="text-[8px] lg:text-[9px] font-bold text-gray-700 tracking-wider">VS</span>
                </div>
                <TeamRow matchId={matchId} team={teamB} isWinner={winner === teamB} onChampionPath={onChampionPath} onPick={onPick} locked={locked} />
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
        <div className="flex flex-col min-w-[130px] lg:min-w-[160px]">
            <p className="text-[9px] lg:text-[11px] font-semibold text-gray-600 uppercase tracking-widest text-center mb-2 shrink-0">
                {label}
            </p>
            <div className="flex flex-col flex-1">
                {children}
            </div>
        </div>
    );
}

// ── BracketTree ──────────────────────────────────────────────────────────────

const BASE_SLOT = 72; // px per slot in D32 (smallest unit)

export default function BracketTree({
    picks,
    onPick,
    locked,
    allGrupos,
}: {
    picks: BracketPicks;
    onPick?: (matchId: string, team: string) => void;
    locked?: boolean;
    allGrupos?: Record<string, string[]>;
}) {
    const grupos = picks.grupos ?? {};
    const terceros = picks.terceros ?? [];
    const resultados = picks.resultados ?? {};

    const championPath = buildChampionPath(resultados);

    // Resolve all matches
    function resolvedMatch(matchId: string, slotA: string, slotB: string) {
        return {
            teamA: resolveSlot(slotA, grupos, terceros, resultados, allGrupos),
            teamB: resolveSlot(slotB, grupos, terceros, resultados, allGrupos),
            winner: resultados[matchId],
        };
    }

    // CSS var --s (set on container) drives slot size responsively; totalHeight follows
    const totalHeight = 'calc(var(--s) * 16)';

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
        <div className="overflow-x-auto scrollbar-none -mx-5 px-5 [--s:96px] lg:[--s:112px]">
            <div
                className="flex gap-0 items-stretch"
                style={{ minWidth: 1150, height: totalHeight }}
            >
                {/* ── Column 1: 16avos (D32) ── */}
                <Column label="16avos">
                    <div className="flex flex-col" style={{ height: totalHeight }}>
                        {D32_MATCHES.map((m, idx) => {
                            const { teamA, teamB, winner } = resolvedMatch(m.id, m.slotA, m.slotB);
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
                                    onPick={onPick}
                                    locked={locked}
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
                                    onPick={onPick}
                                    locked={locked}
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
                                    onPick={onPick}
                                    locked={locked}
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
                                    onPick={onPick}
                                    locked={locked}
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
                                    onPick={onPick}
                                    locked={locked}
                                />
                            );
                        })()}
                    </div>
                </Column>

                {/* ── Column 6: Campeón ── */}
                <div className="flex flex-col min-w-[140px] lg:min-w-[180px] items-center justify-center">
                    <div className={`rounded-xl border px-4 py-4 lg:px-6 lg:py-6 flex flex-col items-center gap-2 lg:gap-3 ${champion
                        ? "border-[#00e87a]/40 bg-[#00e87a]/5"
                        : "border-dashed border-white/10 bg-white/[0.01]"
                        }`}>
                        <p className="text-[9px] lg:text-[11px] font-bold uppercase tracking-widest text-amber-400/80">
                            Campeón del mundo
                        </p>
                        {champion ? (
                            <>
                                <span className="text-3xl lg:text-5xl leading-none">{getFlag(champion)}</span>
                                <span className="text-sm lg:text-base font-bold text-[#00e87a] text-center leading-tight">
                                    {champion}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="text-3xl lg:text-5xl leading-none text-gray-700">❓</span>
                                <span className="text-[10px] lg:text-[13px] text-gray-700 italic text-center">Sin pick</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
