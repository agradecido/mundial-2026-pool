"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearPartido } from "@/app/admin/partidos/actions";
import type { Fase } from "@prisma/client";

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
    defaults?: {
        equipoLocal?: string;
        equipoVisitante?: string;
        fechaPartido?: string; // "YYYY-MM-DDTHH:mm" Madrid
        fase?: Fase;
        estadio?: string;
        ciudad?: string;
    };
}

export default function NuevoPartidoForm({ defaults }: Props) {
    const [equipoLocal, setEquipoLocal] = useState(defaults?.equipoLocal ?? "");
    const [equipoVisitante, setEquipoVisitante] = useState(defaults?.equipoVisitante ?? "");
    const [fecha, setFecha] = useState(defaults?.fechaPartido ?? "");
    const [fase, setFase] = useState<Fase>(defaults?.fase ?? "DIECISEISAVOS");
    const [estadio, setEstadio] = useState(defaults?.estadio ?? "");
    const [ciudad, setCiudad] = useState(defaults?.ciudad ?? "");
    const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const [pending, startTransition] = useTransition();
    const router = useRouter();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        startTransition(async () => {
            const res = await crearPartido({ equipoLocal, equipoVisitante, fechaPartido: fecha, fase, estadio, ciudad });
            if (res.error) {
                setMsg({ type: "err", text: res.error });
            } else {
                router.push(`/admin/partidos/${res.id}`);
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
            <div>
                <label className="label-field">Equipos</label>
                <div className="mt-1 flex items-center gap-2">
                    <input
                        value={equipoLocal}
                        onChange={e => setEquipoLocal(e.target.value)}
                        placeholder="Equipo local"
                        required
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00e87a]"
                    />
                    <span className="text-gray-500 text-sm shrink-0">vs</span>
                    <input
                        value={equipoVisitante}
                        onChange={e => setEquipoVisitante(e.target.value)}
                        placeholder="Equipo visitante"
                        required
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00e87a]"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="fase" className="label-field">Fase</label>
                <select
                    id="fase"
                    value={fase}
                    onChange={e => setFase(e.target.value as Fase)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#00e87a]"
                >
                    {(Object.keys(FASE_LABELS) as Fase[]).map((f) => (
                        <option key={f} value={f}>{FASE_LABELS[f]}</option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="fecha" className="label-field">
                    Fecha y hora <span className="text-gray-500 font-normal">(hora española, UTC+2)</span>
                </label>
                <input
                    id="fecha"
                    type="datetime-local"
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00e87a] focus:ring-0 [color-scheme:dark]"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="label-field">Estadio</label>
                    <input
                        value={estadio}
                        onChange={e => setEstadio(e.target.value)}
                        placeholder="Opcional"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00e87a]"
                    />
                </div>
                <div>
                    <label className="label-field">Ciudad</label>
                    <input
                        value={ciudad}
                        onChange={e => setCiudad(e.target.value)}
                        placeholder="Opcional"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00e87a]"
                    />
                </div>
            </div>

            {msg && (
                <p className={`text-sm rounded-lg px-3 py-2 ${msg.type === "ok"
                    ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800"
                    : "bg-red-950/50 text-red-400 border border-red-900"}`}>
                    {msg.text}
                </p>
            )}

            <button
                type="submit"
                disabled={pending}
                className="btn-save rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
                {pending ? "Creando…" : "Crear partido"}
            </button>
        </form>
    );
}
