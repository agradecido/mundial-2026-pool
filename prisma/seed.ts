import { PrismaClient, Fase } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "dotenv";
import worldcupData from "./data/worldcup.json";
import stadiumsData from "../worldcup.stadiums.json";

config({ path: ".env.local" });
config({ path: ".env" });

const adapter = new PrismaNeon({
  connectionString: process.env.PORRA_POSTGRES_PRISMA_URL!,
});
const prisma = new PrismaClient({ adapter });

interface RawMatch {
  round: string;
  num?: number;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground?: string;
}

function roundToFase(round: string, group?: string): Fase {
  if (group) return Fase.GRUPOS;
  const map: Record<string, Fase> = {
    "Round of 32": Fase.DIECISEISAVOS,
    "Round of 16": Fase.OCTAVOS,
    "Quarter-final": Fase.CUARTOS,
    "Semi-final": Fase.SEMIFINAL,
    "Match for third place": Fase.TERCER_PUESTO,
    Final: Fase.FINAL,
  };
  return map[round] ?? Fase.GRUPOS;
}

// Maps worldcup.json team1 placeholder → bracketMatchId
// D32: slot notation (e.g. "2A", "1E")
// D16+: "W<P-num>" / "L<P-num>" patterns
const TEAM1_TO_BRACKET_ID: Record<string, string> = {
  "2A": "D32-3",  "1E": "D32-1",  "1F": "D32-4",  "1C": "D32-9",
  "1I": "D32-2",  "2E": "D32-10", "1A": "D32-11", "1L": "D32-12",
  "1D": "D32-7",  "1G": "D32-8",  "2K": "D32-5",  "1H": "D32-6",
  "1B": "D32-15", "1J": "D32-13", "1K": "D32-16", "2D": "D32-14",
  "W74": "D16-1", "W73": "D16-2", "W76": "D16-5", "W79": "D16-6",
  "W83": "D16-3", "W81": "D16-4", "W86": "D16-7", "W85": "D16-8",
  "W89": "QF-1",  "W93": "QF-2",  "W91": "QF-3",  "W95": "QF-4",
  "W97": "SF-1",  "W99": "SF-2",
  "W101": "FINAL", "L101": "TERCER_PUESTO",
};

// "13:00 UTC-6" + "2026-06-11" → Date in UTC
function parseDateTime(date: string, time: string): Date {
  const [hhmm, offsetStr] = time.split(" ");
  const [hours, minutes] = hhmm.split(":").map(Number);
  const offsetHours = parseInt(offsetStr.replace("UTC", ""), 10);
  const utcHours = hours - offsetHours; // e.g. 13 - (-6) = 19
  const dt = new Date(`${date}T00:00:00Z`);
  dt.setUTCHours(utcHours, minutes, 0, 0);
  return dt;
}

interface Stadium {
  city: string;
  name: string;
  timezone: string;
  cc: string;
  capacity: number;
  coords: string;
}

const stadiumByCity = new Map<string, Stadium>(
  (stadiumsData as { stadiums: Stadium[] }).stadiums.map((s) => [s.city, s])
);

async function main() {
  const matches = (worldcupData as { matches: RawMatch[] }).matches;

  console.log(`Seeding ${matches.length} matches...`);

  await prisma.partido.deleteMany();

  const data = matches.map((m) => {
    const stadium = m.ground ? stadiumByCity.get(m.ground) : undefined;
    return {
      equipoLocal: m.team1,
      equipoVisitante: m.team2,
      fechaPartido: parseDateTime(m.date, m.time),
      fase: roundToFase(m.round, m.group),
      grupo: m.group ? m.group.replace("Group ", "") : null,
      estadio: stadium?.name ?? null,
      ciudad: m.ground ?? null,
      bracketMatchId: TEAM1_TO_BRACKET_ID[m.team1] ?? null,
    };
  });

  const result = await prisma.partido.createMany({ data });
  console.log(`✓ Created ${result.count} partidos`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
