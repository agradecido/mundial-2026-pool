import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PartidosTabs from "@/components/partidos-tabs";

export default async function PartidosPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [partidos, pronosticos] = await Promise.all([
    prisma.partido.findMany({ orderBy: { fechaPartido: "asc" } }),
    prisma.pronostico.findMany({ where: { userId } }),
  ]);

  const pronosticoMap = Object.fromEntries(
    pronosticos.map((p) => [p.partidoId, { golesLocal: p.golesLocal, golesVisitante: p.golesVisitante }])
  );

  const serializedPartidos = partidos.map((p) => ({
    ...p,
    fechaPartido: p.fechaPartido.toISOString(),
  }));

  const totalPronosticos = pronosticos.length;
  const pct = Math.round((totalPronosticos / 104) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Quiniela</h1>
          <p className="mt-1 text-sm text-gray-500">Pronostica el marcador de cada partido</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600 mb-1">{totalPronosticos} / 104 pronósticos</p>
          <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00e87a] to-emerald-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <PartidosTabs partidos={serializedPartidos} pronosticoMap={pronosticoMap} />
    </div>
  );
}
