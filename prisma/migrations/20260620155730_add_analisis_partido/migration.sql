-- CreateTable
CREATE TABLE "AnalisisPartido" (
    "id" TEXT NOT NULL,
    "partidoId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "generadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalisisPartido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalisisPartido_partidoId_key" ON "AnalisisPartido"("partidoId");

-- AddForeignKey
ALTER TABLE "AnalisisPartido" ADD CONSTRAINT "AnalisisPartido_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
