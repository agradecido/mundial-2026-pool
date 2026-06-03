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
    };
  });

  const result = await prisma.partido.createMany({ data });
  console.log(`✓ Created ${result.count} partidos`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
