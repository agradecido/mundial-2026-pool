import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";

export default async function AdminDashboard() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") redirect("/");

    const [totalUsuarios, totalPartidos, partidosFinalizados, totalPronosticos] =
        await Promise.all([
            prisma.user.count(),
            prisma.partido.count(),
            prisma.partido.count({ where: { estado: "FINALIZADO" } }),
            prisma.pronostico.count(),
        ]);

    const stats = [
        {
            label: "Usuarios registrados",
            value: totalUsuarios,
            href: "/admin/usuarios",
            icon: "👥",
        },
        {
            label: "Partidos finalizados",
            value: `${partidosFinalizados} / ${totalPartidos}`,
            href: "/admin/partidos",
            icon: "⚽",
        },
        {
            label: "Pronósticos totales",
            value: totalPronosticos,
            href: null,
            icon: "📋",
        },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.map(({ label, value, href, icon }) => {
                    const card = (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-5 flex items-center gap-4 transition-colors hover:border-white/20">
                            <span className="text-3xl">{icon}</span>
                            <div>
                                <p className="text-2xl font-bold text-white">{value}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                            </div>
                        </div>
                    );
                    return href ? (
                        <Link key={label} href={href} className="relative block">
                            {card}
                            <LinkSpinner className="absolute right-3 top-3 size-4 text-[#00e87a]" />
                        </Link>
                    ) : (
                        <div key={label}>{card}</div>
                    );
                })}
            </div>

            <div className="flex gap-3 flex-wrap">
                <Link
                    href="/admin/partidos"
                    className="btn-save rounded-xl px-5 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                    Gestionar partidos
                    <LinkSpinner className="size-4 shrink-0" />
                </Link>
                <Link
                    href="/admin/usuarios"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-gray-300 hover:border-white/20 hover:text-white active:scale-[0.97] [touch-action:manipulation] transition-all duration-100"
                >
                    Gestionar usuarios
                    <LinkSpinner className="size-4 shrink-0" />
                </Link>
            </div>
        </div>
    );
}
