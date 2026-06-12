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
}

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
}: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [pendingTab, setPendingTab] = useState<Tab | null>(null);

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
            {activeTab === "quiniela" ? (
                <div>
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-white">Ranking Quiniela</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Haz click en los usuarios para ver sus pronósticos.
                        </p>
                    </div>
                    {tournamentStarted ? (
                        <RankingView ranking={quinielaRanking} currentUserId={currentUserId} />
                    ) : (
                        <PreTournamentWithModal
                            entries={preTournamentQuinielaEntries}
                            currentUserId={currentUserId}
                            mode="quiniela"
                            subtitle="Puedes ver las predicciones de los participantes, pero podrán ser modificadas tantas veces se quiera hasta 15 minutos antes de que empiece el Mundial."
                        />
                    )}
                </div>
            ) : activeTab === "porra" ? (
                <div>
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-white">Ranking Porra</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Puntos del bracket completo
                        </p>
                    </div>
                    {!tournamentStarted ? (
                        <PreTournamentWithModal
                            entries={preTournamentPorraEntries}
                            currentUserId={currentUserId}
                            mode="porra"
                            subtitle="Puedes ver las predicciones de los participantes, pero podrán ser modificadas tantas veces se quiera hasta 15 minutos antes de que empiece el Mundial."
                        />
                    ) : porraEntries.length === 0 ? (
                        <div className="glass-card p-16 text-center space-y-4">
                            <p className="text-gray-600 text-sm">Nadie ha rellenado la porra todavía</p>
                        </div>
                    ) : (
                        <PorraRanking entries={porraEntries} currentUserId={currentUserId} />
                    )}
                </div>
            ) : (
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
