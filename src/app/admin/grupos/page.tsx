import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminGruposPage() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") redirect("/");

    const grupos = await prisma.grupo.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            creador: { select: { id: true, name: true, email: true } },
            miembros: { select: { userId: true } },
        },
    });

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Grupos privados</h2>
                <span className="text-xs text-gray-500">{grupos.length} grupos</span>
            </div>

            {grupos.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                    No hay grupos creados todavía.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10 text-left">
                                <th className="pb-3 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Grupo</th>
                                <th className="pb-3 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                                <th className="pb-3 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Creador</th>
                                <th className="pb-3 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Miembros</th>
                                <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {grupos.map((grupo) => (
                                <tr key={grupo.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="py-3 pr-4">
                                        <Link
                                            href={`/grupo/${grupo.codigo}`}
                                            className="font-medium text-white hover:text-[#00e87a] transition-colors"
                                            target="_blank"
                                        >
                                            {grupo.nombre}
                                        </Link>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <span className="font-mono text-xs bg-white/5 border border-white/10 rounded px-2 py-0.5 text-gray-300">
                                            {grupo.codigo}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <div>
                                            <p className="text-gray-200">{grupo.creador.name ?? "—"}</p>
                                            <p className="text-xs text-gray-500">{grupo.creador.email}</p>
                                        </div>
                                    </td>
                                    <td className="py-3 pr-4 text-center">
                                        <span className="text-gray-300">{grupo.miembros.length}</span>
                                    </td>
                                    <td className="py-3 text-gray-500">
                                        {grupo.createdAt.toLocaleDateString("es-ES", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                            timeZone: "Europe/Madrid",
                                        })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
