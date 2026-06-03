"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalcularPuntosPartido } from "@/lib/scoring";
import { revalidatePath } from "next/cache";
import type { EstadoPartido } from "@prisma/client";

async function requireAdmin() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") throw new Error("No autorizado");
}

export async function actualizarPartido(
    id: string,
    data: {
        fechaPartido: string;
        estado: EstadoPartido;
        golesLocalReal: string;
        golesVisitanteReal: string;
    }
) {
    await requireAdmin();

    const gL = data.golesLocalReal.trim() === "" ? null : parseInt(data.golesLocalReal, 10);
    const gV =
        data.golesVisitanteReal.trim() === "" ? null : parseInt(data.golesVisitanteReal, 10);

    if (gL !== null && (isNaN(gL) || gL < 0))
        return { error: "Goles local inválidos" };
    if (gV !== null && (isNaN(gV) || gV < 0))
        return { error: "Goles visitante inválidos" };

    const fecha = new Date(data.fechaPartido);
    if (isNaN(fecha.getTime())) return { error: "Fecha inválida" };

    await prisma.partido.update({
        where: { id },
        data: {
            fechaPartido: fecha,
            estado: data.estado,
            golesLocalReal: gL,
            golesVisitanteReal: gV,
        },
    });

    // Crear pronóstico 0-0 para usuarios que no apostaron antes del cierre
    const users = await prisma.user.findMany({ select: { id: true } });
    await prisma.pronostico.createMany({
        data: users.map((u) => ({ userId: u.id, partidoId: id, golesLocal: 0, golesVisitante: 0 })),
        skipDuplicates: true,
    });

    await recalcularPuntosPartido(id);

    revalidatePath("/admin/partidos");
    revalidatePath(`/admin/partidos/${id}`);
    revalidatePath("/quiniela");
    revalidatePath("/quiniela/ranking");
    revalidatePath("/porra");
    revalidatePath("/porra/ranking");
    revalidatePath("/ranking");

    return { ok: true };
}
