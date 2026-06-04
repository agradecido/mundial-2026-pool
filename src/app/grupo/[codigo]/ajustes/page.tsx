import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";
import GrupoAjustesPanel from "@/components/grupo-ajustes-panel";

export default async function GrupoAjustesPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const grupo = await prisma.grupo.findUnique({
    where: { codigo },
    include: {
      miembros: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!grupo) notFound();

  const isMember = grupo.miembros.some((m) => m.userId === session.user.id);
  if (!isMember) redirect(`/grupo/${codigo}/unirse`);

  const isCreador = grupo.creadorId === session.user.id;

  const tournamentStarted = await prisma.partido.findFirst({
    where: { golesLocalReal: { not: null } },
    select: { id: true },
  }).then(Boolean);

  const miembros = grupo.miembros.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    image: m.user.image,
  }));

  return (
    <div className="max-w-sm mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Link href={`/grupo/${codigo}`} className="text-gray-500 hover:text-white transition-colors">
          <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <LinkSpinner className="size-3.5 shrink-0" />
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight">Ajustes del grupo</h1>
      </div>

      <div className="glass-card p-6">
        <GrupoAjustesPanel
          grupoId={grupo.id}
          grupoNombre={grupo.nombre}
          codigo={codigo}
          miembros={miembros}
          isCreador={isCreador}
          tournamentStarted={tournamentStarted as boolean}
        />
      </div>
    </div>
  );
}
