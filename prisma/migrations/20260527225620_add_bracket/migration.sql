-- CreateTable
CREATE TABLE "PronosticoBracket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "picks" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PronosticoBracket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PronosticoBracket_userId_key" ON "PronosticoBracket"("userId");

-- AddForeignKey
ALTER TABLE "PronosticoBracket" ADD CONSTRAINT "PronosticoBracket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
