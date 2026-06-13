"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const detailCache = useRef<Map<string, UserBracketData>>(new Map());

  const fetchDetail = useCallback(async (userId: string): Promise<UserBracketData> => {
    const cached = detailCache.current.get(userId);
    if (cached) return cached;
    const data = await getUserBracket(userId);
    detailCache.current.set(userId, data);
    return data;
  }, []);

  const showDetail = useCallback((userId: string, data: UserBracketData) => {
    setDetail(data);
    setDetailUserId(userId);
  }, []);

  const openDetail = useCallback(async (userId: string) => {
    const cached = detailCache.current.get(userId);
    if (cached) { showDetail(userId, cached); return; }
    setLoading(userId);
    try {
      const data = await fetchDetail(userId);
      showDetail(userId, data);
    } finally {
      setLoading(null);
    }
  }, [fetchDetail, showDetail]);

  const closeDetail = useCallback(() => { setDetail(null); setDetailUserId(null); }, []);

  const currentIndex = detailUserId ? entries.findIndex((e) => e.user.id === detailUserId) : -1;

  const navigateTo = useCallback(async (userId: string) => {
    const cached = detailCache.current.get(userId);
    if (cached) { showDetail(userId, cached); return; }
    setNavigating(true);
    try {
      const data = await fetchDetail(userId);
      showDetail(userId, data);
    } finally {
      setNavigating(false);
    }
  }, [fetchDetail, showDetail]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) navigateTo(entries[currentIndex - 1].user.id);
  }, [currentIndex, navigateTo, entries]);

  const handleNext = useCallback(() => {
    if (currentIndex < entries.length - 1) navigateTo(entries[currentIndex + 1].user.id);
  }, [currentIndex, navigateTo, entries]);

  // Prefetch adjacent users
  useEffect(() => {
    if (!detailUserId) return;
    const idx = entries.findIndex((e) => e.user.id === detailUserId);
    const prefetch = (id: string) => {
      if (!detailCache.current.has(id)) fetchDetail(id).catch(() => {});
    };
    if (idx > 0) prefetch(entries[idx - 1].user.id);
    if (idx < entries.length - 1) prefetch(entries[idx + 1].user.id);
  }, [detailUserId, fetchDetail, entries]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <>
      {detail && (
        <PorraDetailModal
          data={detail}
          onClose={closeDetail}
          position={currentIndex + 1}
          totalUsers={entries.length}
          onPrev={currentIndex > 0 ? handlePrev : undefined}
          onNext={currentIndex < entries.length - 1 ? handleNext : undefined}
          isNavigating={navigating}
        />
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
                <span className="text-5xl leading-none">{MEDALS[i]}</span>

                {entry.user.image ? (
                  <Image
                    src={entry.user.image}
                    alt=""
                    width={80}
                    height={80}
                    className={`rounded-full ring-2 ${c.ring}`}
                  />
                ) : (
                  <div className={`w-[80px] h-[80px] rounded-full ${c.bg} ring-2 ${c.ring} flex items-center justify-center text-2xl font-bold ${c.text}`}>
                    {entry.user.name?.[0] ?? "?"}
                  </div>
                )}

                <div>
                  <p className="text-base font-semibold text-white leading-snug">
                    {entry.user.name ?? "—"}
                    {isMe && <span className="ml-1.5 text-xs font-medium text-[#00e87a]">tú</span>}
                  </p>
                  <p className={`text-4xl font-bold mt-1.5 tabular-nums ${c.text}`}>
                    {isLoading ? "…" : entry.score.total}
                  </p>
                  <p className="text-sm text-gray-600 -mt-0.5">puntos</p>
                </div>

                <div className="border-t border-white/[0.07] pt-3 w-full space-y-1.5">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest text-center">Campeón elegido</p>
                  {entry.campeon ? (
                    <div className="flex items-center gap-1.5 justify-center text-sm">
                      <span className="text-lg">{getFlag(entry.campeon)}</span>
                      <span className="truncate font-medium text-gray-300">{entry.campeon}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 text-center">Sin pick</p>
                  )}
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest text-center">Subcampeón</p>
                  {entry.subcampeon && (
                    <div className="flex items-center gap-1 justify-center text-xs text-gray-500">
                      <span className="text-sm">{getFlag(entry.subcampeon)}</span>
                      <span className="truncate">{entry.subcampeon}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-600">
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
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-600 w-12">#</th>
                <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-600">Jugador</th>
                <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-600">Campeón</th>
                <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">Fases</th>
                <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wider text-gray-600">Pts</th>
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
                    <td className="px-4 py-3.5 text-gray-600 font-mono text-sm">{pos}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {entry.user.image ? (
                          <Image src={entry.user.image} alt="" width={36} height={36} className="rounded-full shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-gray-400 shrink-0">
                            {entry.user.name?.[0] ?? "?"}
                          </div>
                        )}
                        <span className={`font-medium truncate ${isMe ? "text-[#00e87a]" : "text-gray-200"}`}>
                          {entry.user.name ?? "—"}
                          {isMe && <span className="ml-1.5 text-xs text-gray-500">(tú)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {entry.campeon ? (
                        <div className="space-y-0.5">
                          <span className="flex items-center gap-1.5 text-sm">
                            <span>{getFlag(entry.campeon)}</span>
                            <span className="truncate max-w-[140px] text-gray-300">{entry.campeon}</span>
                          </span>
                          {entry.subcampeon && (
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <span>{getFlag(entry.subcampeon)}</span>
                              <span className="truncate max-w-[120px]">{entry.subcampeon}</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-700">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-500 text-sm hidden sm:table-cell tabular-nums">
                      {entry.completion.done}/{entry.completion.total}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold tabular-nums text-white">
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
