"use client";

import { useState, useRef } from "react";
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
    compact,
}: {
    matchId: string;
    team: string | undefined;
    isWinner: boolean;
    onChampionPath: boolean;
    onPick?: (matchId: string, team: string) => void;
    locked?: boolean;
    compact?: boolean;
}) {
    const isOnPath = onChampionPath && isWinner;
    const flagSz = compact ? "text-[18px]" : "text-[21px]";
    const nameSz = compact ? "text-[13px]" : "text-lg";
    const pad = compact ? "px-1.5 py-1 gap-1.5" : "px-2.5 py-2 lg:px-2 lg:py-1 gap-2 lg:gap-2";
    if (!team) {
        return (
            <div className={`flex items-center ${pad} border border-dashed border-white/[0.12] rounded-md`}>
                <span className={`text-gray-700 ${flagSz} opacity-40`}>?</span>
                <span className={`text-gray-700 ${nameSz} truncate`}>Por definir</span>
            </div>
        );
    }
    const editable = !!onPick && !locked;
    const baseCls = `flex items-center ${pad} rounded-md transition-[background-color,border-color,transform] duration-100 w-full text-left border ${isWinner
        ? "bg-[#00e87a]/10 border-[#00e87a]/40"
        : "bg-white/[0.015] border-white/[0.08]"
        } ${editable ? "cursor-pointer [touch-action:manipulation] hover:bg-white/[0.06] hover:border-white/[0.20] active:scale-[0.97] active:bg-[#00e87a]/20 active:border-[#00e87a]/50" : ""}`;
    const content = (
        <>
            <span className={`${flagSz} leading-none shrink-0 transition-opacity ${isWinner ? "opacity-100" : "opacity-85"}`}>{getFlag(team)}</span>
            <span data-bracket-winner-text={isWinner ? "1" : undefined} className={`${nameSz} truncate leading-none ${isWinner ? "text-[#00e87a]" : "text-gray-200"}`}>
                {team}
            </span>
        </>
    );
    if (editable) {
        return (
            <button type="button" onClick={() => onPick!(matchId, team)} className={baseCls} data-bracket-winner={isWinner ? "1" : undefined}>
                {content}
            </button>
        );
    }
    return <div className={baseCls} data-bracket-winner={isWinner ? "1" : undefined}>{content}</div>;
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
    odds?: { first: number; draw: number; second: number } | null;
    /** Flip connector to left side (for right half of split bracket) */
    mirrored?: boolean;
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
    odds,
    mirrored,
}: MatchCellProps) {
    // Connector geometry (inside this cell's slotHeight × column-width box):
    //
    // Normal (left half):  connector on RIGHT side
    //   Upper match (┐):  box [top=slotHeight/2 .. bottom=slotHeight], borderTop + borderRight
    //   Lower match (└):  box [top=0 .. bottom=slotHeight/2], borderBottom + borderRight
    //
    // Mirrored (right half):  connector on LEFT side
    //   Upper match (┌):  box [top=slotHeight/2 .. bottom=slotHeight], borderTop + borderLeft
    //   Lower match (└⟵): box [top=0 .. bottom=slotHeight/2], borderBottom + borderLeft
    const connectorColor = onChampionPath ? "#00e87a99" : "rgba(255,255,255,0.22)";
    const connectorEl = connectorSide && connectorSide !== "single" ? (
        <div
            aria-hidden
            className={`absolute ${mirrored ? "left-1" : "right-1"} w-3 lg:w-4 pointer-events-none`}
            style={{
                top: connectorSide === "top" ? `calc(var(--s) * ${slotHeight / BASE_SLOT} / 2)` : 0,
                height: `calc(var(--s) * ${slotHeight / BASE_SLOT} / 2)`,
                borderRight: mirrored ? undefined : `1px solid ${connectorColor}`,
                borderLeft: mirrored ? `1px solid ${connectorColor}` : undefined,
                borderTop: connectorSide === "top" ? `1px solid ${connectorColor}` : undefined,
                borderBottom: connectorSide === "bottom" ? `1px solid ${connectorColor}` : undefined,
            }}
        />
    ) : null;

    return (
        <div
            data-match={matchId}
            className={`relative flex flex-col justify-center ${mirrored ? "pl-6 lg:pl-8" : "pr-6 lg:pr-8"} py-1`}
            style={{ height: `calc(var(--s) * ${slotHeight / BASE_SLOT})` }}
        >
            <MatchCard
                matchId={matchId}
                teamA={teamA}
                teamB={teamB}
                winner={winner}
                onChampionPath={onChampionPath}
                onPick={onPick}
                locked={locked}
                odds={odds}
            />
            {connectorEl}
        </div>
    );
}

