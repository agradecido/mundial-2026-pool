"use client";

import { useState, useTransition, useEffect } from "react";
import { guardarPronostico } from "@/app/quiniela/actions";
import { getFlag } from "@/lib/flags";
import LiveMatchModal from "@/components/live-match-modal";
import type { EstadoPartido, Fase } from "@prisma/client";

// ── H2H types ─────────────────────────────────────────────────────────────────

interface H2HPartido {
  torneo: string;
  fase: string;
  fecha: string;
  equipo1: string;
  equipo2: string;
  goles1: number;
  goles2: number;
}

interface H2HData {
  partidosJugados: number;
  victoriasTeam1: number;
  victoriasTeam2: number;
  empates: number;
  golesTotalesTeam1: number;
  golesTotalesTeam2: number;
  historial: H2HPartido[];
}

interface Props {
  partido: {
    id: string;
    equipoLocal: string;
    equipoVisitante: string;
    fechaPartido: string;
    fase: Fase;
    estado: EstadoPartido;
    golesLocalReal: number | null;
    golesVisitanteReal: number | null;
    estadio: string | null;
    ciudad: string | null;
  };
  pronostico: {
    golesLocal: number;
    golesVisitante: number;
    puntosGanados: number;
  } | null;
  odds?: { home: number; draw: number; away: number } | null;
}

function isPlaceholder(name: string): boolean {
  return /^\d/.test(name) || name.includes("/") || /^[WL]\d/.test(name);
}

