"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RankingView from "@/components/ranking-view";
import PorraRanking from "@/components/porra-ranking";
import type { RankedPorraEntry } from "@/components/porra-ranking";
import PreTournamentWithModal from "@/components/pre-tournament-with-modal";
import type { PreTournamentEntry } from "@/components/pre-tournament-list";
import GruposPorraRanking from "@/components/grupos-porra-ranking";
import type { GrupoPorraEntry } from "@/components/grupos-porra-ranking";

interface QuinielaEntry {
    id: string;
    name: string | null;
    image: string | null;
    total: number;
    exactos: number;
    tendencias: number;
    tendenciaReciente: "up2" | "up1" | "flat" | "down1" | "down2" | null;
}

type LivePartido = {
    id: string;
    equipoLocal: string;
    equipoVisitante: string;
    fase: string;
    pronosticos: Array<{ userId: string; golesLocal: number; golesVisitante: number }>;
};

type Tab = "quiniela" | "porra" | "grupos";

interface Props {
    activeTab: Tab;
    quinielaRanking: QuinielaEntry[];
    porraEntries: RankedPorraEntry[];
    gruposRanking: GrupoPorraEntry[];
    currentUserId: string;
    tournamentStarted: boolean;
    preTournamentQuinielaEntries: PreTournamentEntry[];
    preTournamentPorraEntries: PreTournamentEntry[];
    livePartidos: LivePartido[];
}

function tend(l: number, r: number): "L" | "V" | "E" {
    if (l > r) return "L";
    if (l < r) return "V";
    return "E";
}

function calcPoints(pL: number, pV: number, rL: number, rV: number, fase: string): number {
    const mult = fase === "GRUPOS" ? 1 : 2;
    if (pL === rL && pV === rV) return 5 * mult;
    if (tend(pL, pV) === tend(rL, rV)) return 3 * mult;
    if (pL === rL || pV === rV) return 1 * mult;
    return 0;
}

async function fetchSingleScore(p: LivePartido): Promise<{ partido: LivePartido; home: number; away: number } | null> {
    try {
        const res = await fetch(
            `/api/partidos/score-live?team1=${encodeURIComponent(p.equipoLocal)}&team2=${encodeURIComponent(p.equipoVisitante)}`
        );
        if (!res.ok) return null;
        const data = await res.json() as { home: number; away: number };
        return { partido: p, home: data.home, away: data.away };
    } catch {
        return null;
    }
}

function buildLiveRanking(
    base: QuinielaEntry[],
    results: Array<{ partido: LivePartido; home: number; away: number }>
): QuinielaEntry[] {
    const extra = new Map<string, number>();
    for (const { partido, home, away } of results) {
        for (const pr of partido.pronosticos) {
            const pts = calcPoints(pr.golesLocal, pr.golesVisitante, home, away, partido.fase);
            extra.set(pr.userId, (extra.get(pr.userId) ?? 0) + pts);
        }
    }
    return base
        .map(u => ({ ...u, total: u.total + (extra.get(u.id) ?? 0) }))
        .sort((a, b) => {
            if (b.total !== a.total) return b.total - a.total;
            if (b.exactos !== a.exactos) return b.exactos - a.exactos;
            if (b.tendencias !== a.tendencias) return b.tendencias - a.tendencias;
            return 0;
        });
}

function liveButtonClass(liveMode: boolean, hasLive: boolean): string {
    if (liveMode) return "border-amber-400/50 bg-amber-400/15 text-amber-400 hover:bg-amber-400/25";
    if (hasLive) return "border-white/15 bg-white/[0.05] text-gray-400 hover:text-gray-200 hover:border-white/25";
    return "border-white/5 bg-white/[0.02] text-gray-700 cursor-not-allowed";
}

function PorraTabContent({
    tournamentStarted,
    porraEntries,
    currentUserId,
    preTournamentPorraEntries,
}: Readonly<{
    tournamentStarted: boolean;
    porraEntries: RankedPorraEntry[];
    currentUserId: string;
    preTournamentPorraEntries: PreTournamentEntry[];
}>) {
    const rankingContent = porraEntries.length === 0
        ? <div className="glass-card p-16 text-center space-y-4"><p className="text-gray-600 text-sm">Nadie ha rellenado la porra todavía</p></div>
        : <PorraRanking entries={porraEntries} currentUserId={currentUserId} />;

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Ranking Porra</h2>
                <p className="text-sm text-gray-500 mt-1">Puntos del bracket completo</p>
            </div>
            {tournamentStarted ? rankingContent : (
                <PreTournamentWithModal
                    entries={preTournamentPorraEntries}
                    currentUserId={currentUserId}
                    mode="porra"
                    subtitle="Puedes ver las predicciones de los participantes, pero podrán ser modificadas tantas veces se quiera hasta 15 minutos antes de que empiece el Mundial."
                />
            )}
        </div>
    );
}

