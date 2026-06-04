import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { joinGrupo } from "@/app/actions/grupos";

export default async function UnirseGrupoPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=/grupo/${codigo}/unirse`);

  const grupo = await prisma.grupo.findUnique({
    where: { codigo },
    include: {
      _count: { select: { miembros: true } },
      miembros: { where: { userId: session.user.id }, select: { userId: true } },
    },
  });
  if (!grupo) notFound();

  // Already a member — go straight to the group
  if (grupo.miembros.length > 0) redirect(`/grupo/${codigo}`);

  const tournamentStarted = await prisma.partido.findFirst({
    where: { golesLocalReal: { not: null } },
    select: { id: true },
  }).then(Boolean);

  return (
    <main
      className="min-h-dvh flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(0,232,122,0.08) 0%, transparent 60%), #070711",
      }}
    >
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#00e87a]/5 blur-3xl" />

      <div className="glass-card relative w-full max-w-sm p-8 text-center">
        <div className="absolute inset-x-0 top-0 h-px rounded-t-xl bg-gradient-to-r from-transparent via-[#00e87a]/50 to-transparent" />

        <div className="mb-8">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Invitación a grupo</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">{grupo.nombre}</h1>
          <p className="mt-2 text-sm text-gray-500">
            {grupo._count.miembros} {grupo._count.miembros === 1 ? "participante" : "participantes"}
          </p>
        </div>

        {tournamentStarted ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-gray-400">
            El torneo ya ha empezado. No se pueden unir nuevos participantes.
          </div>
        ) : (
          <form
            action={async () => {
              "use server";
              await joinGrupo(codigo);
            }}
          >
            <button
              type="submit"
              className="w-full rounded-xl bg-[#00e87a]/10 border border-[#00e87a]/30 px-5 py-3.5 text-sm font-medium text-[#00e87a] transition-all hover:bg-[#00e87a]/20 hover:border-[#00e87a]/50"
            >
              Unirse al grupo
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
