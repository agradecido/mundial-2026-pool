/**
 * Crea ~10 usuarios demo con pronósticos y puntos ya calculados.
 * No modifica los partidos (estado, resultados), así el entorno de
 * desarrollo no se altera. Solo el ranking se ve "completo".
 *
 * Uso:  npm run seed:demo
 * Limpiar: npm run seed:clean
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import type { Fase } from "@prisma/client";

const adapter = new PrismaNeon({ connectionString: process.env.PORRA_POSTGRES_PRISMA_URL! });
const prisma = new PrismaClient({ adapter });

// ── Usuarios demo ────────────────────────────────────────────────────────────

const DEMO_USERS = [
  { name: "Carlos Martínez", email: "carlos@demo.porra" },
  { name: "Ana García",      email: "ana@demo.porra" },
  { name: "Miguel López",    email: "miguel@demo.porra" },
  { name: "Laura Sánchez",   email: "laura@demo.porra" },
  { name: "David Fernández", email: "david@demo.porra" },
  { name: "Elena Rodríguez", email: "elena@demo.porra" },
  { name: "Javier Torres",   email: "javier@demo.porra" },
  { name: "Sofía Díaz",      email: "sofia@demo.porra" },
  { name: "Pablo Moreno",    email: "pablo@demo.porra" },
  { name: "Isabel Ruiz",     email: "isabel@demo.porra" },
];

const SELECCIONES = [
  "España", "Argentina", "Brasil", "Francia", "Alemania",
  "Inglaterra", "Portugal", "Países Bajos", "Italia", "Bélgica",
];

const JUGADORES = [
  "Erling Haaland", "Kylian Mbappé", "Vinicius Jr.", "Jude Bellingham",
  "Rodri", "Pedri", "Lionel Messi", "Cristiano Ronaldo",
];

// ── Utilidades ───────────────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Resultado realista de un partido de fútbol */
function randomResult(): [number, number] {
  const pool: [number, number][] = [
    [1,0],[2,0],[2,1],[1,1],[0,0],[3,1],[3,0],[0,1],[0,2],
    [1,2],[2,2],[3,2],[4,0],[4,1],[0,3],[1,3],[2,3],[0,4],[3,3],
  ];
  return [...pick(pool)] as [number, number];
}

/** Pronóstico con sesgo hacia la tendencia correcta, según el "nivel" del jugador */
function randomPred(real: [number, number], skill: number): [number, number] {
  const r = Math.random();
  const exactChance    = 0.04 + skill * 0.18; // 4 %–22 %
  const tendencyChance = 0.20 + skill * 0.30; // 20 %–50 %

  if (r < exactChance) {
    return [...real] as [number, number];
  }

  if (r < exactChance + tendencyChance) {
    // Tendencia correcta, marcador diferente
    const [rL, rV] = real;
    if (rL > rV) {
      const l = rand(Math.max(1, rL - 1), rL + 1);
      const v = rand(0, Math.max(0, l - 1));
      return [l, v];
    } else if (rV > rL) {
      const v = rand(Math.max(1, rV - 1), rV + 1);
      const l = rand(0, Math.max(0, v - 1));
      return [l, v];
    } else {
      const g = rand(0, 2);
      return [g, g];
    }
  }

  return randomResult();
}

/** Calcula puntos según las reglas del CLAUDE.md */
function calcPoints(pred: [number, number], real: [number, number], fase: Fase): number {
  const mult = fase === "GRUPOS" ? 1 : 2;
  const [pL, pV] = pred;
  const [rL, rV] = real;

  if (pL === rL && pV === rV) return 5 * mult;

  const pTend = pL > pV ? "L" : pL < pV ? "V" : "E";
  const rTend = rL > rV ? "L" : rL < rV ? "V" : "E";
  if (pTend === rTend) return 3 * mult;

  if (pL === rL || pV === rV) return 1 * mult;

  return 0;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const partidos = await prisma.partido.findMany({ orderBy: { fechaPartido: "asc" } });
  console.log(`\n📦 ${partidos.length} partidos encontrados`);

  // Resultados ficticios por partido (consistentes entre usuarios)
  const results = new Map(partidos.map((p) => [p.id, randomResult()]));

  for (const userData of DEMO_USERS) {
    const skill = Math.random(); // nivel 0–1 del jugador
    const daysAgo = rand(5, 60);

    const user = await prisma.user.upsert({
      where:  { email: userData.email },
      update: { name: userData.name },
      create: {
        name: userData.name,
        email: userData.email,
        fechaRegistro: new Date(Date.now() - daysAgo * 86_400_000),
      },
    });

    // Pronósticos para todos los partidos
    await prisma.pronostico.deleteMany({ where: { userId: user.id } });

    const data = partidos.map((p) => {
      const real = results.get(p.id)!;
      const pred = randomPred(real, skill);
      return {
        userId:        user.id,
        partidoId:     p.id,
        golesLocal:    pred[0],
        golesVisitante: pred[1],
        puntosGanados: calcPoints(pred, real, p.fase),
      };
    });

    await prisma.pronostico.createMany({ data });

    // Predicción futura
    const hasCampeon    = Math.random() < 0.25;
    const hasSubcampeon = Math.random() < 0.25;
    const hasBota       = Math.random() < 0.25;

    await prisma.prediccionFutura.upsert({
      where:  { userId: user.id },
      update: {
        campeonPronostico:    pick(SELECCIONES),
        subcampeonPronostico: pick(SELECCIONES),
        botaOroPronostico:    pick(JUGADORES),
        puntosCampeon:    hasCampeon    ? 20 : 0,
        puntosSubcampeon: hasSubcampeon ? 15 : 0,
        puntosBota:       hasBota       ? 15 : 0,
      },
      create: {
        userId:               user.id,
        campeonPronostico:    pick(SELECCIONES),
        subcampeonPronostico: pick(SELECCIONES),
        botaOroPronostico:    pick(JUGADORES),
        puntosCampeon:    hasCampeon    ? 20 : 0,
        puntosSubcampeon: hasSubcampeon ? 15 : 0,
        puntosBota:       hasBota       ? 15 : 0,
      },
    });

    const total = data.reduce((s, d) => s + d.puntosGanados, 0);
    console.log(`  ✓ ${userData.name.padEnd(18)} skill=${skill.toFixed(2)}  pts_partidos=${total}`);
  }

  console.log("\n✅ Demo data lista. Usa 'npm run seed:clean' para borrarla.\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
