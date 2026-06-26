import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import UserMenu from "@/components/user-menu";
import { LinkSpinner } from "@/components/nav-button";

export default async function Header() {
  const session = await auth();

  let adminLinks: { href: string; label: string }[] = [];

  if (session?.user?.role === "ADMIN") {
    adminLinks = [{ href: "/admin", label: "Admin" }];
  } else if (session?.user?.role === "EDITOR") {
    adminLinks = [{ href: "/admin/partidos", label: "Admin" }];
  }

  const navLinks = [
    { href: "/porra", label: "Porra" },
    { href: "/quiniela", label: "Quiniela" },
    { href: "/clasificacion", label: "Así va el mundial" },
    { href: "/grupos", label: "Grupos" },
    { href: "/ranking", label: "Ranking" },
    // { href: "/porra/stats", label: "Consenso" },
    { href: "/ayuda", label: "Ayuda" },
    ...adminLinks,
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-black/40 backdrop-blur-xl">
      {/* top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00e87a]/60 to-transparent" />

      <div className="mx-auto max-w-[1600px] px-4">
        {/* Main row */}
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl">⚽</span>
            <span className="font-bold text-base tracking-tight">
              <span className="bg-gradient-to-r from-[#00e87a] to-emerald-300 bg-clip-text text-transparent">
                Porra
              </span>
              <span className="text-white/90"> Mundial 2026</span>
            </span>
            <LinkSpinner className="size-3.5 shrink-0 text-[#00e87a]" />
          </Link>

          {/* Nav — desktop only */}
          <nav className="hidden sm:flex items-center gap-1 text-sm font-medium">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                {label}
                <LinkSpinner className="size-3.5 shrink-0" />
              </Link>
            ))}
          </nav>

          {/* User */}
          {session?.user && (
            <UserMenu
              name={session.user.name}
              image={session.user.image}
              role={session.user.role}
              signOutAction={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            />
          )}
        </div>

      </div>
    </header>
  );
}
