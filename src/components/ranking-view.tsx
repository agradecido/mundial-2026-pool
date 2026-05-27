"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { getUserDetail } from "@/app/ranking/actions";
import UserDetailModal from "@/components/user-detail-modal";
import type { UserDetail } from "@/app/ranking/actions";

const MEDALS = ["🥇", "🥈", "🥉"];

const PODIUM = [
  { ring: "ring-yellow-400/40", border: "border-yellow-400/20", text: "text-yellow-400", bg: "bg-yellow-400/10" },
  { ring: "ring-gray-300/40",   border: "border-gray-300/15",   text: "text-gray-300",   bg: "bg-gray-300/10" },
  { ring: "ring-orange-500/40", border: "border-orange-500/20", text: "text-orange-400", bg: "bg-orange-500/10" },
];

export interface RankedUser {
  id: string;
  name: string | null;
  image: string | null;
  total: number;
  exactos: number;
  tendencias: number;
}

interface Props {
  ranking: RankedUser[];
  currentUserId: string;
}

export default function RankingView({ ranking, currentUserId }: Props) {
  const [detail, setDetail]   = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState<string | null>(null); // userId being loaded

  const openDetail = useCallback(async (userId: string) => {
    setLoading(userId);
    try {
      const data = await getUserDetail(userId);
      setDetail(data);
    } finally {
      setLoading(null);
    }
  }, []);

  const closeDetail = useCallback(() => setDetail(null), []);

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  const rowBase =
    "cursor-pointer select-none transition-colors border border-transparent rounded-xl";

  return (
    <>
      {/* ── Modal ── */}
      {detail && (
        <UserDetailModal
          detail={detail}
          position={ranking.findIndex((u) => u.id === detail.id) + 1}
          onClose={closeDetail}
        />
      )}

      {/* ── Podio top 3 ── */}
      {top3.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {top3.map((user, i) => {
            const c = PODIUM[i];
            const isMe = user.id === currentUserId;
            const isLoading = loading === user.id;
            return (
              <div
                key={user.id}
                onClick={() => openDetail(user.id)}
                className={`glass-card border ${c.border} p-5 flex flex-col items-center text-center gap-3
                  cursor-pointer hover:border-white/20 hover:bg-white/[0.06] transition-all
                  ${isMe ? "ring-1 ring-[#00e87a]/25" : ""}
                  ${isLoading ? "opacity-60" : ""}`}
              >
                <span className="text-4xl leading-none">{MEDALS[i]}</span>

                {user.image ? (
                  <Image src={user.image} alt="" width={60} height={60} className={`rounded-full ring-2 ${c.ring}`} />
                ) : (
                  <div className={`w-[60px] h-[60px] rounded-full ${c.bg} ring-2 ${c.ring} flex items-center justify-center text-xl font-bold ${c.text}`}>
                    {user.name?.[0] ?? "?"}
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-white leading-snug">
                    {user.name ?? "—"}
                    {isMe && <span className="ml-1.5 text-[10px] font-medium text-[#00e87a]">tú</span>}
                  </p>
                  <p className={`text-3xl font-bold mt-1.5 tabular-nums ${c.text}`}>
                    {isLoading ? "…" : user.total}
                  </p>
                  <p className="text-xs text-gray-600 -mt-0.5">puntos</p>
                </div>

                <div className="flex gap-4 text-xs text-gray-500 border-t border-white/[0.07] pt-3 w-full justify-center">
                  <span>⭐ {user.exactos} exactos</span>
                  <span>✓ {user.tendencias} tend.</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Resto del ranking ── */}
      {rest.length > 0 && (
        <div className="glass-card overflow-hidden !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Jugador</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Pts</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">Exactos</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">Tend.</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((user, i) => {
                const isMe = user.id === currentUserId;
                const isLoading = loading === user.id;
                return (
                  <tr
                    key={user.id}
                    onClick={() => openDetail(user.id)}
                    className={`border-b border-white/[0.04] last:border-0 cursor-pointer transition-colors
                      ${isMe ? "bg-[#00e87a]/[0.04] hover:bg-[#00e87a]/[0.07]" : "hover:bg-white/[0.03]"}
                      ${isLoading ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{i + 4}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {user.image ? (
                          <Image src={user.image} alt="" width={28} height={28} className="rounded-full" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-400">
                            {user.name?.[0] ?? "?"}
                          </div>
                        )}
                        <span className={`font-medium ${isMe ? "text-[#00e87a]" : "text-gray-200"}`}>
                          {user.name ?? "—"}
                          {isMe && <span className="ml-1.5 text-[10px] text-gray-500">(tú)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-white tabular-nums">
                      {isLoading ? "…" : user.total}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell tabular-nums">{user.exactos}</td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell tabular-nums">{user.tendencias}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ranking.length === 0 && (
        <div className="glass-card p-16 text-center text-gray-600">
          Aún no hay puntuaciones disponibles
        </div>
      )}
    </>
  );
}
