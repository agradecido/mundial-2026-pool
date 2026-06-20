-- CreateTable
CREATE TABLE "PrediccionPartido" (
    "id" TEXT NOT NULL,
    "partidoId" TEXT NOT NULL,
    "homePercent" INTEGER NOT NULL,
    "drawPercent" INTEGER NOT NULL,
    "awayPercent" INTEGER NOT NULL,
    "marcador" TEXT NOT NULL,
    "generadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrediccionPartido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrediccionPartido_partidoId_key" ON "PrediccionPartido"("partidoId");

-- AddForeignKey
ALTER TABLE "PrediccionPartido" ADD CONSTRAINT "PrediccionPartido_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
