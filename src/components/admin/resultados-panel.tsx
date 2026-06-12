"use client";

import { useState, useTransition } from "react";
import { importarResultado, importarTodosFinalizados } from "@/app/admin/resultados/actions";
import { getFlag } from "@/lib/flags";

export interface MatchRow {
  fdId: number;
  utcDate: string;
  homeTeamFD: string;
  awayTeamFD: string;
  homeTeamNorm: string;
  awayTeamNorm: string;
  fdStatus: string;
  fdGolesLocal: number | null;
  fdGolesVisitante: number | null;
  fdDuration: string;
  nuestroPartidoId: string | null;
  nuestroEquipoLocal: string | null;
  nuestroEquipoVisitante: string | null;
  nuestroGolesLocal: number | null;
  nuestroGolesVisitante: number | null;
  nuestroEstado: string | null;
  alreadyImported: boolean;
  canImport: boolean;
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

function ScoreCell({ gL, gV }: { gL: number | null; gV: number | null }) {
  if (gL === null || gV === null) return <span className="text-gray-600">—</span>;
  return (
    <span className="font-mono tabular-nums">
      {gL} – {gV}
    </span>
  );
}

interface ImportRowButtonProps {
  row: MatchRow;
  onDone: (fdId: number, golesLocal: number, golesVisitante: number) => void;
}

function ImportRowButton({ row, onDone }: ImportRowButtonProps) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (!row.canImport) return null;

