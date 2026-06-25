/**
 * One-time backfill: populates bracketMatchId for all knockout Partido records.
 * Safe to re-run — skips records that already have a bracketMatchId set.
 *
 * Run with: npx ts-node prisma/seed-bracket-ids.ts
 * Or add to package.json scripts: "seed:bracket-ids": "tsx prisma/seed-bracket-ids.ts"
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const adapter = new PrismaNeon({
  connectionString: process.env.PORRA_POSTGRES_PRISMA_URL!,
});
const prisma = new PrismaClient({ adapter });

// Maps equipoLocal placeholder (from worldcup.json seed) to bracketMatchId.
// D32: slotA values ("2A", "1E", etc.)
// D16: "W<P-num>" patterns (e.g. "W73" = winner of match P73 = D32-3)
// QF: "W<P-num>" of D16 matches
// SF: "W<P-num>" of QF matches
// FINAL/TERCER_PUESTO: winner/loser of SF matches
const EQUIPO_LOCAL_TO_BRACKET_ID: Record<string, string> = {
  // D32 matches (from worldcup.json team1 values)
  "2A": "D32-3",
  "1E": "D32-1",
  "1F": "D32-4",
  "1C": "D32-9",
  "1I": "D32-2",
  "2E": "D32-10",
  "1A": "D32-11",
  "1L": "D32-12",
  "1D": "D32-7",
  "1G": "D32-8",
  "2K": "D32-5",
  "1H": "D32-6",
  "1B": "D32-15",
  "1J": "D32-13",
  "1K": "D32-16",
  "2D": "D32-14",
  // D16 matches ("W<P-num>" where P-num = match number of the D32 match)
  "W74": "D16-1",
  "W73": "D16-2",
  "W76": "D16-5",
  "W79": "D16-6",
  "W83": "D16-3",
  "W81": "D16-4",
  "W86": "D16-7",
  "W85": "D16-8",
  // QF matches
  "W89": "QF-1",
  "W93": "QF-2",
  "W91": "QF-3",
  "W95": "QF-4",
  // SF matches
  "W97": "SF-1",
  "W99": "SF-2",
  // Final and 3rd place
  "W101": "FINAL",
  "L101": "TERCER_PUESTO",
};

async function main() {
  const knockoutPartidos = await prisma.partido.findMany({
    where: {
      fase: { not: "GRUPOS" },
      bracketMatchId: null,
    },
    select: { id: true, equipoLocal: true, fase: true },
  });

  console.log(`Found ${knockoutPartidos.length} knockout partidos without bracketMatchId`);

  let updated = 0;
  let skipped = 0;

  for (const partido of knockoutPartidos) {
    const bracketId = EQUIPO_LOCAL_TO_BRACKET_ID[partido.equipoLocal];

    if (!bracketId) {
      // equipoLocal was already changed from the placeholder (admin edited it).
      // We can't recover the bracketMatchId without additional context.
      console.warn(
        `  SKIP [${partido.fase}] id=${partido.id}: no mapping for equipoLocal="${partido.equipoLocal}"`
      );
      skipped++;
      continue;
    }

    await prisma.partido.update({
      where: { id: partido.id },
      data: { bracketMatchId: bracketId },
    });

    console.log(`  SET ${partido.id} → ${bracketId} (was equipoLocal="${partido.equipoLocal}")`);
    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
