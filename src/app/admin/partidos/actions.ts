"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalcularPuntosPartido } from "@/lib/scoring";
import { generarBadges } from "@/lib/badges";
import { revalidatePath, revalidateTag } from "next/cache";
import type { EstadoPartido, Fase } from "@prisma/client";

/**
 * Convierte un string "YYYY-MM-DDTHH:mm" en hora de Madrid (Europe/Madrid) a Date UTC.
 * Usa dos iteraciones para manejar correctamente el cambio de horario (CET/CEST).
 */
function madridLocalToUTC(dtLocal: string): Date {
    const utcApprox = new Date(dtLocal + ":00Z");
    const getOffset = (d: Date) => {
        const madridStr = d.toLocaleString("sv-SE", { timeZone: "Europe/Madrid" });
        return new Date(madridStr.replace(" ", "T") + "Z").getTime() - d.getTime();
    };
    const utcAdjusted = new Date(utcApprox.getTime() - getOffset(utcApprox));
    return new Date(utcApprox.getTime() - getOffset(utcAdjusted));
}

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

    const fecha = madridLocalToUTC(data.fechaPartido);
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

export async function crearPartido(data: {
    equipoLocal: string;
    equipoVisitante: string;
    fechaPartido: string; // "YYYY-MM-DDTHH:mm" hora Madrid
    fase: Fase;
    grupo?: string;
    estadio?: string;
    ciudad?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { ok: false, error: "No autorizado" };

    const equipoLocal = data.equipoLocal.trim();
    const equipoVisitante = data.equipoVisitante.trim();
    if (!equipoLocal) return { ok: false, error: "El equipo local no puede estar vacío" };
    if (!equipoVisitante) return { ok: false, error: "El equipo visitante no puede estar vacío" };

    const fecha = madridLocalToUTC(data.fechaPartido);
    if (Number.isNaN(fecha.getTime())) return { ok: false, error: "Fecha inválida" };

    const partido = await prisma.partido.create({
        data: {
            equipoLocal,
            equipoVisitante,
            fechaPartido: fecha,
            fase: data.fase,
            grupo: data.grupo?.trim() || null,
            estadio: data.estadio?.trim() || null,
            ciudad: data.ciudad?.trim() || null,
        },
    });

    revalidatePath("/admin/partidos");
    revalidatePath("/quiniela");
    revalidatePath("/ranking");

    return { ok: true, id: partido.id };
}

export async function eliminarPartido(id: string): Promise<{ ok: boolean; error?: string }> {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { ok: false, error: "No autorizado" };

    await prisma.partido.delete({ where: { id } });

    revalidateTag("ranking", "max");
    revalidatePath("/admin/partidos");
    revalidatePath("/quiniela");
    revalidatePath("/quiniela/ranking");
    revalidatePath("/ranking");

    return { ok: true };
}

export async function recalcularTodosFinalizados() {
    await requireAdminOrEditor();

    const [partidos, users] = await Promise.all([
        prisma.partido.findMany({
            where: { estado: "FINALIZADO" },
            select: { id: true },
        }),
        prisma.user.findMany({ select: { id: true } }),
    ]);

    for (const partido of partidos) {
        await prisma.pronostico.createMany({
            data: users.map((u) => ({ userId: u.id, partidoId: partido.id, golesLocal: 0, golesVisitante: 0 })),
            skipDuplicates: true,
        });
        await recalcularPuntosPartido(partido.id);
    }

    revalidateTag("ranking", "max");
    revalidatePath("/ranking");
    revalidatePath("/quiniela/ranking");
    revalidatePath("/quiniela");

    return { ok: true, count: partidos.length };
}
