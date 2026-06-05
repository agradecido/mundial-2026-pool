"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addUserToGrupo(codigo: string, userId: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");

  const grupo = await prisma.grupo.findUnique({ where: { codigo } });
  if (!grupo) throw new Error("Grupo no encontrado");

  await prisma.grupoMiembro.upsert({
    where: { grupoId_userId: { grupoId: grupo.id, userId } },
    create: { grupoId: grupo.id, userId },
    update: {},
  });

  revalidatePath(`/grupo/${codigo}`);
}
