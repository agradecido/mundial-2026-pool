"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { getFlag } from "@/lib/flags";
import { getUserBracket } from "@/app/porra/actions";
import PorraDetailModal from "@/components/porra-detail-modal";
import type { UserBracketData } from "@/app/porra/actions";
import type { BracketScore } from "@/lib/bracket-scoring";

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_STYLES = [
  { ring: "ring-yellow-400/40", border: "border-yellow-400/20", text: "text-yellow-400", bg: "bg-yellow-400/10" },
  { ring: "ring-gray-300/40", border: "border-gray-300/15", text: "text-gray-300", bg: "bg-gray-300/10" },
  { ring: "ring-orange-500/40", border: "border-orange-500/20", text: "text-orange-400", bg: "bg-orange-500/10" },
];

export interface RankedPorraEntry {
  user: { id: string; name: string | null; image: string | null };
  score: BracketScore;
  completion: { done: number; total: number };
  campeon: string | undefined;
  subcampeon: string | undefined;
}

interface Props {
  entries: RankedPorraEntry[];
  currentUserId: string;
}

export default function PorraRanking({ entries, currentUserId }: Props) {
  const [detail, setDetail] = useState<UserBracketData | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const openDetail = useCallback(async (userId: string) => {
    setLoading(userId);
    try {
      const data = await getUserBracket(userId);
      setDetail(data);
    } finally {
      setLoading(null);
    }
  }, []);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <>
      {detail && (
        <PorraDetailModal data={detail} onClose={() => setDetail(null)} />
      )}

      {/* Podium */}
      {top3.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {top3.map((entry, i) => {
            const c = PODIUM_STYLES[i];
            const isMe = entry.user.id === currentUserId;
            const isLoading = loading === entry.user.id;
            return (
              <div
                key={entry.user.id}
                onClick={() => openDetail(entry.user.id)}
                className={`glass-card border ${c.border} p-5 flex flex-col items-center text-center gap-3
                  cursor-pointer hover:border-white/20 hover:bg-white/[0.06] transition-all select-none
                  ${isMe ? "ring-1 ring-[#00e87a]/25" : ""}
                  ${isLoading ? "opacity-60" : ""}`}
              >
                <span className="text-4xl leading-none">{MEDALS[i]}</span>

                {entry.user.image ? (
                  <Image
                    src={entry.user.image}
                    alt=""
                    width={60}
                    height={60}
                    className={`rounded-full ring-2 ${c.ring}`}
                  />
                ) : (
                  <div className={`w-[60px] h-[60px] rounded-full ${c.bg} ring-2 ${c.ring} flex items-center justify-center text-xl font-bold ${c.text}`}>
                    {entry.user.name?.[0] ?? "?"}
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-white leading-snug">
                    {entry.user.name ?? "—"}
                    {isMe && <span className="ml-1.5 text-[10px] font-medium text-[#00e87a]">tú</span>}
                  </p>
                  <p className={`text-3xl font-bold mt-1.5 tabular-nums ${c.text}`}>
                    {isLoading ? "…" : entry.score.total}
                  </p>
                  <p className="text-xs text-gray-600 -mt-0.5">puntos</p>
                </div>

                <div className="border-t border-white/[0.07] pt-3 w-full space-y-1.5">
                  <p className="text-[9px] font-semibold text-gray-700 uppercase tracking-widest text-center">Campeón elegido</p>
                  {entry.campeon ? (
                    <div className="flex items-center gap-1.5 justify-center text-xs">
                      <span className="text-base">{getFlag(entry.campeon)}</span>
                      <span className="truncate font-medium text-gray-300">{entry.campeon}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-700 text-center">Sin pick</p>
                  )}
                  <p className="text-[8px] font-semibold text-gray-700 uppercase tracking-widest text-center">Subcampeón</p>
                  {entry.subcampeon && (
                    <div className="flex items-center gap-1 justify-center text-[10px] text-gray-600">
                      <span className="text-xs">{getFlag(entry.subcampeon)}</span>
                      <span className="truncate">{entry.subcampeon}</span>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-gray-700">
                  {entry.completion.done}/{entry.completion.total} fases
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      {rest.length > 0 && (
        <div className="glass-card overflow-hidden !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Jugador</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Campeón</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">Fases</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((entry, i) => {
                const pos = i + 4;
                const isMe = entry.user.id === currentUserId;
                const isLoading = loading === entry.user.id;
                return (
                  <tr
                    key={entry.user.id}
                    onClick={() => openDetail(entry.user.id)}
                    className={`border-b border-white/[0.04] last:border-0 cursor-pointer transition-colors select-none
                      ${isMe ? "bg-[#00e87a]/[0.04] hover:bg-[#00e87a]/[0.07]" : "hover:bg-white/[0.03]"}
                      ${isLoading ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{pos}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {entry.user.image ? (
                          <Image src={entry.user.image} alt="" width={28} height={28} className="rounded-full shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                            {entry.user.name?.[0] ?? "?"}
                          </div>
                        )}
                        <span className={`font-medium truncate ${isMe ? "text-[#00e87a]" : "text-gray-200"}`}>
                          {entry.user.name ?? "—"}
                          {isMe && <span className="ml-1.5 text-[10px] text-gray-500">(tú)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {entry.campeon ? (
                        <div className="space-y-0.5">
                          <span className="flex items-center gap-1.5 text-xs">
                            <span>{getFlag(entry.campeon)}</span>
                            <span className="truncate max-w-[120px] text-gray-300">{entry.campeon}</span>
                          </span>
                          {entry.subcampeon && (
                            <span className="flex items-center gap-1 text-[10px] text-gray-600">
                              <span>{getFlag(entry.subcampeon)}</span>
                              <span className="truncate max-w-[100px]">{entry.subcampeon}</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-700">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs hidden sm:table-cell tabular-nums">
                      {entry.completion.done}/{entry.completion.total}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-white">
                      {isLoading ? "…" : entry.score.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
