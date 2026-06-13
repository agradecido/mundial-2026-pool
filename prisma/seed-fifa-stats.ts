import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "dotenv";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import path from "path";

config({ path: ".env.local" });
config({ path: ".env" });

const adapter = new PrismaNeon({
  connectionString: process.env.PORRA_POSTGRES_PRISMA_URL!,
});
const prisma = new PrismaClient({ adapter });

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .trim();
}

interface FifaRow {
  Name: string;
  OVR: string;
  PAC: string;
  SHO: string;
  PAS: string;
  DRI: string;
  DEF: string;
  PHY: string;
  Position: string;
}

async function loadFifaCsv(): Promise<Map<string, FifaRow>> {
  const map = new Map<string, FifaRow>();
  const csvPath = path.join(process.cwd(), "male_players_fifa_ea_sports_2025.csv");

  let headers: string[] = [];
  const rl = createInterface({ input: createReadStream(csvPath) });

  for await (const line of rl) {
    if (!headers.length) {
      headers = parseCSVLine(line);
      continue;
    }
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i] ?? ""));

    const key = normalize(row["Name"] ?? "");
    if (key) map.set(key, row as unknown as FifaRow);
  }

  return map;
}

// Minimal CSV line parser handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function int(v: string | undefined): number | null {
  const n = parseInt(v ?? "");
  return isNaN(n) ? null : n;
}

async function main() {
  console.log("Cargando CSV de FIFA...");
  const fifa = await loadFifaCsv();
  console.log(`  ${fifa.size} jugadores en FIFA`);

  const jugadores = await prisma.jugador.findMany({
    select: { id: true, nombre: true },
  });
  console.log(`  ${jugadores.length} jugadores en BD`);

  let actualizados = 0;
  let sinDatos = 0;

  for (const j of jugadores) {
    const key = normalize(j.nombre);
    const row = fifa.get(key);

    if (!row) {
      sinDatos++;
      continue;
    }

    await prisma.jugador.update({
      where: { id: j.id },
      data: {
        fifaOvr: int(row.OVR),
        fifaPac: int(row.PAC),
        fifaSho: int(row.SHO),
        fifaPas: int(row.PAS),
        fifaDri: int(row.DRI),
        fifaDef: int(row.DEF),
        fifaPhy: int(row.PHY),
        fifaPos: row.Position || null,
      },
    });
    actualizados++;
  }

  console.log(`✓ ${actualizados} jugadores actualizados con stats FIFA`);
  console.log(`  ${sinDatos} jugadores sin datos en FIFA (ligas no cubiertas)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
