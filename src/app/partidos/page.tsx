import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PartidoCard from "@/components/partido-card";
import type { Fase } from "@prisma/client";

const FASES_ORDEN: Fase[] = [
  "DIECISEISAVOS",
  "OCTAVOS",
  "CUARTOS",
  "SEMIFINAL",
  "TERCER_PUESTO",
  "FINAL",
];

const FASE_LABEL: Record<Fase, string> = {
  GRUPOS: "Fase de Grupos",
  DIECISEISAVOS: "Dieciseisavos de Final",
  OCTAVOS: "Octavos de Final",
  CUARTOS: "Cuartos de Final",
  SEMIFINAL: "Semifinales",
  TERCER_PUESTO: "Tercer y Cuarto Puesto",
  FINAL: "Final",
};

export default async function PartidosPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [partidos, pronosticos] = await Promise.all([
    prisma.partido.findMany({ orderBy: { fechaPartido: "asc" } }),
    prisma.pronostico.findMany({ where: { userId } }),
  ]);

  const pronosticoMap = Object.fromEntries(
    pronosticos.map((p) => [p.partidoId, p])
  );

  // Separate group stage and knockout
  const grupos = partidos.filter((p) => p.fase === "GRUPOS");
  const eliminatorias = partidos.filter((p) => p.fase !== "GRUPOS");

  // Group by grupo letter (A-L)
  const porGrupo = grupos.reduce<Record<string, typeof grupos>>((acc, p) => {
    const g = p.grupo ?? "?";
    (acc[g] ??= []).push(p);
    return acc;
  }, {});
  const gruposOrdenados = Object.keys(porGrupo).sort();

  // Knockout by fase
  const porFase = eliminatorias.reduce<Record<string, typeof eliminatorias>>(
    (acc, p) => {
      (acc[p.fase] ??= []).push(p);
      return acc;
    },
    {}
  );

  function serializePartido(p: (typeof partidos)[0]) {
    return { ...p, fechaPartido: p.fechaPartido.toISOString() };
  }

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Partidos</h1>

      {/* Fase de grupos */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-700">
          Fase de Grupos
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {gruposOrdenados.map((letra) => (
            <div key={letra}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-green-800">
                Grupo {letra}
              </h3>
              <div className="space-y-1">
                {porGrupo[letra].map((p) => (
                  <PartidoCard
                    key={p.id}
                    partido={serializePartido(p)}
                    pronostico={pronosticoMap[p.id] ?? null}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fases eliminatorias */}
      {FASES_ORDEN.filter((f) => porFase[f]?.length).map((fase) => (
        <section key={fase}>
          <h2 className="mb-3 text-lg font-semibold text-gray-700">
            {FASE_LABEL[fase]}
          </h2>
          <div className="space-y-1">
            {porFase[fase].map((p) => (
              <PartidoCard
                key={p.id}
                partido={serializePartido(p)}
                pronostico={pronosticoMap[p.id] ?? null}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
