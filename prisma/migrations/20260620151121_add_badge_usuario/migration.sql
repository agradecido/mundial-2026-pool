-- CreateTable
CREATE TABLE "BadgeUsuario" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "generadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BadgeUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BadgeUsuario_userId_key" ON "BadgeUsuario"("userId");

-- AddForeignKey
ALTER TABLE "BadgeUsuario" ADD CONSTRAINT "BadgeUsuario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
