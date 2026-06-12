"use client";

import { useState, useTransition } from "react";
import { actualizarPartido } from "@/app/admin/partidos/actions";
import type { EstadoPartido, Fase } from "@prisma/client";

const ESTADO_LABELS: Record<EstadoPartido, string> = {
    PROGRAMADO: "Programado",
    EN_PROGRESO: "En progreso",
    FINALIZADO: "Finalizado",
};

const FASE_LABELS: Record<Fase, string> = {
    GRUPOS: "Grupos",
    DIECISEISAVOS: "Dieciseisavos",
    OCTAVOS: "Octavos",
    CUARTOS: "Cuartos",
    SEMIFINAL: "Semifinal",
    TERCER_PUESTO: "3.er puesto",
    FINAL: "Final",
};

interface Props {
    partido: {
        id: string;
        equipoLocal: string;
        equipoVisitante: string;
        fechaPartido: string; // ISO
        fase: Fase;
        grupo: string | null;
        estado: EstadoPartido;
        golesLocalReal: number | null;
        golesVisitanteReal: number | null;
    };
}

/** Convierte Date ISO a valor compatible con datetime-local input */
function toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PartidoEditForm({ partido }: Props) {
    const [fecha, setFecha] = useState(toDatetimeLocal(partido.fechaPartido));
    const [estado, setEstado] = useState<EstadoPartido>(partido.estado);
    const [equipoLocal, setEquipoLocal] = useState(partido.equipoLocal);
    const [equipoVisitante, setEquipoVisitante] = useState(partido.equipoVisitante);
    const [golesL, setGolesL] = useState(
        partido.golesLocalReal !== null ? String(partido.golesLocalReal) : ""
    );
    const [golesV, setGolesV] = useState(
        partido.golesVisitanteReal !== null ? String(partido.golesVisitanteReal) : ""
    );
    const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const [pending, startTransition] = useTransition();

    const isKnockout = partido.fase !== "GRUPOS";

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        startTransition(async () => {
            const res = await actualizarPartido(partido.id, {
                fechaPartido: fecha,
                estado,
                equipoLocal: isKnockout ? equipoLocal : undefined,
                equipoVisitante: isKnockout ? equipoVisitante : undefined,
                golesLocalReal: golesL,
                golesVisitanteReal: golesV,
            });
            if (res.error) {
                setMsg({ type: "err", text: res.error });
            } else {
                setMsg({ type: "ok", text: "Partido actualizado correctamente." });
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
            {/* Equipos */}
            <div>
                <label className="label-field">Enfrentamiento</label>
                {isKnockout ? (
                    <div className="mt-1 flex items-center gap-2">
                        <input
                            value={equipoLocal}
                            onChange={e => setEquipoLocal(e.target.value)}
                            placeholder="Equipo local"
                            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00e87a]"
                        />
                        <span className="text-gray-500 text-sm shrink-0">vs</span>
                        <input
                            value={equipoVisitante}
                            onChange={e => setEquipoVisitante(e.target.value)}
                            placeholder="Equipo visitante"
                            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00e87a]"
                        />
                    </div>
                ) : (
                    <p className="mt-1 text-white font-medium text-lg">
                        {partido.equipoLocal}{" "}
                        <span className="text-gray-500 text-sm font-normal">vs</span>{" "}
                        {partido.equipoVisitante}
                    </p>
                )}
                <p className="text-xs text-gray-600 mt-0.5">
                    {FASE_LABELS[partido.fase]}
                    {partido.grupo ? ` · Grupo ${partido.grupo}` : ""}
                </p>
            </div>

            {/* Fecha */}
            <div>
                <label htmlFor="fecha" className="label-field">
                    Fecha y hora
                </label>
                <input
                    id="fecha"
                    type="datetime-local"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00e87a] focus:ring-0 [color-scheme:dark]"
                />
            </div>

            {/* Estado */}
            <div>
                <label htmlFor="estado" className="label-field">
                    Estado
                </label>
                <select
                    id="estado"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as EstadoPartido)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#00e87a]"
                >
                    {(Object.keys(ESTADO_LABELS) as EstadoPartido[]).map((e) => (
                        <option key={e} value={e}>
                            {ESTADO_LABELS[e]}
                        </option>
                    ))}
                </select>
            </div>

            {/* Resultado */}
            <div>
                <label className="label-field">Resultado real (dejar vacío si no jugado)</label>
                <div className="mt-1 flex items-center gap-3">
                    <div className="flex flex-col gap-0.5 items-start">
                        <span className="text-xs text-gray-500 truncate max-w-[100px]">
                            {equipoLocal}
                        </span>
                        <input
                            type="number"
                            min="0"
                            max="99"
                            value={golesL}
                            onChange={(e) => setGolesL(e.target.value)}
                            placeholder="—"
                            className="score-input"
                        />
                    </div>
                    <span className="text-gray-600 text-xl mt-4">–</span>
                    <div className="flex flex-col gap-0.5 items-start">
                        <span className="text-xs text-gray-500 truncate max-w-[100px]">
                            {equipoVisitante}
                        </span>
                        <input
                            type="number"
                            min="0"
                            max="99"
                            value={golesV}
                            onChange={(e) => setGolesV(e.target.value)}
                            placeholder="—"
                            className="score-input"
                        />
                    </div>
                    {(golesL !== "" || golesV !== "") && (
                        <button
                            type="button"
                            onClick={() => { setGolesL(""); setGolesV(""); }}
                            className="mt-4 text-xs text-gray-600 hover:text-red-400 transition-colors"
                        >
                            Borrar resultado
                        </button>
                    )}
                </div>
            </div>

            {/* Feedback */}
            {msg && (
                <p
                    className={`text-sm rounded-lg px-3 py-2 ${msg.type === "ok"
                            ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800"
                            : "bg-red-950/50 text-red-400 border border-red-900"
                        }`}
                >
                    {msg.text}
                </p>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={pending}
                className="btn-save rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
                {pending ? "Guardando…" : "Guardar cambios"}
            </button>
        </form>
    );
}
