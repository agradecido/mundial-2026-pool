"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { computeActualBracket } from "@/lib/bracket-scoring";
import { resolveDbCode } from "@/lib/bracket";

export type UserDetail = Awaited<ReturnType<typeof getUserDetail>>;

const isSlotCode = (name: string) =>
  /^\d/.test(name) || name.includes("/") || /^[WL]\d/.test(name);

const getCachedUserDetail = unstable_cache(
  async (userId: string) => {
    const [user, allPartidos] = await Promise.all([
      prisma.user.findUniqueOrThrow({
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
      }),
      prisma.partido.findMany({
        select: {
          equipoLocal: true, equipoVisitante: true,
          golesLocalReal: true, golesVisitanteReal: true,
          ganadorPenales: true,
          estado: true, fase: true, grupo: true,
        },
      }),
    ]);

    const bracket = computeActualBracket(allPartidos);

    return {
      ...user,
      pronosticos: user.pronosticos.map((p) => ({
        ...p,
        partido: {
          ...p.partido,
          equipoLocal: isSlotCode(p.partido.equipoLocal)
            ? (resolveDbCode(p.partido.equipoLocal, bracket) ?? p.partido.equipoLocal)
            : p.partido.equipoLocal,
          equipoVisitante: isSlotCode(p.partido.equipoVisitante)
            ? (resolveDbCode(p.partido.equipoVisitante, bracket) ?? p.partido.equipoVisitante)
            : p.partido.equipoVisitante,
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
