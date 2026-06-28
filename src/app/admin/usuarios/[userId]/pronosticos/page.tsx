import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PronosticosEditor from "@/components/admin/pronosticos-editor";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function AdminPronosticosPage({ params }: Props) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const { userId } = await params;

  const [usuario, partidos, pronosticos] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true },
    }),
    prisma.partido.findMany({
      orderBy: { fechaPartido: "asc" },
      select: {
        id: true,
        equipoLocal: true,
        equipoVisitante: true,
        fechaPartido: true,
        estado: true,
        fase: true,
        grupo: true,
        golesLocalReal: true,
        golesVisitanteReal: true,
      },
    }),
    prisma.pronostico.findMany({
      where: { userId },
      select: {
        partidoId: true,
        golesLocal: true,
        golesVisitante: true,
        puntosGanados: true,
      },
    }),
  ]);

  if (!usuario) redirect("/admin/usuarios");

  const pronosticoMap = Object.fromEntries(
    pronosticos.map((p) => [p.partidoId, p]),
  );

  const serializedPartidos = partidos.map((p) => ({
    ...p,
    fechaPartido: p.fechaPartido.toISOString(),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/usuarios"
          className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
        >
          ← Usuarios
        </Link>
        <span className="text-gray-700">/</span>
        <div>
          <h2 className="text-lg font-semibold text-white">
            Pronósticos de {usuario.name ?? usuario.email}
          </h2>
          <p className="text-xs text-gray-500">{usuario.email}</p>
        </div>
      </div>

      <PronosticosEditor
        userId={userId}
        partidos={serializedPartidos}
        pronosticoMap={pronosticoMap}
      />
    </div>
  );
}