export default function RankingTabs({
    activeTab,
    quinielaRanking,
    porraEntries,
    gruposRanking,
    currentUserId,
    tournamentStarted,
    preTournamentQuinielaEntries,
    preTournamentPorraEntries,
    livePartidos,
}: Readonly<Props>) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [pendingTab, setPendingTab] = useState<Tab | null>(null);

    // ── Live mode ──────────────────────────────────────────────────────────────
    const [liveMode, setLiveMode] = useState(false);
    const [liveFetching, setLiveFetching] = useState(false);
    const [liveRanking, setLiveRanking] = useState<QuinielaEntry[] | null>(null);
    const [liveScores, setLiveScores] = useState<Array<{ local: string; visitante: string; gl: number; gv: number }>>([]);

    const hasLiveMatches = livePartidos.length > 0;

    async function activateLive() {
        if (liveMode) {
            setLiveMode(false);
            setLiveRanking(null);
            setLiveScores([]);
            return;
        }
        setLiveFetching(true);
        try {
            const results = await Promise.all(livePartidos.map(fetchSingleScore));
            const valid = results.filter((r): r is NonNullable<typeof r> => r !== null);
            setLiveRanking(buildLiveRanking(quinielaRanking, valid));
            setLiveScores(valid.map(({ partido, home, away }) => ({
                local: partido.equipoLocal,
                visitante: partido.equipoVisitante,
                gl: home,
                gv: away,
            })));
            setLiveMode(true);
        } finally {
            setLiveFetching(false);
        }
    }

    async function refreshLive() {
        setLiveMode(false);
        setLiveRanking(null);
        setLiveScores([]);
        setLiveFetching(true);
        try {
            const results = await Promise.all(livePartidos.map(fetchSingleScore));
            const valid = results.filter((r): r is NonNullable<typeof r> => r !== null);
            setLiveRanking(buildLiveRanking(quinielaRanking, valid));
            setLiveScores(valid.map(({ partido, home, away }) => ({
                local: partido.equipoLocal,
                visitante: partido.equipoVisitante,
                gl: home,
                gv: away,
            })));
            setLiveMode(true);
        } finally {
            setLiveFetching(false);
        }
    }

    // ── Tab navigation ─────────────────────────────────────────────────────────
    const handleTabChange = (tab: Tab) => {
        if (tab === activeTab) return;
        const params = new URLSearchParams(searchParams);
        params.set("tab", tab);
        setPendingTab(tab);
        startTransition(() => {
            router.push(`/ranking?${params.toString()}`);
        });
    };

    const tabs: Array<{ id: Tab; label: string }> = [
        { id: "quiniela", label: "⚽ Quiniela" },
        { id: "porra", label: "🏆 Porra" },
        { id: "grupos", label: "👥 Porra grupos" },
    ];

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/[0.07]">
                {tabs.map(({ id, label }) => {
                    const active = activeTab === id;
                    const loading = isPending && pendingTab === id;
                    return (
                        <button
                            key={id}
                            onClick={() => handleTabChange(id)}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all relative [touch-action:manipulation] active:scale-[0.97]
            ${active ? "text-[#00e87a]" : "text-gray-500 hover:text-gray-300"}`}
                        >
                            {label}
                            {loading && (
                                <span
                                    className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
                                    aria-hidden
                                />
                            )}
                            {active && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00e87a]" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {activeTab === "quiniela" && (
                <div>
                    <div className="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">Ranking Quiniela</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Haz click en los usuarios para ver sus pronósticos.
                            </p>
                        </div>
                        {tournamentStarted && (
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={activateLive}
                                    disabled={!hasLiveMatches || liveFetching}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${liveButtonClass(liveMode, hasLiveMatches)}`}
                                >
                                    {liveFetching ? (
                                        <span className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                                    ) : (
                                        <span className={`text-[10px] ${liveMode ? "animate-pulse" : ""}`}>●</span>
                                    )}
                                    En vivo
                                </button>
                                {liveMode && (
                                    <button
                                        onClick={refreshLive}
                                        disabled={liveFetching}
                                        className="text-xs text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-40"
                                        title="Actualizar marcadores"
                                    >
                                        ↺
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Live scores banner */}
                    {liveMode && liveScores.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-3">
                            {liveScores.map(s => (
                                <div
                                    key={`${s.local}|${s.visitante}`}
                                    className="inline-flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/8 px-3 py-1.5 text-xs text-amber-300"
                                >
                                    <span className="text-[10px] text-amber-400 animate-pulse">●</span>
                                    <span>{s.local}</span>
                                    <span className="font-mono font-bold tabular-nums">{s.gl} – {s.gv}</span>
                                    <span>{s.visitante}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {tournamentStarted ? (
                        <RankingView
                            ranking={liveRanking ?? quinielaRanking}
                            currentUserId={currentUserId}
                        />
                    ) : (
                        <PreTournamentWithModal
                            entries={preTournamentQuinielaEntries}
                            currentUserId={currentUserId}
                            mode="quiniela"
                            subtitle="Puedes ver las predicciones de los participantes, pero podrán ser modificadas tantas veces se quiera hasta 15 minutos antes de que empiece el Mundial."
                        />
                    )}
                </div>
            )}
            {activeTab === "porra" && (
                <PorraTabContent
                    tournamentStarted={tournamentStarted}
                    porraEntries={porraEntries}
                    currentUserId={currentUserId}
                    preTournamentPorraEntries={preTournamentPorraEntries}
                />
            )}
            {activeTab === "grupos" && (
                <div>
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-white">Porra grupos</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Clasificación de grupos por puntuación media de sus participantes
                        </p>
                    </div>
                    <GruposPorraRanking grupos={gruposRanking} />
                </div>
            )}
        </div>
    );
}
