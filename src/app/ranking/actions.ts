"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export type UserDetail = Awaited<ReturnType<typeof getUserDetail>>;

const getCachedUserDetail = unstable_cache(
  async (userId: string) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        prediccionFutura: {
          select: {
            campeonPronostico: true,
            subcampeonPronostico: true,
            botaOroPronostico: true,
            puntosCampeon: true,
            puntosSubcampeon: true,
          },
        },
        pronosticos: {
          select: {
            golesLocal: true,
            golesVisitante: true,
            puntosGanados: true,
            partido: {
              select: {
                id: true,
                equipoLocal: true,
                equipoVisitante: true,
                fase: true,
                grupo: true,
                estado: true,
                golesLocalReal: true,
                golesVisitanteReal: true,
                fechaPartido: true,
              },
            },
          },
          orderBy: { partido: { fechaPartido: "asc" } },
        },
      },
    });

    return {
      ...user,
      pronosticos: user.pronosticos.map((p) => ({
        ...p,
        partido: {
          ...p.partido,
          fechaPartido: p.partido.fechaPartido.toISOString(),
        },
      })),
    };
  },
  ["user-detail"],
  { tags: ["ranking"] }
);

export async function getUserDetail(userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return getCachedUserDetail(userId);
}
