-- AlterTable
ALTER TABLE "Partido" ADD COLUMN "bracketMatchId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Partido_bracketMatchId_key" ON "Partido"("bracketMatchId");
