"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getFlag } from "@/lib/flags";

// Local map so this client component has no server-only imports
const FD_TO_DB: Record<string, string> = {
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Congo DR": "DR Congo",
  "Korea Republic": "South Korea",
  "United States": "USA",
  "Cape Verde Islands": "Cape Verde",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Czechia": "Czech Republic",
};
function fdName(name: string) { return FD_TO_DB[name] ?? name; }

interface Goal {
  minute: number;
  injuryTime?: number | null;
  type: string;
  team: { id: number; name: string };
  scorer: { id: number; name: string };
  assist: { id: number; name: string } | null;
}

interface Booking {
  minute: number;
  team: { id: number; name: string };
  player: { id: number; name: string };
  card: string;
}

interface LiveData {
  status: string;
  minute?: number | null;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
    duration: string;
  };
  goals?: Goal[];
  bookings?: Booking[];
}

interface Props {
  equipoLocal: string;
  equipoVisitante: string;
  onClose: () => void;
}

const REFRESH_MS = 60_000;

function minStr(minute: number, injuryTime?: number | null) {
  return injuryTime ? `${minute}+${injuryTime}'` : `${minute}'`;
}

function getStatusLabel(data: LiveData): { text: string; color: string } {
  if (data.status === "PAUSED") return { text: "Descanso", color: "text-blue-300" };
  if (data.score.duration === "PENALTY_SHOOTOUT") return { text: "Penaltis", color: "text-red-400" };
  if (data.score.duration === "EXTRA_TIME") return { text: "Prórroga", color: "text-orange-300" };
  if (data.minute != null) {
    return { text: data.minute <= 45 ? "1ª Parte" : "2ª Parte", color: "text-yellow-300" };
  }
  return { text: "En Juego", color: "text-yellow-300" };
}

export default function LiveMatchModal({ equipoLocal, equipoVisitante, onClose }: Props) {
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/partidos/live?team1=${encodeURIComponent(equipoLocal)}&team2=${encodeURIComponent(equipoVisitante)}`,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? `Error ${res.status}`);
      }
      setLiveData(await res.json() as LiveData);
      setError(null);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [equipoLocal, equipoVisitante]);

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, REFRESH_MS);
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => {
      clearInterval(interval);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [fetchLive, onClose]);

  const events: Array<(Goal & { kind: "goal" }) | (Booking & { kind: "booking" })> = [
    ...(liveData?.goals?.map(g => ({ ...g, kind: "goal" as const })) ?? []),
    ...(liveData?.bookings?.map(b => ({ ...b, kind: "booking" as const })) ?? []),
  ].sort((a, b) => a.minute - b.minute);

  const sl = liveData ? getStatusLabel(liveData) : null;
  const scoreHome = liveData?.score.fullTime.home ?? 0;
  const scoreAway = liveData?.score.fullTime.away ?? 0;
  const htHome = liveData?.score.halfTime.home;
  const htAway = liveData?.score.halfTime.away;
  const showHT = htHome != null && htAway != null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md max-h-[85dvh] flex flex-col rounded-2xl border border-yellow-400/20 bg-[#0c0c18] shadow-2xl overflow-hidden">
        {/* Top glow — yellow for live */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-yellow-300 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-3 py-1">
              <span className="size-1.5 rounded-full bg-yellow-300 animate-pulse" />
              En Juego
              {liveData?.minute != null && (
                <span className="font-mono ml-0.5">{minStr(liveData.minute)}</span>
              )}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
            >✕</button>
          </div>

          {/* Scoreboard */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <span className="text-4xl leading-none">{getFlag(equipoLocal)}</span>
              <span className="text-xs font-semibold text-gray-300 text-center leading-tight truncate w-full">{equipoLocal}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <span className="text-4xl font-bold text-white tabular-nums tracking-tight">
                {scoreHome}–{scoreAway}
              </span>
              {showHT && (
                <span className="text-[10px] text-gray-600 tabular-nums">
                  HT {htHome}–{htAway}
                </span>
              )}
              {sl && <span className={`text-[11px] font-semibold mt-0.5 ${sl.color}`}>{sl.text}</span>}
            </div>
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <span className="text-4xl leading-none">{getFlag(equipoVisitante)}</span>
              <span className="text-xs font-semibold text-gray-300 text-center leading-tight truncate w-full">{equipoVisitante}</span>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 border-t border-white/[0.06]">
          {loading && (
            <div className="flex justify-center items-center py-14">
              <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-yellow-300 animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div className="px-5 py-10 text-center space-y-3">
              <p className="text-sm text-gray-600">{error}</p>
              <button
                onClick={() => { setLoading(true); fetchLive(); }}
                className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && liveData && (
            <div className="px-4 py-2">
              {events.length > 0 ? (
                <div className="divide-y divide-white/[0.04]">
                  {events.map((ev, i) => {
                    const teamFlag = getFlag(fdName(ev.team.name));

                    if (ev.kind === "goal") {
                      const emoji = ev.type === "OWN_GOAL" ? "🔄" : ev.type === "PENALTY" ? "⚽ P" : "⚽";
                      return (
                        <div key={i} className="py-2.5 flex items-start gap-2.5">
                          <span className="text-[11px] font-mono text-gray-600 shrink-0 pt-0.5 w-11 text-right">
                            {minStr(ev.minute, ev.injuryTime)}
                          </span>
                          <span className="text-base shrink-0 pt-0.5">{teamFlag}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white leading-snug">
                              {emoji} <span className="font-medium">{ev.scorer.name}</span>
                              {ev.type === "OWN_GOAL" && (
                                <span className="text-xs text-gray-600 ml-1">(p.p.)</span>
                              )}
                            </p>
                            {ev.assist && (
                              <p className="text-[11px] text-gray-600 mt-0.5">
                                Asist. {ev.assist.name}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      const cardEmoji =
                        ev.card === "RED_CARD" ? "🟥" :
                        ev.card === "YELLOW_RED_CARD" ? "🟨🟥" : "🟨";
                      return (
                        <div key={i} className="py-2.5 flex items-center gap-2.5">
                          <span className="text-[11px] font-mono text-gray-600 shrink-0 w-11 text-right">
                            {minStr(ev.minute)}
                          </span>
                          <span className="text-base shrink-0">{teamFlag}</span>
                          <span className="text-sm text-gray-400 flex-1 min-w-0 truncate">
                            {cardEmoji} {ev.player.name}
                          </span>
                        </div>
                      );
                    }
                  })}
                </div>
              ) : (
                <p className="text-center text-xs text-gray-700 py-8">
                  Sin eventos registrados aún
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-white/[0.05] px-4 py-2.5 flex items-center justify-between">
          <p className="text-[10px] text-gray-700">
            {updatedAt
              ? `Actualizado ${updatedAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
              : "Cargando…"}
          </p>
          <button
            onClick={() => { setLoading(true); fetchLive(); }}
            className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
          >
            ↻ Actualizar
          </button>
        </div>
      </div>
    </div>
  );
}
