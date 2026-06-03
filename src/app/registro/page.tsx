import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmailRegisterForm from "@/components/email-register-form";

export default async function RegistroPage() {
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
            Crear cuenta
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Porra Mundial 2026
          </p>
        </div>

        <EmailRegisterForm />

        <p className="mt-6 text-xs text-gray-600">
          No se almacenará ningún dato personal más allá de tu correo y nombre de usuario, y solo se utilizarán para mostrar tu porra en el ranking.
        </p>
      </div>
    </main>
  );
}
