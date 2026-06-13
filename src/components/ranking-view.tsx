"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { getUserDetail } from "@/app/ranking/actions";
import UserDetailModal from "@/components/user-detail-modal";
import type { UserDetail } from "@/app/ranking/actions";

const MEDALS = ["🥇", "🥈", "🥉"];

const PODIUM = [
  { ring: "ring-yellow-400/40", border: "border-yellow-400/20", text: "text-yellow-400", bg: "bg-yellow-400/10" },
  { ring: "ring-gray-300/40", border: "border-gray-300/15", text: "text-gray-300", bg: "bg-gray-300/10" },
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
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState<string | null>(null); // userId being loaded
  const [navigating, setNavigating] = useState(false);
  const detailCache = useRef<Map<string, UserDetail>>(new Map());

  const fetchDetail = useCallback(async (userId: string): Promise<UserDetail> => {
    const cached = detailCache.current.get(userId);
    if (cached) return cached;
    const data = await getUserDetail(userId);
    detailCache.current.set(userId, data);
    return data;
  }, []);

  const openDetail = useCallback(async (userId: string) => {
    const cached = detailCache.current.get(userId);
    if (cached) { setDetail(cached); return; }
    setLoading(userId);
    try {
      const data = await fetchDetail(userId);
      setDetail(data);
    } finally {
      setLoading(null);
    }
  }, [fetchDetail]);

  const closeDetail = useCallback(() => setDetail(null), []);

  const currentIndex = detail ? ranking.findIndex((u) => u.id === detail.id) : -1;

  const navigateTo = useCallback(async (userId: string) => {
    const cached = detailCache.current.get(userId);
    if (cached) { setDetail(cached); return; }
    setNavigating(true);
    try {
      const data = await fetchDetail(userId);
      setDetail(data);
    } finally {
      setNavigating(false);
    }
  }, [fetchDetail]);

  // Prefetch adjacent users so first swipe is instant
  useEffect(() => {
    if (!detail) return;
    const idx = ranking.findIndex((u) => u.id === detail.id);
    const prefetch = (id: string) => {
      if (!detailCache.current.has(id)) fetchDetail(id).catch(() => {});
    };
    if (idx > 0) prefetch(ranking[idx - 1].id);
    if (idx < ranking.length - 1) prefetch(ranking[idx + 1].id);
  }, [detail?.id, fetchDetail, ranking]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) navigateTo(ranking[currentIndex - 1].id);
  }, [currentIndex, navigateTo, ranking]);

  const handleNext = useCallback(() => {
    if (currentIndex < ranking.length - 1) navigateTo(ranking[currentIndex + 1].id);
  }, [currentIndex, navigateTo, ranking]);

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  const rowBase =
    "cursor-pointer select-none transition-colors border border-transparent rounded-xl";

  const loadingUser = loading ? ranking.find((u) => u.id === loading) : null;

  return (
    <>
      {/* ── Loading overlay ── */}
      {loading && !detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4">
            {loadingUser?.image ? (
              <Image src={loadingUser.image} alt="" width={64} height={64} className="rounded-full ring-2 ring-white/10 opacity-80" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/8 flex items-center justify-center text-xl font-bold text-gray-400">
                {loadingUser?.name?.[0] ?? "?"}
              </div>
            )}
            {loadingUser && (
              <p className="text-sm text-gray-400 font-medium">{loadingUser.name?.split(" ")[0]}</p>
            )}
            <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#00e87a] animate-spin" />
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {detail && (
        <UserDetailModal
          detail={detail}
          position={currentIndex + 1}
          onClose={closeDetail}
          onPrev={currentIndex > 0 ? handlePrev : undefined}
          onNext={currentIndex < ranking.length - 1 ? handleNext : undefined}
          isNavigating={navigating}
          totalUsers={ranking.length}
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
                <span className="text-5xl leading-none">{MEDALS[i]}</span>

                {user.image ? (
                  <Image src={user.image} alt="" width={80} height={80} className={`rounded-full ring-2 ${c.ring}`} />
                ) : (
                  <div className={`w-[80px] h-[80px] rounded-full ${c.bg} ring-2 ${c.ring} flex items-center justify-center text-2xl font-bold ${c.text}`}>
                    {user.name?.[0] ?? "?"}
                  </div>
                )}

                <div>
                  <p className="text-base font-semibold text-white leading-snug">
                    {user.name ?? "—"}
                    {isMe && <span className="ml-1.5 text-xs font-medium text-[#00e87a]">tú</span>}
                  </p>
                  <p className={`text-4xl font-bold mt-1.5 tabular-nums ${c.text}`}>
                    {isLoading ? "…" : user.total}
                  </p>
                  <p className="text-sm text-gray-600 -mt-0.5">puntos</p>
                </div>

                <div className="flex gap-4 text-sm text-gray-500 border-t border-white/[0.07] pt-3 w-full justify-center">
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
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-600 w-12">#</th>
                <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-600">Jugador</th>
                <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wider text-gray-600">Pts</th>
                <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">Exactos</th>
                <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">Tend.</th>
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
                    <td className="px-4 py-3.5 text-gray-600 font-mono text-sm">{i + 4}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <Image src={user.image} alt="" width={36} height={36} className="rounded-full" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-gray-400">
                            {user.name?.[0] ?? "?"}
                          </div>
                        )}
                        <span className={`font-medium ${isMe ? "text-[#00e87a]" : "text-gray-200"}`}>
                          {user.name ?? "—"}
                          {isMe && <span className="ml-1.5 text-xs text-gray-500">(tú)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-white tabular-nums">
                      {isLoading ? "…" : user.total}
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-500 hidden sm:table-cell tabular-nums">{user.exactos}</td>
                    <td className="px-4 py-3.5 text-right text-gray-500 hidden sm:table-cell tabular-nums">{user.tendencias}</td>
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
