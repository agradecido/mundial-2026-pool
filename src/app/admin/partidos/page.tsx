import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";
import { getFlag } from "@/lib/flags";
import type { Fase, EstadoPartido } from "@prisma/client";

const FASE_LABELS: Record<Fase, string> = {
    GRUPOS: "Grupos",
    DIECISEISAVOS: "Dieciseisavos",
    OCTAVOS: "Octavos",
    CUARTOS: "Cuartos",
    SEMIFINAL: "Semifinal",
    TERCER_PUESTO: "3.er puesto",
    FINAL: "Final",
};

const ESTADO_LABELS: Record<EstadoPartido, string> = {
    PROGRAMADO: "Programado",
    EN_PROGRESO: "En progreso",
    FINALIZADO: "Finalizado",
};

const ESTADO_COLORS: Record<EstadoPartido, string> = {
    PROGRAMADO: "text-gray-400",
    EN_PROGRESO: "text-amber-400",
    FINALIZADO: "text-emerald-400",
};

export default async function AdminPartidosPage({
    searchParams,
}: {
    searchParams: Promise<{ fase?: string; q?: string; estado?: string }>;
}) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") redirect("/");

    const params = await searchParams;
    const { fase, q, estado } = params;

    const partidos = await prisma.partido.findMany({
        orderBy: [{ fase: "asc" }, { fechaPartido: "asc" }],
        where: {
            ...(fase ? { fase: fase as Fase } : {}),
            ...(estado ? { estado: estado as EstadoPartido } : {}),
            ...(q
                ? {
                    OR: [
                        { equipoLocal: { contains: q, mode: "insensitive" } },
                        { equipoVisitante: { contains: q, mode: "insensitive" } },
                    ],
                }
                : {}),
        },
    });

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Partidos</h2>
                <span className="text-xs text-gray-500">{partidos.length} partidos</span>
            </div>

            {/* Filtros */}
            <form method="GET" className="flex flex-wrap gap-2">
                <input
                    name="q"
                    defaultValue={q}
                    placeholder="Buscar equipo…"
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 w-40"
                />
                <select
                    name="fase"
                    defaultValue={fase ?? ""}
                    className="rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-white/30"
                >
                    <option value="">Todas las fases</option>
                    {(Object.keys(FASE_LABELS) as Fase[]).map((f) => (
                        <option key={f} value={f}>
                            {FASE_LABELS[f]}
                        </option>
                    ))}
                </select>
                <select
                    name="estado"
                    defaultValue={estado ?? ""}
                    className="rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-white/30"
                >
                    <option value="">Todos los estados</option>
                    {(Object.keys(ESTADO_LABELS) as EstadoPartido[]).map((e) => (
                        <option key={e} value={e}>
                            {ESTADO_LABELS[e]}
                        </option>
                    ))}
                </select>
                <button
                    type="submit"
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:border-white/20 transition-colors"
                >
                    Filtrar
                </button>
                {(fase || q || estado) && (
                    <Link
                        href="/admin/partidos"
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-500 hover:text-white transition-colors"
                    >
                        Limpiar
                        <LinkSpinner className="size-3.5 shrink-0" />
                    </Link>
                )}
            </form>

            {/* Tabla */}
            <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10 text-left text-xs text-gray-500">
                            <th className="px-4 py-3 font-medium">Partido</th>
                            <th className="px-4 py-3 font-medium hidden sm:table-cell">Fase</th>
                            <th className="px-4 py-3 font-medium hidden md:table-cell">Fecha</th>
                            <th className="px-4 py-3 font-medium">Resultado</th>
                            <th className="px-4 py-3 font-medium">Estado</th>
                            <th className="px-4 py-3 font-medium"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {partidos.map((p) => (
                            <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-3 text-white">
                                    <span className="font-medium">
                                        {getFlag(p.equipoLocal)} {p.equipoLocal}
                                    </span>
                                    <span className="text-gray-500 mx-2">vs</span>
                                    <span className="font-medium">
                                        {getFlag(p.equipoVisitante)} {p.equipoVisitante}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                                    {p.grupo ? `Grupo ${p.grupo}` : FASE_LABELS[p.fase]}
                                </td>
                                <td className="px-4 py-3 text-gray-400 hidden md:table-cell whitespace-nowrap">
                                    {p.fechaPartido.toLocaleDateString("es-ES", {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </td>
                                <td className="px-4 py-3 font-mono text-white">
                                    {p.golesLocalReal !== null && p.golesVisitanteReal !== null
                                        ? `${p.golesLocalReal} – ${p.golesVisitanteReal}`
                                        : <span className="text-gray-600">—</span>}
                                </td>
                                <td className={`px-4 py-3 ${ESTADO_COLORS[p.estado]}`}>
                                    {ESTADO_LABELS[p.estado]}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <Link
                                        href={`/admin/partidos/${p.id}`}
                                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                                    >
                                        Editar
                                        <LinkSpinner className="size-3 shrink-0" />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {partidos.length === 0 && (
                    <p className="px-4 py-8 text-center text-gray-600 text-sm">
                        No hay partidos que coincidan con los filtros.
                    </p>
                )}
            </div>
        </div>
    );
}