// ── MatchCard ────────────────────────────────────────────────────────────────
// The visual card (two teams + VS/odds). Shared by the desktop tree (MatchCell)
// and the mobile per-round view.

function MatchCard({
    matchId,
    teamA,
    teamB,
    winner,
    onChampionPath,
    onPick,
    locked,
    odds,
    cardClassName,
    compact,
}: {
    matchId: string;
    teamA: string | undefined;
    teamB: string | undefined;
    winner: string | undefined;
    onChampionPath: boolean;
    onPick?: (matchId: string, team: string) => void;
    locked?: boolean;
    odds?: { first: number; draw: number; second: number } | null;
    /** Override the card skin (border/bg/padding). Used by the mobile list. */
    cardClassName?: string;
    compact?: boolean;
}) {
    const cardCls = cardClassName ?? (compact
        ? "flex flex-col gap-0.5 p-1 rounded-md border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] transition-colors"
        : "flex flex-col gap-0.5 lg:gap-1 p-1.5 lg:p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] transition-colors");
    return (
        <div className={cardCls}>
            <TeamRow matchId={matchId} team={teamA} isWinner={winner === teamA} onChampionPath={onChampionPath} onPick={onPick} locked={locked} compact={compact} />
            <div className={`flex items-center justify-center gap-1.5 ${compact ? "py-0" : "py-0.5"}`}>
                <span className={`${compact ? "text-[8px]" : "text-[10px] lg:text-[9px]"} font-bold text-gray-700 tracking-wider`}>VS</span>
                {odds && !compact && (
                    <span className="text-[10px] lg:text-[9px] text-gray-500 tabular-nums">
                        {odds.first.toFixed(2)} · {odds.draw.toFixed(2)} · {odds.second.toFixed(2)}
                    </span>
                )}
            </div>
            <TeamRow matchId={matchId} team={teamB} isWinner={winner === teamB} onChampionPath={onChampionPath} onPick={onPick} locked={locked} compact={compact} />
        </div>
    );
}

// ── SplitCell ────────────────────────────────────────────────────────────────
// Bracket cell for the split view. Uses pixel heights directly instead of the
// CSS-variable-based system used by MatchCell — avoids emoji rendering surprises.

interface SplitCellProps {
    matchId: string;
    teamA: string | undefined;
    teamB: string | undefined;
    winner: string | undefined;
    onChampionPath: boolean;
    slotH: number;
    connectorSide?: "top" | "bottom" | "single";
    mirrored?: boolean;
    onPick?: (matchId: string, team: string) => void;
    locked?: boolean;
    odds?: { first: number; draw: number; second: number } | null;
}

function SplitCell({
    matchId, teamA, teamB, winner, onChampionPath, slotH,
    connectorSide, mirrored, onPick, locked, odds,
}: SplitCellProps) {
    const cc = onChampionPath ? "#00e87a99" : "rgba(255,255,255,0.22)";
    return (
        <div
            data-match={matchId}
            className={`relative flex flex-col justify-center ${mirrored ? "pl-5" : "pr-5"}`}
            style={{ height: slotH }}
        >
            <MatchCard
                matchId={matchId} teamA={teamA} teamB={teamB} winner={winner}
                onChampionPath={onChampionPath} onPick={onPick} locked={locked} odds={odds}
                compact
            />
            {connectorSide && connectorSide !== "single" && (
                <div
                    aria-hidden
                    className={`absolute ${mirrored ? "left-0.5" : "right-0.5"} w-3 pointer-events-none`}
                    style={{
                        top: connectorSide === "top" ? slotH / 2 : 0,
                        height: slotH / 2,
                        borderRight: mirrored ? undefined : `1px solid ${cc}`,
                        borderLeft: mirrored ? `1px solid ${cc}` : undefined,
                        borderTop: connectorSide === "top" ? `1px solid ${cc}` : undefined,
                        borderBottom: connectorSide === "bottom" ? `1px solid ${cc}` : undefined,
                    }}
                />
            )}
        </div>
    );
}

