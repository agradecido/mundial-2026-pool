"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("No autorizado");
}

export async function createModal(data: {
  slug: string;
  title: string;
  body: string;
  emoji: string;
}) {
  await requireAdmin();
  await prisma.modal.create({ data });
  revalidatePath("/admin/modales");
}

export async function toggleModal(modalId: string, active: boolean) {
  await requireAdmin();
  await prisma.modal.update({ where: { id: modalId }, data: { active } });
  revalidatePath("/admin/modales");
}

export async function deleteModal(modalId: string) {
  await requireAdmin();
  await prisma.modal.delete({ where: { id: modalId } });
  revalidatePath("/admin/modales");
}

export async function resetModalForEveryone(modalId: string) {
  await requireAdmin();
  await prisma.modalDismissal.deleteMany({ where: { modalId } });
  revalidatePath("/admin/modales");
}

export async function updateModal(
  modalId: string,
  data: { slug: string; title: string; body: string; emoji: string }
) {
  await requireAdmin();
  await prisma.modal.update({ where: { id: modalId }, data });
  revalidatePath("/admin/modales");
}

export async function resetModalForUser(modalId: string, userId: string) {
  await requireAdmin();
  await prisma.modalDismissal.deleteMany({ where: { modalId, userId } });
  revalidatePath("/admin/modales");
}