function isLocked(fechaPartido: string, estado: EstadoPartido) {
  if (estado !== "PROGRAMADO") return true;
  return Date.now() >= new Date(fechaPartido).getTime() - 15 * 60 * 1000;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

function getTier(
  puntos: number,
  fase: Fase,
): { label: string; color: string; glow: string } {
  const mult = fase === "GRUPOS" ? 1 : 2;
  if (puntos === 5 * mult)
    return {
      label: "Exacto",
      color: "text-yellow-400",
      glow: "rgba(250,204,21,0.5)",
    };
  if (puntos === 3 * mult)
    return {
      label: "Tendencia",
      color: "text-[#00e87a]",
      glow: "rgba(0,232,122,0.5)",
    };
  if (puntos === 1 * mult)
    return {
      label: "Consolación",
      color: "text-sky-400",
      glow: "rgba(56,189,248,0.4)",
    };
  return { label: "Fallo", color: "text-gray-600", glow: "transparent" };
}

function CheckIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function PartidoCard({ partido, pronostico, odds }: Props) {
  const [locked, setLocked] = useState(false);
  const [local, setLocal] = useState<string>(
    pronostico != null ? String(pronostico.golesLocal) : "",
  );
  const [visitante, setVisitante] = useState<string>(
    pronostico != null ? String(pronostico.golesVisitante) : "",
  );
  const [saved, setSaved] = useState(!!pronostico);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // ── Live match modal ──────────────────────────────────────────────────────
  const [liveOpen, setLiveOpen] = useState(false);

  // ── H2H ───────────────────────────────────────────────────────────────────
  const [h2hOpen, setH2hOpen] = useState(false);
  const [h2hData, setH2hData] = useState<H2HData | null>(null);
  const [h2hLoading, setH2hLoading] = useState(false);

  // ── Puntuaciones ──────────────────────────────────────────────────────────
  const [puntosOpen, setPuntosOpen] = useState(false);
  const [puntosData, setPuntosData] = useState<{ name: string; image: string | null; puntosGanados: number }[] | null>(null);
  const [puntosLoading, setPuntosLoading] = useState(false);

  async function fetchH2H() {
    if (h2hData || h2hLoading) return;
    setH2hLoading(true);
    try {
      const res = await fetch(
        `/api/partidos/h2h?team1=${encodeURIComponent(partido.equipoLocal)}&team2=${encodeURIComponent(partido.equipoVisitante)}`,
      );
      if (res.ok) setH2hData(await res.json() as H2HData);
    } finally {
      setH2hLoading(false);
    }
  }

  function toggleH2H() {
    if (!h2hOpen && !h2hData) fetchH2H();
    setH2hOpen((v) => !v);
  }

  async function fetchPuntos() {
    if (puntosData || puntosLoading) return;
    setPuntosLoading(true);
    try {
      const res = await fetch(`/api/partidos/puntos?partidoId=${encodeURIComponent(partido.id)}`);
      if (res.ok) setPuntosData(await res.json());
    } finally {
      setPuntosLoading(false);
    }
  }

  function togglePuntos() {
    if (!puntosOpen && !puntosData) fetchPuntos();
    setPuntosOpen((v) => !v);
  }

  useEffect(() => {
    setLocked(isLocked(partido.fechaPartido, partido.estado));
  }, [partido.fechaPartido, partido.estado]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (local === "" || visitante === "") return;
    setError(null);
    startTransition(async () => {
      const res = await guardarPronostico(
        partido.id,
        Number(local),
        Number(visitante),
      );
      if (res.error) {
        setError(res.error);
      } else {
        setSaved(true);
      }
    });
  }

  const flagLocal = isPlaceholder(partido.equipoLocal) ? null : getFlag(partido.equipoLocal);
  const flagVisitante = isPlaceholder(partido.equipoVisitante) ? null : getFlag(partido.equipoVisitante);

  // ── Display helpers ────────────────────────────────────────────────
  const teamsUnknown = isPlaceholder(partido.equipoLocal) && isPlaceholder(partido.equipoVisitante);
  const displayLocal = isPlaceholder(partido.equipoLocal) ? "Por definir" : partido.equipoLocal;
  const displayVisitante = isPlaceholder(partido.equipoVisitante) ? "Por definir" : partido.equipoVisitante;
  const isFinished = partido.estado === "FINALIZADO";
  const showInputs = !locked;
  const localValue = pronostico != null ? pronostico.golesLocal : null;
  const visitanteValue = pronostico != null ? pronostico.golesVisitante : null;
  const tier =
    isFinished && pronostico != null
      ? getTier(pronostico.puntosGanados, partido.fase)
      : null;

  const statusBadge =
    partido.estado === "EN_PROGRESO" ? (
      <button
        type="button"
        onClick={() => setLiveOpen(true)}
        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-yellow-300 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-2 py-0.5 hover:bg-yellow-400/20 transition-colors cursor-pointer"
      >
        <span className="size-1.5 rounded-full bg-yellow-300 animate-pulse" />
        En juego
      </button>
    ) : locked ? (
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-white/[0.03] border border-white/[0.06] rounded-full px-2 py-0.5">
        🔒 Cerrado
      </span>
    ) : null;

  if (teamsUnknown) {
    return (
      <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] px-4 py-3 flex items-center justify-between gap-4">
        <span className="text-[10px] uppercase tracking-[0.18em] text-gray-700 tabular-nums shrink-0">
          {formatFecha(partido.fechaPartido)}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-gray-700 text-right">
          Equipos por definir
        </span>
      </div>
    );
  }

  return (
    <>
      {liveOpen && (
        <LiveMatchModal
          equipoLocal={partido.equipoLocal}
          equipoVisitante={partido.equipoVisitante}
          onClose={() => setLiveOpen(false)}
        />
      )}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.015] transition-all hover:border-white/[0.14] hover:from-white/[0.06] hover:to-white/[0.02] group">
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent group-hover:via-[#00e87a]/40 transition-colors" />

        {/* Header: fecha + sede + badge de estado */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] uppercase tracking-[0.18em] text-gray-200 font-medium tabular-nums">
              {formatFecha(partido.fechaPartido)}
            </span>
            {partido.estadio && (
              <span className="text-[12px] text-gray-400 truncate max-w-[180px]">
                {partido.estadio}, {partido.ciudad}
              </span>
            )}
          </div>
          {statusBadge}
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2">
          {/* Body: grid simétrico 3 columnas */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 lg:gap-4">
            {/* ── Equipo Local ───────────────────────── */}
            <div className="flex flex-col items-center gap-2 min-w-0">
              <span className="text-4xl lg:text-5xl leading-none drop-shadow-sm">
                {flagLocal ?? <span className="text-gray-700">?</span>}
              </span>
              <span className={`text-sm lg:text-base font-bold text-center leading-tight truncate w-full ${flagLocal ? "text-gray-100" : "text-gray-600 italic"}`}>
                {displayLocal}
              </span>
              {showInputs ? (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={local}
                  placeholder="-"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "");
                    setLocal(v);
                    setError(null);
                    setSaved(false);
                  }}
                  aria-label={`Goles ${displayLocal}`}
                  className="score-input"
                />
              ) : (
                <span className="score-input flex items-center justify-center text-gray-400 select-none">
                  {localValue ?? "–"}
                </span>
              )}
              {odds && (
                <span className="text-[10px] font-mono tabular-nums text-gray-400 bg-white/[0.04] border border-white/[0.08] rounded-full px-2 py-0.5">
                  {odds.home.toFixed(2)}
                </span>
              )}
            </div>

            {/* ── Separador central ───────────────────── */}
            <div className="flex flex-col items-center gap-2 pt-1">
              {/* Espaciado para alinear con bandera */}
              <span
                className="text-4xl lg:text-5xl leading-none opacity-0 select-none"
                aria-hidden
              >
                ·
              </span>
              {/* Espaciado para alinear con nombre */}
              <span
                className="text-sm lg:text-base leading-tight opacity-0 select-none"
                aria-hidden
              >
                vs
              </span>
              {isFinished ? (
                <div className="flex flex-col items-center gap-0.5 leading-tight">
                  <span className="text-xl lg:text-2xl font-bold text-white tabular-nums">
                    {partido.golesLocalReal}–{partido.golesVisitanteReal}
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-gray-600">
                    resultado
                  </span>
                </div>
              ) : (
                <span className="text-2xl lg:text-3xl font-bold text-gray-600 leading-[3rem] select-none">
                  :
                </span>
              )}
              {odds && (
                <span className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-mono tabular-nums text-gray-400 bg-white/[0.03] border border-white/[0.06] rounded-full px-2 py-0.5 mt-1">
                    {odds.draw.toFixed(2)}
                  </span>
                </span>
              )}
            </div>

            {/* ── Equipo Visitante ────────────────────── */}
            <div className="flex flex-col items-center gap-2 min-w-0">
              <span className="text-4xl lg:text-5xl leading-none drop-shadow-sm">
                {flagVisitante ?? <span className="text-gray-700">?</span>}
              </span>
              <span className={`text-sm lg:text-base font-bold text-center leading-tight truncate w-full ${flagVisitante ? "text-gray-100" : "text-gray-600 italic"}`}>
                {displayVisitante}
              </span>
              {showInputs ? (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={visitante}
                  placeholder="-"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "");
                    setVisitante(v);
                    setError(null);
                    setSaved(false);
                  }}
                  aria-label={`Goles ${displayVisitante}`}
                  className="score-input"
                />
              ) : (
                <span className="score-input flex items-center justify-center text-gray-400 select-none">
                  {visitanteValue ?? "–"}
                </span>
              )}
              {odds && (
                <span className="text-[10px] font-mono tabular-nums text-gray-400 bg-white/[0.04] border border-white/[0.08] rounded-full px-2 py-0.5">
                  {odds.away.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Acción / feedback */}
          {showInputs && (
            <div className="mt-3 flex items-center justify-center gap-3 min-h-[2.5rem]">
              {saved ? (
                <span
                  className="inline-flex items-center gap-1.5 text-[#00e87a] text-xs font-semibold uppercase tracking-wider"
                  style={{ filter: "drop-shadow(0 0 8px rgba(0,232,122,0.55))" }}
                >
                  <CheckIcon />
                  Guardado
                </span>
              ) : (
                <button
                  type="submit"
                  disabled={pending || local === "" || visitante === ""}
                  className="btn-save h-9 px-5 text-xs font-bold tracking-widest uppercase disabled:opacity-40"
                >
                  {pending ? (
                    <span className="animate-pulse">Guardando…</span>
                  ) : (
                    "Guardar"
                  )}
                </button>
              )}
              {error && <span className="text-xs text-red-400">{error}</span>}
            </div>
          )}

          {/* Puntos — solo cuando el partido ha finalizado */}
          {isFinished && (
            <div className="mt-3 flex items-center justify-center gap-2 min-h-[2rem]">
              {pronostico != null && tier != null ? (
                <>
                  <span
                    className={`text-base font-bold tabular-nums ${tier.color}`}
                    style={{ filter: `drop-shadow(0 0 6px ${tier.glow})` }}
                  >
                    {pronostico.puntosGanados > 0
                      ? `+${pronostico.puntosGanados}`
                      : "0"}{" "}
                    pts
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider opacity-70 ${tier.color}`}
                  >
                    · {tier.label}
                  </span>
                </>
              ) : (
                <span className="text-[10px] uppercase tracking-wider text-gray-600">
                  Sin pronóstico
                </span>
              )}
            </div>
          )}
        </form>

        {/* ── Puntuaciones ────────────────────────────────────────────── */}
        {isFinished && (
          <div className="border-t border-white/[0.05]">
            <button
              type="button"
              onClick={togglePuntos}
              className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-600 hover:text-gray-400 transition-colors"
            >
              <span>Puntuaciones jugadores Quiniela</span>
              <span className="text-[9px]">{puntosOpen ? "▲" : "▼"}</span>
            </button>

            {puntosOpen && (
              <div className="px-4 pb-4">
                {puntosLoading && (
                  <p className="text-center text-xs text-gray-600 py-2 animate-pulse">Cargando…</p>
                )}
                {!puntosLoading && puntosData?.length === 0 && (
                  <p className="text-center text-[11px] text-gray-700 py-2">Nadie acertó este partido</p>
                )}
                {!puntosLoading && puntosData && puntosData.length > 0 && (
                  <div className="space-y-1 max-h-52 overflow-y-auto scrollbar-none">
                    {puntosData.map((u, i) => {
                      const t = getTier(u.puntosGanados, partido.fase);
                      const initials = u.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-white/[0.04] last:border-0">
                          {u.image ? (
                            <img src={u.image} alt={u.name} className="size-5 rounded-full shrink-0 object-cover" />
                          ) : (
                            <span className="size-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold text-gray-400 shrink-0">
                              {initials}
                            </span>
                          )}
                          <span className="flex-1 text-[11px] text-gray-300 truncate">{u.name}</span>
                          <span className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 ${t.color}`}>
                            {t.label}
                          </span>
                          <span className={`text-xs font-bold tabular-nums shrink-0 ${t.color}`}>
                            +{u.puntosGanados}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── H2H ────────────────────────────────────────────────────────── */}
        {!teamsUnknown && (
          <div className="border-t border-white/[0.05]">
            <button
              type="button"
              onClick={toggleH2H}
              className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-600 hover:text-gray-400 transition-colors"
            >
              <span>Historial en Mundiales H2H</span>
              <span className="text-[9px]">{h2hOpen ? "▲" : "▼"}</span>
            </button>

            {h2hOpen && (
              <div className="px-4 pb-4 space-y-3">
                {h2hLoading && (
                  <p className="text-center text-xs text-gray-600 py-2 animate-pulse">
                    Cargando…
                  </p>
                )}

                {!h2hLoading && h2hData?.partidosJugados === 0 && (
                  <p className="text-center text-[11px] text-gray-700 py-2">
                    Sin enfrentamientos previos en Mundiales
                  </p>
                )}

                {!h2hLoading && h2hData && h2hData.partidosJugados > 0 && (
                  <>
                    {/* Barra de resultados */}
                    <H2HSummaryBar
                      team1={partido.equipoLocal}
                      team2={partido.equipoVisitante}
                      data={h2hData}
                    />

                    {/* Historial de partidos */}
                    <div className="space-y-1 max-h-52 overflow-y-auto scrollbar-none">
                      {h2hData.historial.map((p, i) => (
                        <H2HMatchRow key={i} partido={p} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── H2HSummaryBar ─────────────────────────────────────────────────────────────

function H2HSummaryBar({
  team1,
  team2,
  data,
}: {
  team1: string;
  team2: string;
  data: H2HData;
}) {
  const total = data.partidosJugados;
  const pct1 = (data.victoriasTeam1 / total) * 100;
  const pctE = (data.empates / total) * 100;
  const pct2 = (data.victoriasTeam2 / total) * 100;

  return (
    <div className="space-y-2">
      {/* Nombres con totales de goles */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-gray-300 truncate max-w-[100px]">
          {team1}
          <span className="ml-1 text-gray-600 font-normal tabular-nums">
            {data.golesTotalesTeam1}g
          </span>
        </span>
        <span className="text-[10px] text-gray-700 tabular-nums shrink-0 mx-1">
          {total} partido{total !== 1 ? "s" : ""}
        </span>
        <span className="font-semibold text-gray-300 text-right truncate max-w-[100px]">
          <span className="mr-1 text-gray-600 font-normal tabular-nums">
            {data.golesTotalesTeam2}g
          </span>
          {team2}
        </span>
      </div>

      {/* Barra proporcional */}
      <div className="flex h-1.5 w-full rounded-full overflow-hidden gap-px">
        {data.victoriasTeam1 > 0 && (
          <div
            className="bg-[#00e87a] rounded-l-full"
            style={{ width: `${pct1}%` }}
          />
        )}
        {data.empates > 0 && (
          <div
            className="bg-white/20"
            style={{ width: `${pctE}%` }}
          />
        )}
        {data.victoriasTeam2 > 0 && (
          <div
            className="bg-rose-500 rounded-r-full"
            style={{ width: `${pct2}%` }}
          />
        )}
      </div>

      {/* Contadores */}
      <div className="flex items-center justify-between text-[10px] font-bold tabular-nums">
        <span className="text-[#00e87a]">{data.victoriasTeam1}V</span>
        <span className="text-gray-600">{data.empates}E</span>
        <span className="text-rose-400">{data.victoriasTeam2}V</span>
      </div>
    </div>
  );
}

// ── H2HMatchRow ───────────────────────────────────────────────────────────────

function H2HMatchRow({ partido }: { partido: H2HPartido }) {
  const empate = partido.goles1 === partido.goles2;
  const gana1 = partido.goles1 > partido.goles2;

  return (
    <div className="flex items-center gap-2 text-[11px] py-1 border-b border-white/[0.04] last:border-0">
      {/* Resultado visual: puntico de color */}
      <span
        className={`shrink-0 size-1.5 rounded-full ${empate ? "bg-white/25" : gana1 ? "bg-[#00e87a]" : "bg-rose-500"}`}
      />

      {/* Torneo */}
      <span className="text-gray-600 shrink-0 w-[96px] truncate text-[10px]">
        {partido.torneo}
      </span>

      {/* Fase */}
      <span className="text-gray-700 flex-1 truncate text-[10px]">
        {partido.fase}
      </span>

      {/* Marcador */}
      <span
        className={`font-mono font-bold tabular-nums shrink-0 ${empate ? "text-gray-400" : gana1 ? "text-[#00e87a]" : "text-rose-400"}`}
      >
        {partido.goles1}–{partido.goles2}
      </span>
    </div>
  );
}
