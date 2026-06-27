"use client";

import { useState, useTransition } from "react";
import { sincronizarEquipos, sincronizarTodos } from "@/app/admin/eliminatorias/actions";
import { getFlag } from "@/lib/flags";

export interface EliminatoriaRow {
  fdId: number;
  utcDate: string;
  fdStage: string;
  faseLabel: string;
  fdHomeTeam: string | null;
  fdAwayTeam: string | null;
  fdStatus: string;
  dbPartidoId: string | null;
  dbEquipoLocal: string | null;
  dbEquipoVisitante: string | null;
  dbEstado: string | null;
  syncEquipoLocal: string | null;
  syncEquipoVisitante: string | null;
  canSync: boolean;
  alreadyUpToDate: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Programado",
  TIMED: "Programado",
  IN_PLAY: "En curso",
  PAUSED: "En curso",
  FINISHED: "Finalizado",
  SUSPENDED: "Suspendido",
  POSTPONED: "Aplazado",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "text-gray-500",
  TIMED: "text-gray-500",
  IN_PLAY: "text-amber-400",
  PAUSED: "text-amber-400",
  FINISHED: "text-emerald-400",
  SUSPENDED: "text-red-400",
  POSTPONED: "text-red-400",
  CANCELLED: "text-red-400",
};

function TeamCell({ name }: { name: string | null }) {
  if (!name) return <span className="text-gray-600 italic">Por confirmar</span>;
  return (
    <span>
      {getFlag(name)} {name}
    </span>
  );
}

interface SyncButtonProps {
  row: EliminatoriaRow;
  onDone: (fdId: number, local: string, visitante: string) => void;
}

