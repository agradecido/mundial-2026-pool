-- CreateEnum
CREATE TYPE "PosicionJugador" AS ENUM ('GK', 'DF', 'MF', 'FW');

-- CreateTable
CREATE TABLE "Jugador" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "seleccion" TEXT NOT NULL,
    "dorsal" INTEGER NOT NULL,
    "posicion" "PosicionJugador" NOT NULL,
    "edad" INTEGER,
    "partidosInt" INTEGER NOT NULL DEFAULT 0,
    "goles" INTEGER NOT NULL DEFAULT 0,
    "clubActual" TEXT,

    CONSTRAINT "Jugador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Jugador_seleccion_idx" ON "Jugador"("seleccion");

-- CreateIndex
CREATE UNIQUE INDEX "Jugador_seleccion_dorsal_key" ON "Jugador"("seleccion", "dorsal");
