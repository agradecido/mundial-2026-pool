-- CreateTable
CREATE TABLE "PartidoHistorico" (
    "id" TEXT NOT NULL,
    "torneo" TEXT NOT NULL,
    "fase" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "equipo1" TEXT NOT NULL,
    "equipo2" TEXT NOT NULL,
    "goles1" INTEGER NOT NULL,
    "goles2" INTEGER NOT NULL,

    CONSTRAINT "PartidoHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartidoHistorico_equipo1_equipo2_idx" ON "PartidoHistorico"("equipo1", "equipo2");
