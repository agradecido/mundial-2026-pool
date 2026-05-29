import { auth, signOut } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";

export default async function Header() {
  const session = await auth();

  const navLinks = [
    { href: "/porra", label: "Porra" },
    { href: "/quiniela", label: "Quiniela" },
    { href: "/ranking", label: "Ranking" },
    { href: "/ayuda", label: "Ayuda" },
    ...(session?.user?.role === "ADMIN"
      ? [{ href: "/admin", label: "Admin" }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-black/40 backdrop-blur-xl">
      {/* top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00e87a]/60 to-transparent" />

      <div className="mx-auto max-w-[1400px] px-4">
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
          </Link>

          {/* Nav — desktop only */}
          <nav className="hidden sm:flex items-center gap-1 text-sm font-medium">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3 py-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User */}
          {session?.user && (
            <div className="flex items-center gap-2.5">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full ring-2 ring-[#00e87a]/30"
                />
              )}
              <span className="hidden sm:block text-sm text-gray-300 max-w-[120px] truncate">
                {session.user.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-colors"
                >
                  Salir
                </button>
              </form>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
