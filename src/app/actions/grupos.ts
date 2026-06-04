"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

async function isTournamentStarted(): Promise<boolean> {
  const played = await prisma.partido.findFirst({
    where: { golesLocalReal: { not: null } },
    select: { id: true },
  });
  return played !== null;
}

function generateCodigo(): string {
  return Math.random().toString(36).substring(2, 10);
}

export async function createGrupo(
  _prevState: { error?: string } | null,
  formData: FormData
) {
  const session = await auth();
  if (!session) redirect("/login");

  const nombre = (formData.get("nombre") as string)?.trim();
  if (!nombre) return { error: "El nombre es obligatorio" };
  if (nombre.length > 50) return { error: "El nombre no puede superar los 50 caracteres" };

  const tournamentStarted = await isTournamentStarted();
  if (tournamentStarted) return { error: "El torneo ya ha empezado, no se pueden crear nuevos grupos" };

  let codigo: string;
  let attempts = 0;
  do {
    codigo = generateCodigo();
    const exists = await prisma.grupo.findUnique({ where: { codigo } });
    if (!exists) break;
    attempts++;
  } while (attempts < 5);

  const grupo = await prisma.grupo.create({
    data: {
      nombre,
      codigo: codigo!,
      creadorId: session.user.id,
      miembros: { create: { userId: session.user.id } },
    },
  });

  redirect(`/grupo/${grupo.codigo}`);
}

export async function joinGrupo(codigo: string) {
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=/grupo/${codigo}/unirse`);

  const grupo = await prisma.grupo.findUnique({
    where: { codigo },
    include: { miembros: { where: { userId: session.user.id } } },
  });
  if (!grupo) return { error: "Grupo no encontrado" };

  if (grupo.miembros.length > 0) {
    redirect(`/grupo/${codigo}`);
  }

  const tournamentStarted = await isTournamentStarted();
  if (tournamentStarted) return { error: "El torneo ya ha empezado, el grupo está cerrado" };

  await prisma.grupoMiembro.create({
    data: { grupoId: grupo.id, userId: session.user.id },
  });

  redirect(`/grupo/${codigo}`);
}

export async function leaveGrupo(grupoId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  const grupo = await prisma.grupo.findUnique({ where: { id: grupoId } });
  if (!grupo) return { error: "Grupo no encontrado" };
  if (grupo.creadorId === session.user.id) return { error: "El creador no puede abandonar el grupo" };

  await prisma.grupoMiembro.delete({
    where: { grupoId_userId: { grupoId, userId: session.user.id } },
  });

  redirect("/grupos");
}

export async function removeMember(grupoId: string, userId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  const grupo = await prisma.grupo.findUnique({ where: { id: grupoId } });
  if (!grupo || grupo.creadorId !== session.user.id) {
    return { error: "No tienes permiso para esta acción" };
  }
  if (userId === session.user.id) return { error: "No puedes eliminarte a ti mismo" };

  await prisma.grupoMiembro.delete({
    where: { grupoId_userId: { grupoId, userId } },
  });
}

export async function updateGrupoNombre(
  _prevState: { error?: string; ok?: boolean } | null,
  formData: FormData
) {
  const session = await auth();
  if (!session) redirect("/login");

  const grupoId = formData.get("grupoId") as string;
  const nombre = (formData.get("nombre") as string)?.trim();

  if (!nombre) return { error: "El nombre es obligatorio" };
  if (nombre.length > 50) return { error: "Máximo 50 caracteres" };

  const grupo = await prisma.grupo.findUnique({ where: { id: grupoId } });
  if (!grupo || grupo.creadorId !== session.user.id) {
    return { error: "No tienes permiso para esta acción" };
  }

  await prisma.grupo.update({ where: { id: grupoId }, data: { nombre } });
  return { ok: true };
}

export async function deleteGrupo(grupoId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  const grupo = await prisma.grupo.findUnique({ where: { id: grupoId } });
  if (!grupo || grupo.creadorId !== session.user.id) return;

  await prisma.grupo.delete({ where: { id: grupoId } });
  redirect("/grupos");
}
