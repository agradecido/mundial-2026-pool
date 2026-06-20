import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const FASE_LABEL: Record<string, string> = {
  GRUPOS: "Fase de grupos",
  DIECISEISAVOS: "Dieciseisavos de final",
  OCTAVOS: "Octavos de final",
  CUARTOS: "Cuartos de final",
  SEMIFINAL: "Semifinal",
  TERCER_PUESTO: "Tercer puesto",
  FINAL: "Final",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const partidoId = searchParams.get("partidoId");
  const homeOdd = searchParams.get("homeOdd");
  const drawOdd = searchParams.get("drawOdd");
  const awayOdd = searchParams.get("awayOdd");

  if (!partidoId) return NextResponse.json({ error: "Falta partidoId" }, { status: 400 });

  // ── Caché ────────────────────────────────────────────────────────────────
  const cached = await prisma.prediccionPartido.findUnique({ where: { partidoId } });

  // Partido finalizado → nunca regenerar
  const partido = await prisma.partido.findUnique({
    where: { id: partidoId },
    select: {
      equipoLocal: true,
      equipoVisitante: true,
      fase: true,
      grupo: true,
      estado: true,
      golesLocalReal: true,
      golesVisitanteReal: true,
    },
  });
  if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  if (cached) {
    const stale = Date.now() - cached.generadoEn.getTime() > CACHE_TTL_MS;
    if (!stale || partido.estado === "FINALIZADO") {
      return NextResponse.json({
        homePercent: cached.homePercent,
        drawPercent: cached.drawPercent,
        awayPercent: cached.awayPercent,
        marcador: cached.marcador,
      });
    }
  }

  const local = partido.equipoLocal;
  const visitante = partido.equipoVisitante;

  // ── H2H ─────────────────────────────────────────────────────────────────
  const h2hPartidos = await prisma.partidoHistorico.findMany({
    where: {
      OR: [
        { equipo1: local, equipo2: visitante },
        { equipo1: visitante, equipo2: local },
      ],
    },
    orderBy: { fecha: "desc" },
    take: 10,
  });

  let winsLocal = 0, winsVisitante = 0, empates = 0;
  for (const p of h2hPartidos) {
    const ls = p.equipo1 === local ? p.goles1 : p.goles2;
    const vs = p.equipo1 === local ? p.goles2 : p.goles1;
    if (ls > vs) winsLocal++;
    else if (ls < vs) winsVisitante++;
    else empates++;
  }

  // ── Consenso ─────────────────────────────────────────────────────────────
  const pronosticos = await prisma.pronostico.findMany({
    where: { partidoId },
    select: { golesLocal: true, golesVisitante: true },
  });

  let consenso = "Nadie ha pronosticado aún";
  if (pronosticos.length > 0) {
    const freq = new Map<string, number>();
    for (const p of pronosticos) {
      const key = `${p.golesLocal}-${p.golesVisitante}`;
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
    const [topKey, topCount] = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
    consenso = `${topKey} (${topCount} de ${pronosticos.length} jugadores)`;
  }

  // ── Prompt ───────────────────────────────────────────────────────────────
  const faseLabel = FASE_LABEL[partido.fase] ?? partido.fase;
  const grupoStr = partido.grupo ? ` — Grupo ${partido.grupo}` : "";

  const oddsStr =
    homeOdd && drawOdd && awayOdd
      ? `${local} ${parseFloat(homeOdd).toFixed(2)} | Empate ${parseFloat(drawOdd).toFixed(2)} | ${visitante} ${parseFloat(awayOdd).toFixed(2)}`
      : "No disponibles";

  const h2hStr =
    h2hPartidos.length > 0
      ? `${h2hPartidos.length} partidos en Mundiales — ${local}: ${winsLocal}V / Empates: ${empates} / ${visitante}: ${winsVisitante}V`
      : "Sin enfrentamientos previos en un Mundial";

  const prompt = `Eres el analista de una quiniela del Mundial 2026 entre amigos. Debes predecir el resultado de este partido.

PARTIDO: ${local} vs ${visitante}
FASE: ${faseLabel}${grupoStr}
CUOTAS DE APUESTAS: ${oddsStr}
HISTORIAL H2H EN MUNDIALES: ${h2hStr}
PRONÓSTICO MÁS POPULAR EN LA QUINIELA: ${consenso}

Responde ÚNICAMENTE con JSON válido, sin texto extra, sin bloques markdown:
{
  "homePercent": <entero 0-100, probabilidad de victoria de ${local}>,
  "drawPercent": <entero 0-100, probabilidad de empate>,
  "awayPercent": <entero 0-100, probabilidad de victoria de ${visitante}>,
  "marcador": "<goles_local>-<goles_visitante>"
}
Los tres porcentajes deben sumar exactamente 100. El marcador debe ser el resultado más probable.`;

  // ── OpenAI ────────────────────────────────────────────────────────────────
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 100,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content?.trim() ?? "";
  if (!raw) return NextResponse.json({ error: "Sin respuesta de IA" }, { status: 500 });

  let parsed: { homePercent: number; drawPercent: number; awayPercent: number; marcador: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Respuesta inválida de IA" }, { status: 500 });
  }

  const { homePercent, drawPercent, awayPercent, marcador } = parsed;

  if (
    !Number.isInteger(homePercent) || !Number.isInteger(drawPercent) || !Number.isInteger(awayPercent) ||
    homePercent + drawPercent + awayPercent !== 100 ||
    !/^\d+-\d+$/.test(marcador)
  ) {
    return NextResponse.json({ error: "Datos de predicción inválidos" }, { status: 500 });
  }

  // ── Guardar caché ────────────────────────────────────────────────────────
  await prisma.prediccionPartido.upsert({
    where: { partidoId },
    create: { partidoId, homePercent, drawPercent, awayPercent, marcador },
    update: { homePercent, drawPercent, awayPercent, marcador, generadoEn: new Date() },
  });

  return NextResponse.json({ homePercent, drawPercent, awayPercent, marcador });
}
