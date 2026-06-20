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
  const cached = await prisma.analisisPartido.findUnique({ where: { partidoId } });
  if (cached && Date.now() - cached.generadoEn.getTime() < CACHE_TTL_MS) {
    return NextResponse.json({ texto: cached.texto });
  }

  // ── Datos del partido ────────────────────────────────────────────────────
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
    const localScore = p.equipo1 === local ? p.goles1 : p.goles2;
    const visitanteScore = p.equipo1 === local ? p.goles2 : p.goles1;
    if (localScore > visitanteScore) winsLocal++;
    else if (localScore < visitanteScore) winsVisitante++;
    else empates++;
  }

  // ── Consenso de usuarios ─────────────────────────────────────────────────
  const pronosticos = await prisma.pronostico.findMany({
    where: { partidoId },
    select: { golesLocal: true, golesVisitante: true },
  });

  let consenso = "";
  if (pronosticos.length > 0) {
    const freq = new Map<string, number>();
    for (const p of pronosticos) {
      const key = `${p.golesLocal}-${p.golesVisitante}`;
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
    const [topKey, topCount] = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
    consenso = `${topKey} (${topCount} de ${pronosticos.length} usuarios)`;
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
      : "No se han enfrentado antes en un Mundial";

  const resultadoStr =
    partido.estado === "FINALIZADO" && partido.golesLocalReal != null
      ? `\nRESULTADO FINAL: ${local} ${partido.golesLocalReal}-${partido.golesVisitanteReal} ${visitante}`
      : "";

  const prompt = `Eres el analista oficial de una quiniela del Mundial 2026 entre amigos.

PARTIDO: ${local} vs ${visitante}
FASE: ${faseLabel}${grupoStr}${resultadoStr}
CUOTAS: ${oddsStr}
H2H EN MUNDIALES: ${h2hStr}
PRONÓSTICO MÁS POPULAR EN NUESTRA QUINIELA: ${consenso || "Nadie ha pronosticado aún"}

Escribe UN único párrafo de exactamente 3 frases en español:
${partido.estado === "FINALIZADO"
  ? "- Frase 1: Cómo fue el resultado (esperado o sorpresa según cuotas)\n- Frase 2: Dato interesante del partido o del historial H2H\n- Frase 3: Cómo les fue a los jugadores de la quiniela con el pronóstico mayoritario"
  : "- Frase 1: Favorito según cuotas y si el duelo está equilibrado\n- Frase 2: Dato relevante del H2H o del contexto de la fase\n- Frase 3: Qué pronostica la mayoría y si es una apuesta arriesgada o conservadora"
}
Tono: amigable, de porra entre amigos, conciso y directo. Sin emojis.`;

  // ── OpenAI ────────────────────────────────────────────────────────────────
  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 250,
    temperature: 0.7,
  });

  const texto = response.choices[0].message.content?.trim() ?? "";
  if (!texto) return NextResponse.json({ error: "Sin respuesta de IA" }, { status: 500 });

  // ── Guardar caché ────────────────────────────────────────────────────────
  await prisma.analisisPartido.upsert({
    where: { partidoId },
    create: { partidoId, texto },
    update: { texto, generadoEn: new Date() },
  });

  return NextResponse.json({ texto });
}
