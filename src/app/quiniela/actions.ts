"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function guardarPronostico(
  partidoId: string,
  golesLocal: number,
  golesVisitante: number
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };

  const partido = await prisma.partido.findUnique({ where: { id: partidoId } });
  if (!partido) return { error: "Partido no encontrado" };

  const ahora = new Date();
  const limite = new Date(partido.fechaPartido.getTime() - 15 * 60 * 1000);
  if (ahora >= limite) return { error: "Pronóstico bloqueado" };

  await prisma.pronostico.upsert({
    where: { userId_partidoId: { userId: session.user.id, partidoId } },
    create: { userId: session.user.id, partidoId, golesLocal, golesVisitante },
    update: { golesLocal, golesVisitante },
  });

  revalidatePath("/quiniela");
  revalidatePath("/quiniela/ranking");
  return { ok: true };
}

export async function resetearPronosticosFuturos() {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };

  const ahora = new Date();
  const limite = new Date(ahora.getTime() + 15 * 60 * 1000);

  // Partidos que aún están abiertos para pronóstico
  const partidosAbiertos = await prisma.partido.findMany({
    where: { estado: "PROGRAMADO", fechaPartido: { gt: limite } },
    select: { id: true },
  });

  const { count } = await prisma.pronostico.deleteMany({
    where: {
      userId: session.user.id,
      partidoId: { in: partidosAbiertos.map((p) => p.id) },
    },
  });

  revalidatePath("/quiniela");
  revalidatePath("/quiniela/ranking");
  return { ok: true, count };
}
