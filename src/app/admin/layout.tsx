import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") redirect("/");

    const navItems = [
        { href: "/admin", label: "Dashboard", exact: true },
        { href: "/admin/partidos", label: "Partidos" },
        { href: "/admin/usuarios", label: "Usuarios" },
    ];

    return (
        <div className="space-y-6">
            {/* Header de sección */}
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <span className="text-2xl">🛠️</span>
                <h1 className="text-xl font-bold text-white tracking-tight">
                    Administración
                </h1>
            </div>

            {/* Subnav */}
            <nav className="flex gap-1 text-sm font-medium">
                {navItems.map(({ href, label }) => (
                    <Link
                        key={href}
                        href={href}
                        className="rounded-lg px-4 py-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                    >
                        {label}
                    </Link>
                ))}
            </nav>

            {/* Contenido */}
            <div>{children}</div>
        </div>
    );
}