  function handleImport() {
    if (!row.nuestroPartidoId || row.fdGolesLocal === null || row.fdGolesVisitante === null) return;
    setErr(null);
    startTransition(async () => {
      const res = await importarResultado(
        row.nuestroPartidoId!,
        row.fdGolesLocal!,
        row.fdGolesVisitante!
      );
      if (res.error) {
        setErr(res.error);
      } else {
        onDone(row.fdId, row.fdGolesLocal!, row.fdGolesVisitante!);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleImport}
        disabled={pending}
        className="rounded-lg border border-[#00e87a]/30 bg-[#00e87a]/10 px-3 py-1 text-xs font-medium text-[#00e87a] hover:bg-[#00e87a]/20 transition-colors disabled:opacity-50"
      >
        {pending ? "Importando…" : "Importar"}
      </button>
      {err && <span className="text-xs text-red-400">{err}</span>}
    </div>
  );
}

interface Props {
  rows: MatchRow[];
  error?: string;
}

export default function ResultadosPanel({ rows, error }: Props) {
  const [localRows, setLocalRows] = useState(rows);
  const [importAllPending, startImportAll] = useTransition();
  const [importAllMsg, setImportAllMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const pendientes = localRows.filter((r) => r.canImport);
  const finalizados = localRows.filter((r) => r.fdStatus === "FINISHED");
  const yaImportados = localRows.filter((r) => r.alreadyImported);
  const sinPartido = localRows.filter((r) => r.fdStatus === "FINISHED" && !r.nuestroPartidoId);

  function handleRowDone(fdId: number, golesLocal: number, golesVisitante: number) {
    setLocalRows((prev) =>
      prev.map((r) =>
        r.fdId === fdId
          ? { ...r, alreadyImported: true, canImport: false, nuestroGolesLocal: golesLocal, nuestroGolesVisitante: golesVisitante, nuestroEstado: "FINALIZADO" }
          : r
      )
    );
  }

  function handleImportAll() {
    const payload = pendientes.map((r) => ({
      partidoId: r.nuestroPartidoId!,
      golesLocal: r.fdGolesLocal!,
      golesVisitante: r.fdGolesVisitante!,
    }));
    setImportAllMsg(null);
    startImportAll(async () => {
      const res = await importarTodosFinalizados(payload);
      if (res.error) {
        setImportAllMsg({ type: "err", text: res.error });
      } else {
        setImportAllMsg({ type: "ok", text: `${res.count} partido${res.count !== 1 ? "s" : ""} importado${res.count !== 1 ? "s" : ""} correctamente.` });
        setLocalRows((prev) =>
          prev.map((r) => {
            const inPayload = payload.find((p) => p.partidoId === r.nuestroPartidoId);
            if (!inPayload) return r;
            return { ...r, alreadyImported: true, canImport: false, nuestroGolesLocal: inPayload.golesLocal, nuestroGolesVisitante: inPayload.golesVisitante, nuestroEstado: "FINALIZADO" };
          })
        );
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Resultados API</h2>
          <p className="text-xs text-gray-500 mt-0.5">Football-Data.org · WC 2026</p>
          <p>Desde aquí podemos importar resultados de la API de <em>Football-Data.org</em> a nuestra base de datos. Intentaremos que esto suceda de manera automática.</p>
        </div>
        {pendientes.length > 0 && (
          <button
            onClick={handleImportAll}
            disabled={importAllPending}
            className="btn-save rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {importAllPending
              ? "Importando…"
              : `Importar todos (${pendientes.length} pendiente${pendientes.length !== 1 ? "s" : ""})`}
          </button>
        )}
      </div>

      {/* Error de API */}
      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
          Error al conectar con Football-Data.org: {error}
        </div>
      )}

      {/* Mensaje importar todos */}
      {importAllMsg && (
        <p className={`text-sm rounded-lg px-3 py-2 ${importAllMsg.type === "ok" ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800" : "bg-red-950/50 text-red-400 border border-red-900"}`}>
          {importAllMsg.text}
        </p>
      )}

      {/* Stats rápidas */}
      {!error && localRows.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span><span className="text-white font-medium">{localRows.length}</span> partidos en API</span>
          <span><span className="text-emerald-400 font-medium">{finalizados.length}</span> finalizados</span>
          <span><span className="text-[#00e87a] font-medium">{yaImportados.length}</span> ya importados</span>
          {sinPartido.length > 0 && (
            <span><span className="text-amber-400 font-medium">{sinPartido.length}</span> sin partido en BD</span>
          )}
        </div>
      )}

      {/* Tabla */}
      {localRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Partido (API)</th>
                <th className="px-4 py-3 font-medium">Estado API</th>
                <th className="px-4 py-3 font-medium">Resultado API</th>
                <th className="px-4 py-3 font-medium">Nuestro resultado</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {localRows.map((row) => (
                <tr
                  key={row.fdId}
                  className={`transition-colors ${row.alreadyImported ? "opacity-50" : "hover:bg-white/[0.02]"}`}
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
                  <td className="px-4 py-3 text-white whitespace-nowrap">
                    <span>{getFlag(row.homeTeamNorm)} {row.homeTeamFD}</span>
                    <span className="text-gray-500 mx-2 text-xs">vs</span>
                    <span>{row.awayTeamFD} {getFlag(row.awayTeamNorm)}</span>
                    {!row.nuestroPartidoId && row.fdStatus === "FINISHED" && (
                      <span className="ml-2 text-xs text-amber-400">sin match BD</span>
                    )}
                    {row.fdDuration === "EXTRA_TIME" && (
                      <span className="ml-2 text-xs text-gray-500">AET</span>
                    )}
                    {row.fdDuration === "PENALTY_SHOOTOUT" && (
                      <span className="ml-2 text-xs text-gray-500">Pen.</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-xs ${STATUS_COLORS[row.fdStatus] ?? "text-gray-400"}`}>
                    {STATUS_LABELS[row.fdStatus] ?? row.fdStatus}
                  </td>
                  <td className="px-4 py-3 text-white">
                    <ScoreCell gL={row.fdGolesLocal} gV={row.fdGolesVisitante} />
                  </td>
                  <td className="px-4 py-3 text-white">
                    {row.nuestroPartidoId ? (
                      <ScoreCell gL={row.nuestroGolesLocal} gV={row.nuestroGolesVisitante} />
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.alreadyImported ? (
                      <span className="text-xs text-emerald-600">Importado</span>
                    ) : (
                      <ImportRowButton row={row} onDone={handleRowDone} />
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
          No se encontraron partidos en la API.
        </p>
      )}
    </div>
  );
}
