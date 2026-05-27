/**
 * Elimina todos los usuarios demo y sus datos asociados (cascade).
 * Uso: npm run seed:clean
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.PORRA_POSTGRES_PRISMA_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const { count } = await prisma.user.deleteMany({
    where: { email: { endsWith: "@demo.porra" } },
  });
  console.log(`\n🗑️  ${count} usuarios demo eliminados (pronósticos y predicciones en cascade).\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
