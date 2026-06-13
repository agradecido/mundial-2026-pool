import { PrismaClient, PosicionJugador } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "dotenv";
import jugadoresData from "../jugadores_mundial_2026.json";

config({ path: ".env.local" });
config({ path: ".env" });

const adapter = new PrismaNeon({
  connectionString: process.env.PORRA_POSTGRES_PRISMA_URL!,
});
const prisma = new PrismaClient({ adapter });

const POSICION_MAP: Record<string, PosicionJugador> = {
  "1GK": PosicionJugador.GK,
  "2DF": PosicionJugador.DF,
  "3MF": PosicionJugador.MF,
  "4FW": PosicionJugador.FW,
};

function parseEdad(edad: string): number | null {
  const m = edad.match(/\d+/);
  return m ? parseInt(m[0]) : null;
}

async function main() {
  const data = jugadoresData as Record<string, Array<{
    dorsal: string;
    posicion: string;
    nombre: string;
    edad: string;
    partidos_int: string;
    goles: string;
    club_actual: string;
  }>>;

  let total = 0;
  let errores = 0;

  for (const [seleccion, jugadores] of Object.entries(data)) {
    for (const j of jugadores) {
      const posicion = POSICION_MAP[j.posicion];
      if (!posicion) {
        console.warn(`Posición desconocida: ${j.posicion} (${j.nombre})`);
        errores++;
        continue;
      }

      await prisma.jugador.upsert({
        where: { seleccion_dorsal: { seleccion, dorsal: parseInt(j.dorsal) } },
        update: {
          nombre: j.nombre,
          posicion,
          edad: parseEdad(j.edad),
          partidosInt: parseInt(j.partidos_int) || 0,
          goles: parseInt(j.goles) || 0,
          clubActual: j.club_actual || null,
        },
        create: {
          nombre: j.nombre,
          seleccion,
          dorsal: parseInt(j.dorsal),
          posicion,
          edad: parseEdad(j.edad),
          partidosInt: parseInt(j.partidos_int) || 0,
          goles: parseInt(j.goles) || 0,
          clubActual: j.club_actual || null,
        },
      });
      total++;
    }
  }

  console.log(`✓ ${total} jugadores importados (${errores} errores)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
