"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalcularPuntosPartido } from "@/lib/scoring";
import { generarBadges } from "@/lib/badges";
import { resolveKnockoutParticipants } from "@/lib/knockout-resolver";
import { revalidatePath, revalidateTag } from "next/cache";
import type { EstadoPartido } from "@prisma/client";

async function requireAdminOrEditor() {
    const session = await auth();
    const role = session?.user?.role;
    if (role !== "ADMIN" && role !== "EDITOR") throw new Error("No autorizado");
}

export async function actualizarPartido(
    id: string,
    data: {
        fechaPartido: string;
        estado: EstadoPartido;
        equipoLocal?: string;
        equipoVisitante?: string;
        golesLocalReal: string;
        golesVisitanteReal: string;
    }
) {
    await requireAdminOrEditor();

    const gL = data.golesLocalReal.trim() === "" ? null : parseInt(data.golesLocalReal, 10);
    const gV =
        data.golesVisitanteReal.trim() === "" ? null : parseInt(data.golesVisitanteReal, 10);

    if (gL !== null && (isNaN(gL) || gL < 0))
        return { error: "Goles local inválidos" };
    if (gV !== null && (isNaN(gV) || gV < 0))
        return { error: "Goles visitante inválidos" };

    const fecha = new Date(data.fechaPartido);
    if (isNaN(fecha.getTime())) return { error: "Fecha inválida" };

    const equipoLocal = data.equipoLocal?.trim();
    const equipoVisitante = data.equipoVisitante?.trim();
    if (equipoLocal !== undefined && equipoLocal === "")
        return { error: "El nombre del equipo local no puede estar vacío" };
    if (equipoVisitante !== undefined && equipoVisitante === "")
        return { error: "El nombre del equipo visitante no puede estar vacío" };

    await prisma.partido.update({
        where: { id },
        data: {
            fechaPartido: fecha,
            estado: data.estado,
            ...(equipoLocal !== undefined && { equipoLocal }),
            ...(equipoVisitante !== undefined && { equipoVisitante }),
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

    if (data.estado === "FINALIZADO") {
        void generarBadges();
    }

    // Trigger knockout resolver whenever a group match gets a result
    const partidoActualizado = await prisma.partido.findUnique({
        where: { id },
        select: { fase: true, golesLocalReal: true, golesVisitanteReal: true },
    });
    if (
        partidoActualizado?.fase === "GRUPOS" &&
        partidoActualizado.golesLocalReal !== null &&
        partidoActualizado.golesVisitanteReal !== null
    ) {
        void resolveKnockoutParticipants();
    }

    revalidateTag("ranking", "max");
    revalidatePath("/admin/partidos");
    revalidatePath(`/admin/partidos/${id}`);
    revalidatePath("/quiniela");
    revalidatePath("/quiniela/ranking");
    revalidatePath("/porra");
    revalidatePath("/porra/ranking");
    revalidatePath("/ranking");

    return { ok: true };
}

export async function triggerKnockoutResolver() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") throw new Error("No autorizado");

    const result = await resolveKnockoutParticipants();

    if (result.updated.length > 0) {
        revalidatePath("/admin/partidos");
        revalidatePath("/quiniela");
    }

    return result;
}
