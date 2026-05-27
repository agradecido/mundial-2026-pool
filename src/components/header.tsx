import { auth, signOut } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";

export default async function Header() {
  const session = await auth();

  return (
    <header className="bg-green-900 text-white shadow-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg hover:text-green-200 transition-colors">
          <span>⚽</span>
          <span>Porra Mundial 2026</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
          <Link href="/partidos" className="hover:text-green-200 transition-colors">
            Partidos
          </Link>
          <Link href="/ranking" className="hover:text-green-200 transition-colors">
            Ranking
          </Link>
          {session?.user?.role === "ADMIN" && (
            <Link href="/admin" className="hover:text-green-200 transition-colors">
              Admin
            </Link>
          )}
        </nav>

        {session?.user && (
          <div className="flex items-center gap-3">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.name ?? ""}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <span className="hidden sm:block text-sm">{session.user.name}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-md bg-green-700 px-3 py-1.5 text-sm hover:bg-green-600 transition-colors"
              >
                Salir
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
