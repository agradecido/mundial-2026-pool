import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";
import CrearGrupoForm from "@/components/crear-grupo-form";

export default async function NuevoGrupoPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tournamentStarted = await prisma.partido.findFirst({
    where: { golesLocalReal: { not: null } },
    select: { id: true },
  }).then(Boolean);

  if (tournamentStarted) redirect("/grupos");

  return (
    <div className="max-w-sm mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/grupos"
          className="text-gray-500 hover:text-white transition-colors"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <LinkSpinner className="size-3.5 shrink-0" />
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight">Nuevo grupo</h1>
      </div>

      <div className="glass-card p-6">
        <p className="text-sm text-gray-500 mb-6">
          Crea tu grupo privado y comparte el link de invitación con tus amigos. Podéis uniros hasta que empiece el Mundial.
        </p>
        <CrearGrupoForm />
      </div>
    </div>
  );
}
