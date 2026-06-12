import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const role = session?.user?.role;

    if (role !== "ADMIN" && role !== "EDITOR") redirect("/");

    // EDITOR solo puede acceder a /admin/partidos
    if (role === "EDITOR") {
        const navItems = [
            { href: "/admin/partidos", label: "Partidos" },
            { href: "/admin/resultados", label: "Importar" },
        ];
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                    <span className="text-2xl">🛠️</span>
                    <h1 className="text-xl font-bold text-white tracking-tight">
                        Resultados
                    </h1>
                </div>
                <nav className="flex gap-1 text-sm font-medium">
                    {navItems.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                        >
                            {label}
                            <LinkSpinner className="size-3.5 shrink-0" />
                        </Link>
                    ))}
                </nav>
                <div>{children}</div>
            </div>
        );
    }

    const navItems = [
        { href: "/admin", label: "Dashboard", exact: true },
        { href: "/admin/partidos", label: "Partidos" },
        { href: "/admin/resultados", label: "Importar" },
        { href: "/admin/usuarios", label: "Usuarios" },
        { href: "/admin/grupos", label: "Grupos" },
        { href: "/admin/modales", label: "Modales" },
        { href: "/admin/emails", label: "Emails" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <span className="text-2xl">🛠️</span>
                <h1 className="text-xl font-bold text-white tracking-tight">
                    Administración
                </h1>
            </div>

            <nav className="flex gap-1 text-sm font-medium">
                {navItems.map(({ href, label }) => (
                    <Link
                        key={href}
                        href={href}
                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                    >
                        {label}
                        <LinkSpinner className="size-3.5 shrink-0" />
                    </Link>
                ))}
            </nav>

            <div>{children}</div>
        </div>
    );
}
