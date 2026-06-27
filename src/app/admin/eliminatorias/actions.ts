"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("No autorizado");
}

function revalidateAll() {
  revalidatePath("/admin/eliminatorias");
  revalidatePath("/admin/partidos");
  revalidatePath("/quiniela");
  revalidatePath("/quiniela/ranking");
  revalidatePath("/porra");
  revalidatePath("/porra/ranking");
  revalidatePath("/ranking");
  revalidatePath("/clasificacion");
}

export async function sincronizarEquipos(
  partidoId: string,
  equipoLocal: string,
  equipoVisitante: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  await prisma.partido.update({
    where: { id: partidoId },
    data: { equipoLocal, equipoVisitante },
  });

  revalidateAll();
  return { ok: true };
}

export async function sincronizarTodos(
  matches: Array<{ partidoId: string; equipoLocal: string; equipoVisitante: string }>,
): Promise<{ ok: boolean; count: number; error?: string }> {
  await requireAdmin();

  for (const { partidoId, equipoLocal, equipoVisitante } of matches) {
    await prisma.partido.update({
      where: { id: partidoId },
      data: { equipoLocal, equipoVisitante },
    });
  }

  revalidateAll();
  return { ok: true, count: matches.length };
}

export async function revertirAPlaceholder(
  partidoId: string,
  placeholderLocal: string,
  placeholderVisitante: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  await prisma.partido.update({
    where: { id: partidoId },
    data: { equipoLocal: placeholderLocal, equipoVisitante: placeholderVisitante },
  });

  revalidateAll();
  return { ok: true };
}
