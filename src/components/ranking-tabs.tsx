"use client";

import { useRouter, useSearchParams } from "next/navigation";
import RankingView from "@/components/ranking-view";
import PorraRanking from "@/components/porra-ranking";
import type { RankedPorraEntry } from "@/components/porra-ranking";
import PreTournamentList from "@/components/pre-tournament-list";
import type { PreTournamentEntry } from "@/components/pre-tournament-list";

interface QuinielaEntry {
    id: string;
    name: string | null;
    image: string | null;
    total: number;
    exactos: number;
    tendencias: number;
}

interface Props {
    activeTab: "quiniela" | "porra";
    quinielaRanking: QuinielaEntry[];
    porraEntries: RankedPorraEntry[];
    currentUserId: string;
    tournamentStarted: boolean;
    preTournamentEntries: PreTournamentEntry[];
}

export default function RankingTabs({
    activeTab,
    quinielaRanking,
    porraEntries,
    currentUserId,
    tournamentStarted,
    preTournamentEntries,
}: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleTabChange = (tab: "quiniela" | "porra") => {
        const params = new URLSearchParams(searchParams);
        params.set("tab", tab);
        router.push(`/ranking?${params.toString()}`);
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/[0.07]">
                <button
                    onClick={() => handleTabChange("quiniela")}
                    className={`px-4 py-2.5 text-sm font-semibold transition-all relative
            ${activeTab === "quiniela"
                            ? "text-[#00e87a]"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                >
                    ⚽ Quiniela
                    {activeTab === "quiniela" && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00e87a]" />
                    )}
                </button>
                <button
                    onClick={() => handleTabChange("porra")}
                    className={`px-4 py-2.5 text-sm font-semibold transition-all relative
            ${activeTab === "porra"
                            ? "text-[#00e87a]"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                >
                    🏆 Porra
                    {activeTab === "porra" && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00e87a]" />
                    )}
                </button>
            </div>

            {/* Content */}
            {activeTab === "quiniela" ? (
                <div>
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-white">Ranking Quiniela</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Puntos de partidos + predicciones especiales
                        </p>
                    </div>
                    {tournamentStarted ? (
                        <RankingView ranking={quinielaRanking} currentUserId={currentUserId} />
                    ) : (
                        <PreTournamentList
                            entries={preTournamentEntries}
                            currentUserId={currentUserId}
                            subtitle="El ranking se mostrará cuando empiece el Mundial. Mientras tanto, participantes ordenados actividad."
                        />
                    )}
                </div>
            ) : (
                <div>
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-white">Ranking Porra</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Puntos del bracket completo
                        </p>
                    </div>
                    {!tournamentStarted ? (
                        <PreTournamentList
                            entries={preTournamentEntries}
                            currentUserId={currentUserId}
                            subtitle="El ranking se mostrará cuando empiece el Mundial. Mientras tanto, participantes ordenados actividad."
                        />
                    ) : porraEntries.length === 0 ? (
                        <div className="glass-card p-16 text-center space-y-4">
                            <p className="text-gray-600 text-sm">Nadie ha rellenado la porra todavía</p>
                        </div>
                    ) : (
                        <PorraRanking entries={porraEntries} currentUserId={currentUserId} />
                    )}
                </div>
            )}
        </div>
    );
}
