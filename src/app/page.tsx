import { auth } from "@/lib/auth";
import NavButton from "@/components/nav-button";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-7xl mb-6 select-none">⚽</p>

      <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
        Bienvenido,{" "}
        <span className="bg-gradient-to-r from-[#00e87a] to-emerald-300 bg-clip-text text-transparent">
          {session?.user?.name?.split(" ")[0]}
        </span>
      </h1>
      <p className="text-gray-500 mb-10 text-sm">
        El Mundial 2026 arranca el 11 de junio. ¡Haz tus pronósticos antes del pitido inicial!
      </p>

      <div className="flex gap-3">
        <NavButton
          href="/porra"
          className="btn-save rounded-xl px-6 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2"
        >
          Porra
        </NavButton>
        <NavButton
          href="/quiniela"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-gray-300 hover:border-white/20 hover:text-white active:scale-[0.96] active:bg-white/10 active:border-white/30 [touch-action:manipulation] transition-all duration-100"
        >
          Quiniela
        </NavButton>
      </div>
    </div>
  );
}
