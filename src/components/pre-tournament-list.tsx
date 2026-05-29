"use client";

import Image from "next/image";

export interface PreTournamentEntry {
    id: string;
    name: string | null;
    image: string | null;
    ultimoAcceso: string | null; // ISO string (serializable across server/client)
    numPronosticos: number;
    bracketDone: number;
}

interface Props {
    entries: PreTournamentEntry[];
    currentUserId: string;
    mode: "quiniela" | "porra";
    subtitle?: string;
}


export default function PreTournamentList({ entries, currentUserId, mode, subtitle }: Props) {
    if (entries.length === 0) {
        return (
            <div className="glass-card p-16 text-center text-gray-600">
                Aún no hay participantes
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {subtitle && (
                <p className="text-xs text-gray-500">{subtitle}</p>
            )}
            <div className="glass-card overflow-hidden !p-0">
                <ul className="divide-y divide-white/[0.04]">
                    {entries.map((u) => {
                        const isMe = u.id === currentUserId;
                        return (
                            <li
                                key={u.id}
                                className={`flex items-center gap-3 px-4 py-3 transition-colors ${isMe ? "bg-[#00e87a]/[0.04]" : ""
                                    }`}
                            >
                                {u.image ? (
                                    <Image
                                        src={u.image}
                                        alt=""
                                        width={36}
                                        height={36}
                                        className="rounded-full shrink-0"
                                    />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-gray-400 shrink-0">
                                        {u.name?.[0] ?? "?"}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${isMe ? "text-[#00e87a]" : "text-gray-200"}`}>
                                        {u.name ?? "—"}
                                        {isMe && <span className="ml-1.5 text-xs text-gray-500">(tú)</span>}
                                    </p>
                                </div>
                                <span className="text-xs text-gray-500 tabular-nums shrink-0">
                                    {mode === "porra"
                                        ? `${u.bracketDone} / 7`
                                        : `${u.numPronosticos} / 104`}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
