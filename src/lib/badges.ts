"use server";

import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";

type BadgePayload = {
  userId: string;
  titulo: string;
  emoji: string;
  descripcion: string;
};

type UserStats = {
  userId: string;
  nombre: string;
  posicion: number;
  puntosTotales: number;
  puntosSemana: number;
  exactosTotales: number;
  exactosSemana: number;
  tendenciasTotales: number;
  tendenciasSemana: number;
  fallosTotales: number;
  partidosJugados: number;
};

export async function generarBadges(): Promise<{ ok: boolean; mensaje: string }> {
  const ahora = new Date();
  const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      fechaRegistro: true,
      pronosticos: {
        select: {
          puntosGanados: true,
          partido: { select: { fechaPartido: true, estado: true } },
        },
      },
      prediccionFutura: {
        select: { puntosCampeon: true, puntosSubcampeon: true },
      },
    },
  });

  const finished = (p: { partido: { estado: string } }) =>
    p.partido.estado === "FINALIZADO";
  const recent = (p: { partido: { fechaPartido: Date } }) =>
    p.partido.fechaPartido >= hace7Dias;

  const scored = users
    .map((u) => {
      const finalizados = u.pronosticos.filter(finished);
      const puntosPartidos = finalizados.reduce((s, p) => s + p.puntosGanados, 0);
      const pf = u.prediccionFutura;
      const puntosEspeciales = pf ? pf.puntosCampeon + pf.puntosSubcampeon : 0;
      return {
        id: u.id,
        total: puntosPartidos + puntosEspeciales,
        exactos: finalizados.filter((p) => p.puntosGanados === 5 || p.puntosGanados === 10).length,
        tendencias: finalizados.filter((p) => p.puntosGanados === 3 || p.puntosGanados === 6).length,
        fallos: finalizados.filter((p) => p.puntosGanados === 0).length,
        jugados: finalizados.length,
        fechaRegistro: u.fechaRegistro,
      };
    })
    .sort((a, b) =>
      b.total - a.total || b.exactos - a.exactos || b.tendencias - a.tendencias ||
      a.fechaRegistro.getTime() - b.fechaRegistro.getTime()
    );

  const posicionMap = new Map(scored.map((u, i) => [u.id, i + 1]));

  const stats: UserStats[] = users.map((u) => {
    const finalizados = u.pronosticos.filter(finished);
    const recientes = finalizados.filter(recent);
    const s = scored.find((x) => x.id === u.id)!;
    return {
      userId: u.id,
      nombre: u.name ?? "Sin nombre",
      posicion: posicionMap.get(u.id) ?? 0,
      puntosTotales: s.total,
      puntosSemana: recientes.reduce((acc, p) => acc + p.puntosGanados, 0),
      exactosTotales: s.exactos,
      exactosSemana: recientes.filter((p) => p.puntosGanados === 5 || p.puntosGanados === 10).length,
      tendenciasTotales: s.tendencias,
      tendenciasSemana: recientes.filter((p) => p.puntosGanados === 3 || p.puntosGanados === 6).length,
      fallosTotales: s.fallos,
      partidosJugados: s.jugados,
    };
  });

  if (stats.length === 0) {
    return { ok: false, mensaje: "No hay usuarios para generar badges." };
  }

  const statsTexto = stats
    .map(
      (u) =>
        `- userId="${u.userId}" nombre="${u.nombre}" posicion=${u.posicion} ` +
        `puntosTotales=${u.puntosTotales} puntosSemana=${u.puntosSemana} ` +
        `exactosTotales=${u.exactosTotales} exactosSemana=${u.exactosSemana} ` +
        `tendenciasTotales=${u.tendenciasTotales} tendenciasSemana=${u.tendenciasSemana} ` +
        `fallosTotales=${u.fallosTotales} partidosJugados=${u.partidosJugados}`
    )
    .join("\n");

  const prompt = `Eres el comisario de una quiniela del Mundial 2026 entre amigos.
Debes asignar un "superlativo" único y creativo a cada participante basado en sus estadísticas.

REGLAS ESTRICTAS:
- Cada jugador debe recibir un título DIFERENTE al de los demás (sin repetir títulos)
- Los títulos deben ser creativos, divertidos y relacionados con el fútbol o las predicciones
- La descripción (máx. 60 chars) debe mencionar una estadística real del jugador
- Tono: amigable, de porra entre amigos, con algo de humor o ironía cuando aplique
- Idioma: español
- Si un jugador lleva 0 partidos jugados, su badge debe reflejarlo con humor
- Variedad de emojis: usa emojis de fútbol, predicción, estadísticas, etc.

ESTADÍSTICAS (última semana + totales del torneo):
${statsTexto}

Devuelve ÚNICAMENTE un objeto JSON con esta estructura exacta:
{
  "badges": [
    { "userId": "...", "titulo": "El Vidente", "emoji": "🔮", "descripcion": "3 exactos esta semana" },
    ...
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
    temperature: 0.9,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    return { ok: false, mensaje: "OpenAI no devolvió respuesta." };
  }

  let badges: BadgePayload[];
  try {
    const parsed = JSON.parse(content) as { badges: BadgePayload[] };
    badges = parsed.badges;
    if (!Array.isArray(badges)) throw new Error("Formato inesperado");
  } catch {
    return { ok: false, mensaje: "Error al parsear la respuesta de OpenAI." };
  }

  await prisma.$transaction(
    badges.map((b) =>
      prisma.badgeUsuario.upsert({
        where: { userId: b.userId },
        update: {
          titulo: b.titulo,
          emoji: b.emoji,
          descripcion: b.descripcion,
          generadoEn: new Date(),
        },
        create: {
          userId: b.userId,
          titulo: b.titulo,
          emoji: b.emoji,
          descripcion: b.descripcion,
        },
      })
    )
  );

  return { ok: true, mensaje: `${badges.length} badges generados correctamente.` };
}
