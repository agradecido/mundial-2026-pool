/**
 * Simula el Mundial 2026 completo: actualiza resultados de partidos y crea
 * 10 usuarios demo con PronosticoBracket para previsualizar la clasificación.
 *
 * Uso:    npm run seed:bracket-demo
 * Limpiar: npm run seed:clean  (elimina usuarios *@demo.porra)
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient, EstadoPartido, Fase } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.PORRA_POSTGRES_PRISMA_URL! });
const prisma = new PrismaClient({ adapter });

// ── Torneo: clasificaciones y resultados reales ───────────────────────────────

// [1°, 2°, 3°, 4°] por grupo
const GRUPOS: Record<string, [string, string, string, string]> = {
  A: ["Mexico",      "South Korea",  "Czech Republic",      "South Africa"],
  B: ["Canada",      "Switzerland",  "Qatar",               "Bosnia & Herzegovina"],
  C: ["Brazil",      "Morocco",      "Scotland",            "Haiti"],
  D: ["USA",         "Australia",    "Turkey",              "Paraguay"],
  E: ["Germany",     "Ivory Coast",  "Ecuador",             "Curaçao"],
  F: ["Netherlands", "Japan",        "Sweden",              "Tunisia"],
  G: ["Belgium",     "Iran",         "Egypt",               "New Zealand"],
  H: ["Spain",       "Uruguay",      "Cape Verde",          "Saudi Arabia"],
  I: ["France",      "Senegal",      "Norway",              "Iraq"],
  J: ["Argentina",   "Austria",      "Algeria",             "Jordan"],
  K: ["Portugal",    "Colombia",     "DR Congo",            "Uzbekistan"],
  L: ["England",     "Croatia",      "Ghana",               "Panama"],
};

// 8 mejores terceros en orden de ranking
const TERCEROS_REALES = [
  "Czech Republic", "Scotland", "Turkey",    "Ecuador",
  "Cape Verde",     "Egypt",    "Sweden",    "Qatar",
];

// Ganador real de cada partido eliminatorio
const GANADORES: Record<string, string> = {
  "D32-1":  "Mexico",      "D32-2":  "Brazil",
  "D32-3":  "Canada",      "D32-4":  "Switzerland",
  "D32-5":  "USA",         "D32-6":  "Netherlands",
  "D32-7":  "Germany",     "D32-8":  "Ivory Coast",
  "D32-9":  "Belgium",     "D32-10": "France",
  "D32-11": "Spain",       "D32-12": "Uruguay",
  "D32-13": "Argentina",   "D32-14": "England",
  "D32-15": "Portugal",    "D32-16": "Colombia",
  "D16-1":  "Brazil",      "D16-2":  "Canada",
  "D16-3":  "Netherlands", "D16-4":  "Germany",
  "D16-5":  "France",      "D16-6":  "Spain",
  "D16-7":  "Argentina",   "D16-8":  "Portugal",
  "QF-1":   "Brazil",      "QF-2":   "Germany",
  "QF-3":   "Spain",       "QF-4":   "Argentina",
  "SF-1":   "Germany",     "SF-2":   "Spain",
  "FINAL":  "Spain",
};

// ── Fase de grupos: resultados ────────────────────────────────────────────────

// Algunos marcadores específicos para diferenciar las puntuaciones de los 3°
const CUSTOM_SCORES: Record<string, [number, number]> = {
  "Czech Republic|South Africa":    [5, 0],
  "Scotland|Haiti":                  [4, 0],
  "Turkey|Paraguay":                 [3, 0],
  "Ecuador|Curaçao":                 [2, 0],
  "Cape Verde|Saudi Arabia":         [1, 0],
  "Egypt|New Zealand":               [1, 0],
  "Netherlands|Sweden":              [3, 0],
  "Sweden|Tunisia":                  [1, 0],
  "Canada|Qatar":                    [3, 0],
  "Switzerland|Qatar":               [3, 0],
  "Qatar|Bosnia & Herzegovina":      [1, 0],
  "France|Norway":                   [4, 0],
  "Senegal|Norway":                  [3, 0],
  "Norway|Iraq":                     [1, 0],
  "Argentina|Algeria":               [4, 0],
  "Austria|Algeria":                 [3, 0],
  "Algeria|Jordan":                  [1, 0],
  "Portugal|DR Congo":               [4, 0],
  "Colombia|DR Congo":               [3, 0],
  "DR Congo|Uzbekistan":             [1, 0],
  "England|Ghana":                   [4, 0],
  "Croatia|Ghana":                   [3, 0],
  "Ghana|Panama":                    [1, 0],
};

function groupScore(local: string, visitante: string, grupo: string): [number, number] {
  const key = `${local}|${visitante}`;
  if (CUSTOM_SCORES[key]) return CUSTOM_SCORES[key];
  const s = GRUPOS[grupo];
  const d = s.indexOf(visitante) - s.indexOf(local); // positive → local better
  if (d === 3) return [3, 0];
  if (d === 2) return [2, 0];
  if (d === 1) return [2, 1];
  if (d === -1) return [1, 2];
  if (d === -2) return [0, 2];
  return [0, 3];
}

async function updateGroupStage() {
  const partidos = await prisma.partido.findMany({ where: { fase: "GRUPOS" } });
  for (const p of partidos) {
    const [gl, gv] = groupScore(p.equipoLocal, p.equipoVisitante, p.grupo!);
    await prisma.partido.update({
      where: { id: p.id },
      data: { golesLocalReal: gl, golesVisitanteReal: gv, estado: EstadoPartido.FINALIZADO },
    });
  }
  console.log(`  ✓ ${partidos.length} partidos de grupos actualizados`);
}

// ── Eliminatorias: reemplazar equipos placeholder con equipos reales ──────────

const D32_PAIRS: [string, string, number, number][] = [
  ["Mexico",      "Morocco",        2, 1],
  ["Brazil",      "South Korea",    2, 0],
  ["Canada",      "Czech Republic", 1, 0],
  ["Switzerland", "Scotland",       2, 1],
  ["USA",         "Japan",          2, 1],
  ["Netherlands", "Australia",      3, 1],
  ["Germany",     "Turkey",         2, 0],
  ["Ivory Coast", "Ecuador",        1, 0],
  ["Belgium",     "Senegal",        2, 0],
  ["France",      "Iran",           3, 0],
  ["Spain",       "Cape Verde",     2, 0],
  ["Uruguay",     "Egypt",          1, 0],
  ["Argentina",   "Croatia",        2, 1],
  ["England",     "Austria",        2, 0],
  ["Portugal",    "Sweden",         3, 0],
  ["Colombia",    "Qatar",          2, 0],
];

const D16_PAIRS: [string, string, number, number][] = [
  ["Mexico",      "Brazil",        1, 2],
  ["Canada",      "Switzerland",   1, 0],
  ["USA",         "Netherlands",   0, 2],
  ["Germany",     "Ivory Coast",   2, 0],
  ["Belgium",     "France",        1, 2],
  ["Spain",       "Uruguay",       2, 0],
  ["Argentina",   "England",       2, 1],
  ["Portugal",    "Colombia",      2, 0],
];

const QF_PAIRS: [string, string, number, number][] = [
  ["Brazil",      "Canada",       2, 0],
  ["Netherlands", "Germany",      1, 2],
  ["France",      "Spain",        0, 1],
  ["Argentina",   "Portugal",     2, 1],
];

const SF_PAIRS: [string, string, number, number][] = [
  ["Brazil", "Germany", 1, 2],
  ["Spain",  "Argentina", 2, 1],
];

const FINAL_PAIR: [string, string, number, number] = ["Germany", "Spain", 0, 1];

async function updateKOStage() {
  const update = async (fase: string, pairs: [string, string, number, number][]) => {
    const ps = await prisma.partido.findMany({
      where: { fase: fase as Fase },
      orderBy: { fechaPartido: "asc" },
    });
    for (let i = 0; i < pairs.length; i++) {
      const [local, visitante, gl, gv] = pairs[i];
      if (!ps[i]) { console.warn(`  ⚠ Falta registro ${i + 1} para ${fase}`); continue; }
      await prisma.partido.update({
        where: { id: ps[i].id },
        data: { equipoLocal: local, equipoVisitante: visitante, golesLocalReal: gl, golesVisitanteReal: gv, estado: EstadoPartido.FINALIZADO },
      });
    }
    console.log(`  ✓ ${pairs.length} partidos de ${fase} actualizados`);
  };

  await update("DIECISEISAVOS", D32_PAIRS);
  await update("OCTAVOS",       D16_PAIRS);
  await update("CUARTOS",       QF_PAIRS);
  await update("SEMIFINAL",     SF_PAIRS);
  await update("FINAL",         [FINAL_PAIR]);
}

// ── PronosticoBracket: picks de los 10 usuarios demo ─────────────────────────

type BracketPicks = {
  grupos:     Record<string, string[]>;
  terceros:   string[];
  resultados: Record<string, string>;
};

// Bracket base correcto
const BASE_RESULTADOS: Record<string, string> = { ...GANADORES };

// Aplica overrides parciales al bracket base
function makePicks(
  gruposOverrides: Partial<Record<string, [string, string]>>,
  tercerosOverride: string[],
  resultadosOverrides: Partial<Record<string, string>>
): BracketPicks {
  const grupos: Record<string, string[]> = {};
  for (const [g, [t1, t2]] of Object.entries(GRUPOS)) {
    grupos[g] = gruposOverrides[g] ? [...gruposOverrides[g]!] : [t1, t2];
  }
  const resultados = { ...BASE_RESULTADOS, ...resultadosOverrides };
  return { grupos, terceros: tercerosOverride, resultados };
}

// ── Picks específicos por usuario (de más a menos acertados) ──────────────────

const PICKS: BracketPicks[] = [

  // 1. Carlos — casi perfecto, campeón correcto
  makePicks({}, TERCEROS_REALES, {}),

  // 2. Ana — muy buena, falla 1 grupo y 1 tercero, campeón correcto
  makePicks(
    { J: ["Austria", "Argentina"] },           // Austria 1ª en vez de Argentina
    ["Czech Republic", "Scotland", "Turkey", "Ecuador", "Cape Verde", "Egypt", "Sweden", "Norway"],  // Norway en vez de Qatar
    {
      "D32-13": "Croatia",                     // Argentina no pasa D32-13
      "D16-7": "England",                      // sin Argentina, England avanza más
      "QF-4": "England",
      "SF-2": "Spain",                         // Spain sigue llegando a final
      "FINAL": "Spain",
    }
  ),

  // 3. Miguel — bueno, campeón Argentina
  makePicks(
    { F: ["Japan", "Netherlands"] },           // Japón 1° en lugar de Países Bajos
    ["Czech Republic", "Scotland", "Turkey", "Ecuador", "Cape Verde", "Egypt", "Sweden", "Qatar"],
    {
      "D32-6": "Japan",                        // Japón elimina a Australia
      "D16-3": "Japan",                        // Japón en cuartos
      "QF-2": "Germany",                       // Germany sigue (gana a Japan)
      "QF-3": "France",                        // France llega a semis en vez de Spain
      "SF-2": "Argentina",
      "FINAL": "Argentina",
    }
  ),

  // 4. Laura — notable, campeón France
  makePicks(
    { H: ["Uruguay", "Spain"] },              // Uruguay 1° en grupo H
    ["Czech Republic", "Scotland", "Turkey", "Ecuador", "Norway", "Egypt", "Sweden", "Qatar"],
    {
      "D32-11": "Uruguay",                    // Spain cae en D32
      "D32-12": "Spain",                      // Spain elimina Egypt en su slot
      "D16-5": "France",
      "D16-6": "Uruguay",
      "QF-3": "France",
      "QF-4": "Argentina",
      "SF-2": "France",
      "FINAL": "France",
    }
  ),

  // 5. David — aprobado, campeón Germany
  makePicks(
    { C: ["Morocco", "Brazil"], E: ["Ivory Coast", "Germany"] },
    ["Czech Republic", "Scotland", "Turkey", "Ecuador", "Cape Verde", "Norway", "Sweden", "Qatar"],
    {
      "D32-2": "Morocco",
      "D32-7": "Ivory Coast",
      "D32-8": "Germany",
      "D16-1": "Brazil",
      "D16-4": "Ivory Coast",
      "QF-1": "Brazil",
      "QF-2": "Netherlands",                 // Netherlands en vez de Germany (Ivory Coast no llega)
      "QF-3": "Spain",
      "QF-4": "Argentina",
      "SF-1": "Germany",
      "SF-2": "Spain",
      "FINAL": "Germany",
    }
  ),

  // 6. Elena — regular, campeón Brazil
  makePicks(
    { A: ["South Korea", "Mexico"], G: ["Iran", "Belgium"] },
    ["Czech Republic", "Morocco", "Turkey", "Ecuador", "Cape Verde", "Egypt", "Sweden", "Qatar"],
    {
      "D32-1": "South Korea",
      "D32-9": "Iran",
      "D32-10": "France",
      "D16-1": "Brazil",
      "D16-5": "France",
      "QF-1": "Brazil",
      "QF-2": "Germany",
      "QF-3": "France",
      "QF-4": "Argentina",
      "SF-1": "Brazil",
      "SF-2": "France",
      "FINAL": "Brazil",
    }
  ),

  // 7. Javier Torres — flojo, campeón Portugal
  makePicks(
    { B: ["Switzerland", "Canada"], D: ["Australia", "USA"] },
    ["Czech Republic", "Scotland", "Australia", "Ecuador", "Cape Verde", "Egypt", "Sweden", "Qatar"],
    {
      "D32-3": "Switzerland",
      "D32-5": "Australia",
      "D32-6": "Netherlands",
      "D16-2": "Switzerland",
      "D16-3": "Netherlands",
      "QF-1": "Brazil",
      "QF-2": "Germany",
      "QF-3": "Spain",
      "QF-4": "Portugal",
      "SF-1": "Germany",
      "SF-2": "Portugal",
      "FINAL": "Portugal",
    }
  ),

  // 8. Sofía — mal, campeón England
  makePicks(
    { I: ["Senegal", "France"], K: ["Colombia", "Portugal"] },
    ["Czech Republic", "Scotland", "Turkey", "Senegal", "Cape Verde", "Egypt", "Colombia", "Qatar"],
    {
      "D32-10": "Senegal",
      "D32-15": "Colombia",
      "D32-16": "Portugal",
      "D16-5": "Senegal",
      "D16-8": "Colombia",
      "QF-3": "Senegal",
      "QF-4": "England",
      "SF-2": "England",
      "FINAL": "England",
    }
  ),

  // 9. Pablo — muy mal, campeón Netherlands
  makePicks(
    { A: ["Czech Republic", "South Africa"], C: ["Scotland", "Haiti"], F: ["Sweden", "Tunisia"] },
    ["South Africa", "Haiti", "Turkey", "Ecuador", "Cape Verde", "Egypt", "Sweden", "Qatar"],
    {
      "D32-1": "Czech Republic",
      "D32-2": "Scotland",
      "D32-6": "Sweden",
      "D16-1": "Scotland",
      "D16-3": "Netherlands",
      "QF-1": "Scotland",
      "QF-2": "Netherlands",
      "QF-3": "Spain",
      "QF-4": "Argentina",
      "SF-1": "Netherlands",
      "SF-2": "Spain",
      "FINAL": "Netherlands",
    }
  ),

  // 10. Isabel — desastre, campeón Argentina con grupos muy malos
  makePicks(
    {
      A: ["South Africa", "Czech Republic"],
      B: ["Qatar", "Bosnia & Herzegovina"],
      C: ["Haiti", "Scotland"],
      D: ["Paraguay", "Turkey"],
    },
    ["South Africa", "Qatar", "Haiti", "Paraguay", "Saudi Arabia", "New Zealand", "Tunisia", "Iraq"],
    {
      "D32-1": "South Africa",
      "D32-3": "Qatar",
      "D32-2": "Haiti",
      "D32-4": "Bosnia & Herzegovina",
      "D16-1": "Brazil",
      "D16-2": "Switzerland",
      "QF-1": "Brazil",
      "QF-2": "Germany",
      "QF-3": "France",
      "QF-4": "Argentina",
      "SF-1": "Germany",
      "SF-2": "Argentina",
      "FINAL": "Argentina",
    }
  ),
];

// ── Usuarios demo ─────────────────────────────────────────────────────────────

const DEMO_USERS = [
  { name: "Carlos Martínez",  email: "carlos@demo.porra" },
  { name: "Ana García",       email: "ana@demo.porra" },
  { name: "Miguel López",     email: "miguel@demo.porra" },
  { name: "Laura Sánchez",    email: "laura@demo.porra" },
  { name: "David Fernández",  email: "david@demo.porra" },
  { name: "Elena Rodríguez",  email: "elena@demo.porra" },
  { name: "Javier Torres",    email: "javier@demo.porra" },
  { name: "Sofía Díaz",       email: "sofia@demo.porra" },
  { name: "Pablo Moreno",     email: "pablo@demo.porra" },
  { name: "Isabel Ruiz",      email: "isabel@demo.porra" },
];

async function createBracketUsers() {
  for (let i = 0; i < DEMO_USERS.length; i++) {
    const { name, email } = DEMO_USERS[i];
    const daysAgo = 30 + i * 3;

    const user = await prisma.user.upsert({
      where:  { email },
      update: { name },
      create: {
        name,
        email,
        fechaRegistro: new Date(Date.now() - daysAgo * 86_400_000),
      },
    });

    await prisma.pronosticoBracket.upsert({
      where:  { userId: user.id },
      update: { picks: PICKS[i] as object, updatedAt: new Date(Date.now() - daysAgo * 86_400_000) },
      create: { userId: user.id, picks: PICKS[i] as object, updatedAt: new Date(Date.now() - daysAgo * 86_400_000) },
    });

    console.log(`  ✓ ${name.padEnd(20)} → campeón: ${(PICKS[i].resultados["FINAL"] ?? "?").padEnd(12)}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🏆 Seed: simulación Mundial 2026 completo\n");

  console.log("Fase de grupos:");
  await updateGroupStage();

  console.log("\nFase eliminatoria:");
  await updateKOStage();

  console.log("\nUsuarios con PronosticoBracket:");
  await createBracketUsers();

  console.log("\n✅ Listo. Usa 'npm run seed:clean' para borrar los datos demo.\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
