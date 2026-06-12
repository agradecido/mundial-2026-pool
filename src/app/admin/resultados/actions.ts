"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalcularPuntosPartido } from "@/lib/scoring";
import { revalidatePath, revalidateTag } from "next/cache";

async function requireAdminOrEditor() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "EDITOR") throw new Error("No autorizado");
}

function revalidateAll() {
  revalidateTag("ranking", "max");
  revalidatePath("/admin/partidos");
  revalidatePath("/admin/resultados");
  revalidatePath("/quiniela");
  revalidatePath("/quiniela/ranking");
  revalidatePath("/porra");
  revalidatePath("/porra/ranking");
  revalidatePath("/ranking");
}

export async function importarResultado(
  partidoId: string,
  golesLocal: number,
  golesVisitante: number
): Promise<{ ok: boolean; error?: string }> {
  await requireAdminOrEditor();

  await prisma.partido.update({
    where: { id: partidoId },
    data: { golesLocalReal: golesLocal, golesVisitanteReal: golesVisitante, estado: "FINALIZADO" },
  });

  const users = await prisma.user.findMany({ select: { id: true } });
  await prisma.pronostico.createMany({
    data: users.map((u) => ({ userId: u.id, partidoId, golesLocal: 0, golesVisitante: 0 })),
    skipDuplicates: true,
  });

  await recalcularPuntosPartido(partidoId);
  revalidateAll();

  return { ok: true };
}

export async function importarTodosFinalizados(
  matches: Array<{ partidoId: string; golesLocal: number; golesVisitante: number }>
): Promise<{ ok: boolean; count: number; error?: string }> {
  await requireAdminOrEditor();

  if (matches.length === 0) return { ok: true, count: 0 };

  const users = await prisma.user.findMany({ select: { id: true } });

  for (const { partidoId, golesLocal, golesVisitante } of matches) {
    await prisma.partido.update({
      where: { id: partidoId },
      data: { golesLocalReal: golesLocal, golesVisitanteReal: golesVisitante, estado: "FINALIZADO" },
    });

    await prisma.pronostico.createMany({
      data: users.map((u) => ({ userId: u.id, partidoId, golesLocal: 0, golesVisitante: 0 })),
      skipDuplicates: true,
    });

    await recalcularPuntosPartido(partidoId);
  }

  revalidateAll();
  return { ok: true, count: matches.length };
}
