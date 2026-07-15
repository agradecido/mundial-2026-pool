"use server";

import { auth } from "@/lib/auth";
import { setMostrarPronosticosAntes } from "@/lib/configuracion";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("No autorizado");
}

export async function toggleMostrarPronosticosAntes(value: boolean) {
  await requireAdmin();
  await setMostrarPronosticosAntes(value);
  revalidatePath("/admin/ajustes");
  revalidatePath("/quiniela");
}