function SyncButton({ row, onDone }: SyncButtonProps) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (!row.canSync) return null;

  function handleSync() {
    const { dbPartidoId, syncEquipoLocal, syncEquipoVisitante } = row;
    if (!dbPartidoId || !syncEquipoLocal || !syncEquipoVisitante) return;
    setErr(null);
    startTransition(async () => {
      const res = await sincronizarEquipos(dbPartidoId, syncEquipoLocal, syncEquipoVisitante);
      if (res.error) {
        setErr(res.error);
      } else {
        onDone(row.fdId, syncEquipoLocal, syncEquipoVisitante);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={pending}
        className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
      >
        {pending ? "Sincronizando…" : "Sincronizar"}
      </button>
      {err && <span className="text-xs text-red-400">{err}</span>}
    </div>
  );
}

interface Props {
  rows: EliminatoriaRow[];
  error?: string;
}

export default function EliminatoriasPanel({ rows, error }: Props) {
  const [localRows, setLocalRows] = useState(rows);
  const [syncAllPending, startSyncAll] = useTransition();
  const [syncAllMsg, setSyncAllMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const pendientes = localRows.filter((r) => r.canSync);
  const confirmados = localRows.filter((r) => r.fdHomeTeam && r.fdAwayTeam);
  const actualizados = localRows.filter((r) => r.alreadyUpToDate);

  function handleRowDone(fdId: number, local: string, visitante: string) {
    setLocalRows((prev) =>
      prev.map((r) =>
        r.fdId === fdId
          ? { ...r, canSync: false, alreadyUpToDate: true, dbEquipoLocal: local, dbEquipoVisitante: visitante }
          : r,
      ),
    );
  }

  function handleSyncAll() {
    type SyncReady = { partidoId: string; equipoLocal: string; equipoVisitante: string };
    const payload = pendientes.reduce<SyncReady[]>((acc, r) => {
      if (r.dbPartidoId && r.syncEquipoLocal && r.syncEquipoVisitante) {
        acc.push({ partidoId: r.dbPartidoId, equipoLocal: r.syncEquipoLocal, equipoVisitante: r.syncEquipoVisitante });
      }
      return acc;
    }, []);
    setSyncAllMsg(null);
    startSyncAll(async () => {
      const res = await sincronizarTodos(payload);
      if (res.error) {
        setSyncAllMsg({ type: "err", text: res.error });
      } else {
        setSyncAllMsg({
          type: "ok",
          text: `${res.count} partido${res.count !== 1 ? "s" : ""} sincronizado${res.count !== 1 ? "s" : ""} correctamente.`,
        });
        setLocalRows((prev) =>
          prev.map((r) => {
            const p = payload.find((x) => x.partidoId === r.dbPartidoId);
            if (!p) return r;
            return { ...r, canSync: false, alreadyUpToDate: true, dbEquipoLocal: p.equipoLocal, dbEquipoVisitante: p.equipoVisitante };
          }),
        );
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Partidos de eliminatorias</h2>
          <p className="text-xs text-gray-500 mt-0.5">Football-Data.org · WC 2026 — sincroniza equipos cuando se confirman los clasificados</p>
        </div>
        {pendientes.length > 0 && (
          <button
            onClick={handleSyncAll}
            disabled={syncAllPending}
            className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-2.5 text-sm font-semibold text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-60"
          >
            {syncAllPending
              ? "Sincronizando…"
              : `Sincronizar todos (${pendientes.length} pendiente${pendientes.length !== 1 ? "s" : ""})`}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
          Error al conectar con Football-Data.org: {error}
        </div>
      )}

      {syncAllMsg && (
        <p
          className={`text-sm rounded-lg px-3 py-2 ${
            syncAllMsg.type === "ok"
              ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800"
              : "bg-red-950/50 text-red-400 border border-red-900"
          }`}
        >
          {syncAllMsg.text}
        </p>
      )}

      {!error && localRows.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span>
            <span className="text-white font-medium">{localRows.length}</span> partidos eliminatorias
          </span>
          <span>
            <span className="text-white font-medium">{confirmados.length}</span> con equipos confirmados en API
          </span>
          <span>
            <span className="text-emerald-400 font-medium">{actualizados.length}</span> ya actualizados en BD
          </span>
          {pendientes.length > 0 && (
            <span>
              <span className="text-blue-400 font-medium">{pendientes.length}</span> pendientes de sincronizar
            </span>
          )}
        </div>
      )}

      {localRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Ronda</th>
                <th className="px-4 py-3 font-medium">Equipos (API)</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">En BD ahora</th>
                <th className="px-4 py-3 font-medium text-xs">Estado API</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {localRows.map((row) => (
                <tr
                  key={row.fdId}
                  className={`transition-colors ${row.alreadyUpToDate ? "opacity-40" : "hover:bg-white/[0.02]"}`}
                >
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(row.utcDate).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "UTC",
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {row.faseLabel}
                  </td>
                  <td className="px-4 py-3 text-white whitespace-nowrap">
                    <TeamCell name={row.fdHomeTeam} />
                    <span className="text-gray-500 mx-2 text-xs">vs</span>
                    <TeamCell name={row.fdAwayTeam} />
                    {!row.dbPartidoId && (
                      <span className="ml-2 text-xs text-amber-400">sin partido BD</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell whitespace-nowrap">
                    {row.dbEquipoLocal && row.dbEquipoVisitante ? (
                      <span className={row.alreadyUpToDate ? "text-emerald-600" : "text-amber-500 font-mono"}>
                        {row.dbEquipoLocal} vs {row.dbEquipoVisitante}
                      </span>
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-xs ${STATUS_COLORS[row.fdStatus] ?? "text-gray-400"}`}>
                    {STATUS_LABELS[row.fdStatus] ?? row.fdStatus}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.alreadyUpToDate ? (
                      <span className="text-xs text-emerald-700">Actualizado</span>
                    ) : (
                      <SyncButton row={row} onDone={handleRowDone} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && localRows.length === 0 && (
        <p className="text-center text-gray-600 text-sm py-12">
          No se encontraron partidos de eliminatorias en la API.
        </p>
      )}
    </div>
  );
}
