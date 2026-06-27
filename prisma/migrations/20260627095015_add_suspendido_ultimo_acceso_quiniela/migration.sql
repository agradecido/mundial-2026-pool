-- AlterTable
ALTER TABLE "User" ADD COLUMN     "suspendido" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ultimoAccesoQuiniela" TIMESTAMP(3);
