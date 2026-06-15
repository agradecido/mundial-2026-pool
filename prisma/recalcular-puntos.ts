import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "dotenv";
import { calcularPuntos } from "../src/lib/scoring";

config({ path: ".env.local" });
config({ path: ".env" });

const adapter = new PrismaNeon({
    connectionString: process.env.PORRA_POSTGRES_PRISMA_URL!,
});
const prisma = new PrismaClient({ adapter } as never);

async function main() {
    const partidos = await prisma.partido.findMany({
        where: {
            estado: "FINALIZADO",
            golesLocalReal: { not: null },
            golesVisitanteReal: { not: null },
        },
        orderBy: { fechaPartido: "asc" },
    });

    console.log(`Recalculando ${partidos.length} partidos finalizados…`);

    let total = 0;
    for (const partido of partidos) {
        const pronosticos = await prisma.pronostico.findMany({ where: { partidoId: partido.id } });

        await Promise.all(
            pronosticos.map((p) =>
                prisma.pronostico.update({
                    where: { id: p.id },
                    data: {
                        puntosGanados: calcularPuntos(
                            { golesLocal: p.golesLocal, golesVisitante: p.golesVisitante },
                            { golesLocal: partido.golesLocalReal!, golesVisitante: partido.golesVisitanteReal! },
                            partido.fase
                        ),
                    },
                })
            )
        );

        total += pronosticos.length;
        console.log(`  ✓ ${partido.equipoLocal} vs ${partido.equipoVisitante} (${partido.golesLocalReal}-${partido.golesVisitanteReal}) — ${pronosticos.length} pronósticos`);
    }

    console.log(`\nListo. ${total} pronósticos actualizados.`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
