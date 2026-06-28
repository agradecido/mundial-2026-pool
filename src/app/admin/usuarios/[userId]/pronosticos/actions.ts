"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalcularPuntosPartido } from "@/lib/scoring";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("No autorizado");
}

export async function actualizarPronosticoAdmin(
  userId: string,
  partidoId: string,
  golesLocal: number,
  golesVisitante: number,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  if (!Number.isInteger(golesLocal) || golesLocal < 0) return { ok: false, error: "Goles local inválidos" };
  if (!Number.isInteger(golesVisitante) || golesVisitante < 0) return { ok: false, error: "Goles visitante inválidos" };

  const partido = await prisma.partido.findUnique({
    where: { id: partidoId },
    select: { estado: true },
  });
  if (!partido) return { ok: false, error: "Partido no encontrado" };

  await prisma.pronostico.upsert({
    where: { userId_partidoId: { userId, partidoId } },
    create: { userId, partidoId, golesLocal, golesVisitante, puntosGanados: 0 },
    update: { golesLocal, golesVisitante },
  });

  if (partido.estado === "FINALIZADO") {
    await recalcularPuntosPartido(partidoId);
  }

  revalidatePath(`/admin/usuarios/${userId}/pronosticos`);
  revalidatePath("/quiniela");
  revalidatePath("/quiniela/ranking");
  revalidatePath("/ranking");

  return { ok: true };
}
