/**
 * Importa todos los partidos del Mundial (1930-2022) desde openfootball/worldcup.json
 * y los inserta en la tabla PartidoHistorico.
 *
 * Uso: npm run seed:historico
 *
 * El script borra los datos existentes antes de reinsertar, por lo que es
 * idempotente y se puede relanzar sin duplicados.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.PORRA_POSTGRES_PRISMA_URL!,
});
const prisma = new PrismaClient({ adapter });

// ── Constantes ────────────────────────────────────────────────────────────────

const BASE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master";

const TORNEOS: Array<{ año: string; nombre: string }> = [
  { año: "1930", nombre: "Uruguay 1930" },
  { año: "1934", nombre: "Italia 1934" },
  { año: "1938", nombre: "Francia 1938" },
  { año: "1950", nombre: "Brasil 1950" },
  { año: "1954", nombre: "Suiza 1954" },
  { año: "1958", nombre: "Suecia 1958" },
  { año: "1962", nombre: "Chile 1962" },
  { año: "1966", nombre: "Inglaterra 1966" },
  { año: "1970", nombre: "México 1970" },
  { año: "1974", nombre: "Alemania 1974" },
  { año: "1978", nombre: "Argentina 1978" },
  { año: "1982", nombre: "España 1982" },
  { año: "1986", nombre: "México 1986" },
  { año: "1990", nombre: "Italia 1990" },
  { año: "1994", nombre: "Estados Unidos 1994" },
  { año: "1998", nombre: "Francia 1998" },
  { año: "2002", nombre: "Corea-Japón 2002" },
  { año: "2006", nombre: "Alemania 2006" },
  { año: "2010", nombre: "Sudáfrica 2010" },
  { año: "2014", nombre: "Brasil 2014" },
  { año: "2018", nombre: "Rusia 2018" },
  { año: "2022", nombre: "Catar 2022" },
];

// ── Tipos del JSON fuente ─────────────────────────────────────────────────────

interface RawScore {
  ft?: [number, number];
  ht?: [number, number];
  et?: [number, number]; // resultado tras prórroga (sin penaltis)
  p?: [number, number];  // penaltis (ignorado para el marcador H2H)
}

interface RawMatch {
  round: string;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  score?: RawScore;
  group?: string;
}

interface RawWorldCup {
  name: string;
  matches: RawMatch[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function roundToFase(round: string, group?: string): string {
  if (group) return "Fase de grupos";
  if (round.startsWith("Matchday")) return "Fase de grupos";
  // 1950 usó un sistema de liguilla sin eliminatorias clásicas
  if (round === "First round" || round === "Final Round") return "Fase de grupos";
  if (round === "Round of 32") return "Dieciseisavos de final";
  if (round === "Round of 16") return "Octavos de final";
  if (round === "Quarter-finals" || round === "Quarterfinals") return "Cuartos de final";
  if (round === "Semi-finals" || round === "Semifinals") return "Semifinal";
  if (round === "Final") return "Final";
  // Variantes históricas del partido por el tercer puesto
  if (
    round === "Match for third place" ||
    round === "Third-place match" ||
    round === "Third-place play-off" ||
    round === "Third place"
  )
    return "Tercer puesto";
  return round;
}

/**
 * Parsea fecha y hora del JSON fuente en un Date UTC.
 * - Sin time → mediodía UTC (solo importa el día para H2H).
 * - "HH:MM UTC±X" → convierte a UTC.
 * - "HH:MM" sin zona → interpreta como UTC.
 */
function parseDateTime(date: string, time?: string): Date {
  if (!time) return new Date(`${date}T12:00:00Z`);

  const offsetMatch = time.match(/^(\d{2}:\d{2})\s+UTC([+-]\d+)$/);
  if (offsetMatch) {
    const hhmm = offsetMatch[1];
    const offsetHours = parseInt(offsetMatch[2], 10);
    const [h, m] = hhmm.split(":").map(Number);
    const dt = new Date(`${date}T00:00:00Z`);
    dt.setUTCHours(h - offsetHours, m, 0, 0);
    return dt;
  }

  if (/^\d{2}:\d{2}$/.test(time)) {
    return new Date(`${date}T${time}:00Z`);
  }

  return new Date(`${date}T12:00:00Z`);
}

/**
 * Devuelve el marcador oficial (90 min + prórroga si se jugó).
 * Los penaltis NO cuentan (consistente con las reglas de la Quiniela).
 */
function resolveScore(
  score?: RawScore
): { goles1: number; goles2: number } | null {
  if (!score) return null;
  const s = score.et ?? score.ft;
  if (!s || s.length < 2) return null;
  return { goles1: s[0], goles2: s[1] };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🗑️  Limpiando partidos históricos existentes…");
  const deleted = await prisma.partidoHistorico.deleteMany();
  console.log(`   Eliminados: ${deleted.count} registros`);

  let totalInsertados = 0;

  for (const { año, nombre } of TORNEOS) {
    const url = `${BASE_URL}/${año}/worldcup.json`;
    let data: RawWorldCup;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`⚠️  ${nombre}: HTTP ${res.status}, omitido`);
        continue;
      }
      data = (await res.json()) as RawWorldCup;
    } catch (err) {
      console.warn(`⚠️  ${nombre}: error de red (${String(err)}), omitido`);
      continue;
    }

    const registros: Array<{
      torneo: string;
      fase: string;
      fecha: Date;
      equipo1: string;
      equipo2: string;
      goles1: number;
      goles2: number;
    }> = [];

    for (const match of data.matches) {
      // Omitir partidos sin resultado (no deberían existir en datos históricos)
      const score = resolveScore(match.score);
      if (!score) continue;

      registros.push({
        torneo: nombre,
        fase: roundToFase(match.round, match.group),
        fecha: parseDateTime(match.date, match.time),
        equipo1: match.team1,
        equipo2: match.team2,
        goles1: score.goles1,
        goles2: score.goles2,
      });
    }

    const { count } = await prisma.partidoHistorico.createMany({
      data: registros,
      skipDuplicates: false,
    });

    console.log(`✅  ${nombre}: ${count} partidos insertados`);
    totalInsertados += count;
  }

  console.log(`\n🎉 Completado. Total insertado: ${totalInsertados} partidos históricos`);
}

main()
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
