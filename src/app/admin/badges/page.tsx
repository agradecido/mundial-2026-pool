import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import GenerarBadgesButton from "@/components/generar-badges-button";

export default async function AdminBadgesPage() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") redirect("/");

    const usuarios = await prisma.user.findMany({
        orderBy: { fechaRegistro: "asc" },
        select: {
            id: true,
            name: true,
            image: true,
            badge: {
                select: { titulo: true, emoji: true, descripcion: true, generadoEn: true },
            },
        },
    });

    const conBadge = usuarios.filter((u) => u.badge);
    const sinBadge = usuarios.filter((u) => !u.badge);

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-white">Lo que la IA dice de ti</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {conBadge.length} de {usuarios.length} usuarios con badge generado
                    </p>
                </div>
                <GenerarBadgesButton />
            </div>

            {conBadge.length > 0 && (
                <div className="glass-card overflow-hidden !p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.07]">
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Usuario</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Badge</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">Descripción</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 hidden md:table-cell">Generado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {conBadge.map((u) => (
                                <tr key={u.id} className="border-b border-white/[0.04] last:border-0">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            {u.image ? (
                                                <Image src={u.image} alt="" width={28} height={28} className="rounded-full shrink-0" />
                                            ) : (
                                                <div className="size-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                                                    {u.name?.[0] ?? "?"}
                                                </div>
                                            )}
                                            <span className="font-medium text-gray-200 truncate">{u.name ?? "—"}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                                            <span className="text-base leading-none">{u.badge!.emoji}</span>
                                            <span className="font-semibold text-gray-200">{u.badge!.titulo}</span>
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{u.badge!.descripcion}</td>
                                    <td className="px-4 py-3 text-right text-gray-600 text-xs hidden md:table-cell whitespace-nowrap">
                                        {new Date(u.badge!.generadoEn).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {sinBadge.length > 0 && (
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Sin badge</p>
                    <div className="flex flex-wrap gap-2">
                        {sinBadge.map((u) => (
                            <div key={u.id} className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
                                {u.image ? (
                                    <Image src={u.image} alt="" width={20} height={20} className="rounded-full shrink-0" />
                                ) : (
                                    <div className="size-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                                        {u.name?.[0] ?? "?"}
                                    </div>
                                )}
                                <span className="text-xs text-gray-500">{u.name ?? "—"}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {usuarios.length === 0 && (
                <div className="glass-card p-10 text-center text-gray-600 text-sm">
                    No hay usuarios registrados
                </div>
            )}
        </div>
    );
}
