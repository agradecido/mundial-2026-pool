"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getActiveModalsForUser() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.modal.findMany({
    where: {
      active: true,
      dismissals: { none: { userId: session.user.id } },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true, title: true, body: true, emoji: true },
  });
}

export async function dismissModal(modalId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.modalDismissal.upsert({
    where: { userId_modalId: { userId: session.user.id, modalId } },
    create: { userId: session.user.id, modalId },
    update: {},
  });
}
