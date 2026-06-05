"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

async function requireAdmin() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") throw new Error("No autorizado");
    return session.user.id;
}

export async function cambiarRolUsuario(userId: string, role: Role) {
    const adminId = await requireAdmin();

    if (role === "JUGADOR") {
        // Verificar que no es el último ADMIN
        const countAdmin = await prisma.user.count({ where: { role: "ADMIN" } });
        if (countAdmin <= 1 && userId === adminId) {
            return { error: "No puedes degradarte: eres el único administrador." };
        }
    }

    await prisma.user.update({ where: { id: userId }, data: { role } });
    revalidatePath("/admin/usuarios");
    revalidatePath("/admin");
    return { ok: true };
}

export async function eliminarUsuario(userId: string) {
    const adminId = await requireAdmin();

    if (userId === adminId) {
        return { error: "No puedes eliminarte a ti mismo." };
    }

    // Verificar que no es el último ADMIN
    const usuario = await prisma.user.findUnique({ where: { id: userId } });
    if (usuario?.role === "ADMIN") {
        const countAdmin = await prisma.user.count({ where: { role: "ADMIN" } });
        if (countAdmin <= 1) {
            return { error: "No puedes eliminar al único administrador." };
        }
    }

    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/admin/usuarios");
    revalidatePath("/admin");
    revalidatePath("/porra");
    revalidatePath("/ranking");
    return { ok: true };
}

export async function crearUsuario(data: {
    name: string;
    email: string;
    password: string;
    role: Role;
}) {
    await requireAdmin();

    const { name, email, password, role } = data;

    if (!name.trim() || name.trim().length < 2) return { error: "El nombre debe tener al menos 2 caracteres." };
    if (!email.includes("@")) return { error: "Email no válido." };
    if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return { error: "Ya existe un usuario con ese email." };

    const hash = await bcrypt.hash(password, 10);

    await prisma.user.create({
        data: {
            name: name.trim(),
            email: email.toLowerCase(),
            password: hash,
            role,
            hasChosenNickname: true,
        },
    });

    revalidatePath("/admin/usuarios");
    revalidatePath("/admin");
    return { ok: true };
}

export async function resetearModalBienvenida(userId: string) {
    await requireAdmin();

    await prisma.user.update({
        where: { id: userId },
        data: { welcomeModalViews: 0 },
    });

    revalidatePath("/admin/usuarios");
    return { ok: true };
}
