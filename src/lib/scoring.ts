import type { Fase } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Calcula los puntos ganados por un pronóstico según las reglas de la quiniela.
 * Sistema jerárquico: se asigna únicamente el puntaje más alto que corresponda.
 * Multiplicador x2 desde la fase de DIECISEISAVOS en adelante.
 */
export function calcularPuntos(
    pred: { golesLocal: number; golesVisitante: number },
    real: { golesLocal: number; golesVisitante: number },
    fase: Fase
): number {
    const mult = fase === "GRUPOS" ? 1 : 2;
    const { golesLocal: pL, golesVisitante: pV } = pred;
    const { golesLocal: rL, golesVisitante: rV } = real;

    // 1. Marcador exacto
    if (pL === rL && pV === rV) return 5 * mult;

    // 2. Tendencia correcta
    const pTend = pL > pV ? "L" : pL < pV ? "V" : "E";
    const rTend = rL > rV ? "L" : rL < rV ? "V" : "E";
    if (pTend === rTend) return 3 * mult;

    // 3. Consolación: tendencia errónea pero goles de un equipo exactos
    if (pL === rL || pV === rV) return 1 * mult;

    // 4. Fallo total
    return 0;
}

/**
 * Recalcula y persiste puntosGanados para todos los Pronostico asociados a un partido.
 * Si el partido aún no tiene resultado (goles null), resetea todos a 0.
 */
export async function recalcularPuntosPartido(partidoId: string): Promise<void> {
    const partido = await prisma.partido.findUnique({ where: { id: partidoId } });
    if (!partido) return;

    const { golesLocalReal, golesVisitanteReal, fase } = partido;

    if (golesLocalReal === null || golesVisitanteReal === null) {
        await prisma.pronostico.updateMany({
            where: { partidoId },
            data: { puntosGanados: 0 },
        });
        return;
    }

    const pronosticos = await prisma.pronostico.findMany({ where: { partidoId } });

    await Promise.all(
        pronosticos.map((p) =>
            prisma.pronostico.update({
                where: { id: p.id },
                data: {
                    puntosGanados: calcularPuntos(
                        { golesLocal: p.golesLocal, golesVisitante: p.golesVisitante },
                        { golesLocal: golesLocalReal, golesVisitante: golesVisitanteReal },
                        fase
                    ),
                },
            })
        )
    );
}
