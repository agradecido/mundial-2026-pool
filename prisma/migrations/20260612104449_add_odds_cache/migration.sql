-- CreateTable
CREATE TABLE "OddsCache" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OddsCache_pkey" PRIMARY KEY ("key")
);
