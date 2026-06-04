import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";

export default async function GruposPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const miembrias = await prisma.grupoMiembro.findMany({
    where: { userId: session.user.id },
    include: {
      grupo: {
        include: { _count: { select: { miembros: true } } },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const grupos = miembrias.map((m) => m.grupo);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Mis Grupos</h1>
          <p className="mt-1 text-sm text-gray-500">Rankings privados de la Porra</p>
        </div>
        <Link
          href="/grupos/nuevo"
          className="inline-flex items-center gap-2 rounded-xl bg-[#00e87a]/10 border border-[#00e87a]/30 px-4 py-2 text-sm font-medium text-[#00e87a] hover:bg-[#00e87a]/20 hover:border-[#00e87a]/50 transition-all"
        >
          + Crear grupo
          <LinkSpinner className="size-3.5 shrink-0" />
        </Link>
      </div>

      {grupos.length === 0 ? (
        <div className="glass-card p-16 text-center space-y-4">
          <p className="text-4xl">👥</p>
          <p className="text-white font-medium">Todavía no estás en ningún grupo</p>
          <p className="text-sm text-gray-500">Crea uno o pide a un amigo que te comparta su link de invitación</p>
          <Link
            href="/grupos/nuevo"
            className="inline-flex items-center gap-2 text-sm text-[#00e87a] hover:underline"
          >
            Crear mi primer grupo →
            <LinkSpinner className="size-3.5 shrink-0" />
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {grupos.map((grupo) => (
            <li key={grupo.id}>
              <Link
                href={`/grupo/${grupo.codigo}`}
                className="glass-card flex items-center justify-between gap-4 px-5 py-4 hover:border-white/20 transition-colors"
              >
                <div>
                  <p className="font-medium text-white">{grupo.nombre}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {grupo._count.miembros} {grupo._count.miembros === 1 ? "participante" : "participantes"}
                    {grupo.creadorId === session.user.id && (
                      <span className="ml-2 text-[#00e87a]/60">· creador</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <LinkSpinner className="size-4 shrink-0" />
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
