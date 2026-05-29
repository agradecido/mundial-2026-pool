"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface NicknameStatus {
    hasChosen: boolean;
    currentName: string | null;
}

export async function getNicknameStatus(): Promise<NicknameStatus | null> {
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, hasChosenNickname: true },
    });

    if (!user) return null;
    return { hasChosen: user.hasChosenNickname, currentName: user.name };
}

const NICK_MIN = 2;
const NICK_MAX = 24;

/**
 * Update the user's display name (nickname). Returns { ok, error?, name? }.
 * If `name` is omitted/empty and the user just wants to accept their current name,
 * pass `keepCurrent: true` to flag the choice without changing the value.
 */
export async function updateNickname(
    rawName: string,
    options: { keepCurrent?: boolean } = {}
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "No autenticado" };

    if (options.keepCurrent) {
        const updated = await prisma.user.update({
            where: { id: session.user.id },
            data: { hasChosenNickname: true },
            select: { name: true },
        });
        revalidatePath("/");
        return { ok: true, name: updated.name ?? "" };
    }

    const name = (rawName ?? "").trim().replace(/\s+/g, " ");

    if (name.length < NICK_MIN) {
        return { ok: false, error: `Mínimo ${NICK_MIN} caracteres` };
    }
    if (name.length > NICK_MAX) {
        return { ok: false, error: `Máximo ${NICK_MAX} caracteres` };
    }
    // Allow letters (incl. accents), numbers, spaces, dot, dash, underscore.
    if (!/^[\p{L}\p{N} ._-]+$/u.test(name)) {
        return { ok: false, error: "Solo letras, números, espacios, . _ -" };
    }

    // Soft uniqueness check (case-insensitive). Not a DB constraint to avoid
    // breaking sign-ups; just nudge the user to pick a different nick.
    const existing = await prisma.user.findFirst({
        where: {
            name: { equals: name, mode: "insensitive" },
            NOT: { id: session.user.id },
        },
        select: { id: true },
    });
    if (existing) {
        return { ok: false, error: "Ese nombre ya está en uso" };
    }

    await prisma.user.update({
        where: { id: session.user.id },
        data: { name, hasChosenNickname: true },
    });

    revalidatePath("/");
    return { ok: true, name };
}
