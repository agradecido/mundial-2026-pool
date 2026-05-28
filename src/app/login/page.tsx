import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <main className="min-h-dvh flex items-center justify-center px-4"
      style={{
        background: "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(0,232,122,0.08) 0%, transparent 60%), #070711",
      }}
    >
      {/* Glow orb */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#00e87a]/5 blur-3xl" />

      <div className="glass-card relative w-full max-w-sm p-8 text-center">
        {/* Top glow line */}
        <div className="absolute inset-x-0 top-0 h-px rounded-t-xl bg-gradient-to-r from-transparent via-[#00e87a]/50 to-transparent" />

        <div className="mb-8">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Porra Mundial 2026
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            48 equipos · 104 partidos · 1 campeón
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="group w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-white transition-all hover:border-white/20 hover:bg-white/10"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Entrar con Google
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-600">
          Acceso libre a cualquier usuario con cuenta de Google. No se almacenará ningún dato personal más allá de tu correo y nombre de usuario, y solo se utilizarán para mostrar tu porra en el ranking.
        </p>
      </div>
    </main>
  );
}