// ── Column ───────────────────────────────────────────────────────────────────

interface ColumnProps {
    label: string;
    children: React.ReactNode;
    /** Override the column min-width class (default: "min-w-[130px] lg:min-w-[160px]") */
    widthClass?: string;
}

function Column({ label, children, widthClass }: ColumnProps) {
    return (
        <div className={`flex flex-col ${widthClass ?? "min-w-[130px] lg:min-w-[160px]"}`}>
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
    oddsMap,
    initialRound,
    emptyChampionLabel = "Sin pick",
    split,
}: {
    picks: BracketPicks;
    onPick?: (matchId: string, team: string) => void;
    locked?: boolean;
    allGrupos?: Record<string, string[]>;
    oddsMap?: Record<string, { first: number; draw: number; second: number }>;
    initialRound?: string;
    emptyChampionLabel?: string;
    /** Render desktop bracket as two halves facing each other (for clasificacion view) */
    split?: boolean;
}) {
    const grupos = picks.grupos ?? {};
    const terceros = picks.terceros ?? [];
    const resultados = picks.resultados ?? {};

    // Mobile per-round navigation
    const [activeRound, setActiveRound] = useState<string>(initialRound ?? "D32");
    const mobileTopRef = useRef<HTMLDivElement>(null);

    function goToRound(id: string) {
        setActiveRound(id);
        // Bring the round selector back into view so the new round starts from the top.
        mobileTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const championPath = buildChampionPath(resultados);

    // Resolve all matches
    function resolvedMatch(matchId: string, slotA: string, slotB: string) {
        return {
            teamA: resolveSlot(slotA, grupos, terceros, resultados, allGrupos),
            teamB: resolveSlot(slotB, grupos, terceros, resultados, allGrupos),
            winner: resultados[matchId],
        };
    }

    function oddsFor(a: string | undefined, b: string | undefined) {
        if (!a || !b || !oddsMap) return null;
        return oddsMap[`${a}|${b}`] ?? null;
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

    // Round config — drives the mobile per-round view
    const rounds: Array<{ id: string; label: string; matches: typeof D32_MATCHES }> = [
        { id: "D32", label: "16avos", matches: D32_MATCHES },
        { id: "D16", label: "Octavos", matches: D16_MATCHES },
        { id: "QF", label: "Cuartos", matches: QF_MATCHES },
        { id: "SF", label: "Semis", matches: SF_MATCHES },
        { id: "FINAL", label: "Final", matches: [FINAL_MATCH] },
    ];
    const activeIdx = rounds.findIndex(r => r.id === activeRound);
    const activeMatches = rounds[activeIdx]?.matches ?? D32_MATCHES;
    const nextRound = activeIdx >= 0 && activeIdx < rounds.length - 1 ? rounds[activeIdx + 1] : null;

    const championBlock = (
        <div className={`rounded-xl border px-4 py-4 flex flex-col items-center gap-2 ${champion
            ? "border-[#00e87a]/40 bg-[#00e87a]/5"
            : "border-dashed border-white/10 bg-white/[0.01]"
            }`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">
                Campeón del mundo
            </p>
            {champion ? (
                <>
                    <span className="text-4xl leading-none">{getFlag(champion)}</span>
                    <span className="text-base font-bold text-[#00e87a] text-center leading-tight">
                        {champion}
                    </span>
                </>
            ) : (
                <>
                    <span className="text-4xl leading-none text-gray-700">❓</span>
                    <span className="text-[13px] text-gray-700 italic text-center">{emptyChampionLabel}</span>
                </>
            )}
        </div>
    );

    return (
        <>
            {/* ── Mobile: per-round view ── */}
            <div className="lg:hidden scroll-mt-20" ref={mobileTopRef}>
                {/* Round selector */}
                <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-5 px-5 pb-3 [overscroll-behavior-x:contain]">
                    {rounds.map((r) => {
                        const active = r.id === activeRound;
                        const done = r.matches.every(m => resultados[m.id] !== undefined);
                        return (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => goToRound(r.id)}
                                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${active
                                    ? "bg-[#00e87a]/15 text-[#00e87a] border border-[#00e87a]/20"
                                    : done
                                        ? "bg-white/5 text-gray-300 border border-white/[0.08]"
                                        : "text-gray-500 border border-transparent"
                                    }`}
                            >
                                {done && !active && <span className="text-[#00e87a] text-[10px]">✓</span>}
                                {r.label}
                            </button>
                        );
                    })}
                </div>

                {/* Matches for the active round */}
                <div className="space-y-3.5">
                    {activeMatches.map((m) => {
                        const { teamA, teamB, winner } = resolvedMatch(m.id, m.slotA, m.slotB);
                        return (
                            <MatchCard
                                key={m.id}
                                matchId={m.id}
                                teamA={teamA}
                                teamB={teamB}
                                winner={winner}
                                onChampionPath={championPath.has(m.id)}
                                onPick={onPick}
                                locked={locked}
                                odds={oddsFor(teamA, teamB)}
                                cardClassName="flex flex-col gap-1 p-3 rounded-xl border border-white/[0.14] bg-white/[0.05] shadow-md shadow-black/20 transition-colors"
                            />
                        );
                    })}
                </div>

                {/* Go to next round */}
                {nextRound && (
                    <button
                        type="button"
                        onClick={() => goToRound(nextRound.id)}
                        className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-[#00e87a]/25 bg-[#00e87a]/10 px-4 py-3 text-sm font-semibold text-[#00e87a] active:scale-[0.98] active:bg-[#00e87a]/20 [touch-action:manipulation] transition-all duration-100"
                    >
                        Siguiente: {nextRound.label}
                        <span aria-hidden>→</span>
                    </button>
                )}

                {/* Champion shown after the Final round */}
                {activeRound === "FINAL" && (
                    <div className="mt-4">{championBlock}</div>
                )}
            </div>

            {/* ── Desktop: full tree ── */}
            <div id="bracket-desktop-view" className="hidden lg:block overflow-x-auto scrollbar-none -mx-5 px-5 [touch-action:pan-x_pan-y] [overscroll-behavior-x:contain] [-webkit-overflow-scrolling:touch]">

                {/* ── Single-flow layout (default) ── */}
                {!split && (
                    <div
                        id="bracket-capture-inner"
                        className="flex gap-0 items-stretch [--s:96px] lg:[--s:112px]"
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
                                            odds={oddsFor(teamA, teamB)}
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
                                            odds={oddsFor(teamA, teamB)}
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
                                            odds={oddsFor(teamA, teamB)}
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
                                            odds={oddsFor(teamA, teamB)}
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
                                            odds={oddsFor(teamA, teamB)}
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
                                        <span className="text-[10px] lg:text-[13px] text-gray-700 italic text-center">{emptyChampionLabel}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Split bracket layout (clasificacion) ── */}
                {split && (() => {
                    // Pixel-based approach: no CSS variable dependency.
                    // Compact card (text-[13px] name, text-[18px] emoji) ≈ 72px → D32H has 40px breathing room.
                    const D32H = 112; // px per D32 slot
                    const halfH = D32H * 8; // 896px total per half
                    // Column labels take ~28px above the match content. Outer container must
                    // include that space so overflow-x-auto does not create a vertical scroll.
                    const containerH = halfH + 28;
                    const SH = { D32: D32H, D16: D32H * 2, QF: D32H * 4, SF: D32H * 8 };
                    const colW = "min-w-[120px] lg:min-w-[175px]";
                    const cs = connectorSide;

                    const cell = (m: typeof D32_MATCHES[0], i: number, mir?: boolean, slotH = SH.D32) => {
                        const { teamA, teamB, winner } = resolvedMatch(m.id, m.slotA, m.slotB);
                        return (
                            <SplitCell key={m.id} matchId={m.id} teamA={teamA} teamB={teamB} winner={winner}
                                onChampionPath={championPath.has(m.id)} slotH={slotH} connectorSide={cs(i)}
                                mirrored={mir} onPick={onPick} locked={locked} odds={oddsFor(teamA, teamB)} />
                        );
                    };

                    return (
                        <div className="flex gap-0 items-stretch" style={{ minWidth: 1600, height: containerH }}>

                            {/* ══ Left half: flows right toward center ══ */}
                            <Column label="16avos" widthClass={colW}>
                                <div className="flex flex-col" style={{ height: halfH }}>
                                    {D32_MATCHES.slice(0, 8).map((m, i) => cell(m, i, false, SH.D32))}
                                </div>
                            </Column>

                            <Column label="1/8" widthClass={colW}>
                                <div className="flex flex-col" style={{ height: halfH }}>
                                    {D16_MATCHES.slice(0, 4).map((m, i) => cell(m, i, false, SH.D16))}
                                </div>
                            </Column>

                            <Column label="1/4" widthClass={colW}>
                                <div className="flex flex-col" style={{ height: halfH }}>
                                    {QF_MATCHES.slice(0, 2).map((m, i) => cell(m, i, false, SH.QF))}
                                </div>
                            </Column>

                            <Column label="Semis" widthClass={colW}>
                                <div className="flex flex-col" style={{ height: halfH }}>
                                    {(() => {
                                        const m = SF_MATCHES[0];
                                        const { teamA, teamB, winner } = resolvedMatch(m.id, m.slotA, m.slotB);
                                        return (
                                            <SplitCell matchId={m.id} teamA={teamA} teamB={teamB} winner={winner}
                                                onChampionPath={championPath.has(m.id)} slotH={SH.SF}
                                                connectorSide="single" onPick={onPick} locked={locked}
                                                odds={oddsFor(teamA, teamB)} />
                                        );
                                    })()}
                                </div>
                            </Column>

                            {/* ══ Center: Final + Champion ══ */}
                            <div className="flex flex-col min-w-[135px] lg:min-w-[200px] shrink-0">
                                <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest text-center mb-2 shrink-0">
                                    Final
                                </p>
                                <div className="relative flex flex-col items-center justify-center gap-3 px-2"
                                    style={{ height: halfH }}>
                                    {(() => {
                                        const m = FINAL_MATCH;
                                        const { teamA, teamB, winner } = resolvedMatch(m.id, m.slotA, m.slotB);
                                        return (
                                            <MatchCard matchId={m.id} teamA={teamA} teamB={teamB} winner={winner}
                                                onChampionPath={championPath.has(m.id)} onPick={onPick} locked={locked}
                                                odds={oddsFor(teamA, teamB)} />
                                        );
                                    })()}
                                    <div className={`w-full rounded-xl border px-3 py-2.5 flex flex-col items-center gap-1.5 ${
                                        champion ? "border-[#00e87a]/40 bg-[#00e87a]/5" : "border-dashed border-white/10 bg-white/[0.01]"
                                    }`}>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/80">
                                            Campeón del mundo
                                        </p>
                                        {champion ? (
                                            <>
                                                <span className="text-2xl leading-none">{getFlag(champion)}</span>
                                                <span className="text-xs font-bold text-[#00e87a] text-center leading-tight">{champion}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-2xl leading-none text-gray-700">❓</span>
                                                <span className="text-[10px] text-gray-700 italic text-center">{emptyChampionLabel}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ══ Right half: flows left toward center (mirrored) ══ */}
                            <Column label="Semis" widthClass={colW}>
                                <div className="flex flex-col" style={{ height: halfH }}>
                                    {(() => {
                                        const m = SF_MATCHES[1];
                                        const { teamA, teamB, winner } = resolvedMatch(m.id, m.slotA, m.slotB);
                                        return (
                                            <SplitCell matchId={m.id} teamA={teamA} teamB={teamB} winner={winner}
                                                onChampionPath={championPath.has(m.id)} slotH={SH.SF}
                                                connectorSide="single" mirrored onPick={onPick} locked={locked}
                                                odds={oddsFor(teamA, teamB)} />
                                        );
                                    })()}
                                </div>
                            </Column>

                            <Column label="1/4" widthClass={colW}>
                                <div className="flex flex-col" style={{ height: halfH }}>
                                    {QF_MATCHES.slice(2).map((m, i) => cell(m, i, true, SH.QF))}
                                </div>
                            </Column>

                            <Column label="1/8" widthClass={colW}>
                                <div className="flex flex-col" style={{ height: halfH }}>
                                    {D16_MATCHES.slice(4).map((m, i) => cell(m, i, true, SH.D16))}
                                </div>
                            </Column>

                            <Column label="16avos" widthClass={colW}>
                                <div className="flex flex-col" style={{ height: halfH }}>
                                    {D32_MATCHES.slice(8).map((m, i) => cell(m, i, true, SH.D32))}
                                </div>
                            </Column>

                        </div>
                    );
                })()}

            </div>
        </>
    );
}
