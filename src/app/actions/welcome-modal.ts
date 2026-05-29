"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getWelcomeModalViews() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { welcomeModalViews: true },
    });

    return user?.welcomeModalViews ?? 0;
}

export async function incrementWelcomeModalViews() {
    const session = await auth();
    if (!session?.user?.id) return;

    await prisma.user.update({
        where: { id: session.user.id },
        data: {
            welcomeModalViews: {
                increment: 1,
            },
        },
    });
}
