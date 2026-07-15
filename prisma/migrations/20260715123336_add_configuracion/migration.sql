-- CreateTable
CREATE TABLE "Configuracion" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "mostrarPronosticosAntes" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);
