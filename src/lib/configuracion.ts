import { prisma } from "@/lib/prisma";

const CONFIG_ID = "global";

export async function getConfiguracion() {
  const config = await prisma.configuracion.findUnique({ where: { id: CONFIG_ID } });
  return config ?? { id: CONFIG_ID, mostrarPronosticosAntes: false };
}

export async function setMostrarPronosticosAntes(value: boolean) {
  await prisma.configuracion.upsert({
    where: { id: CONFIG_ID },
    update: { mostrarPronosticosAntes: value },
    create: { id: CONFIG_ID, mostrarPronosticosAntes: value },
  });
}
