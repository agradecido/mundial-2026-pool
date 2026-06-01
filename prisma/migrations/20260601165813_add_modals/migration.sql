-- CreateTable
CREATE TABLE "Modal" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📢',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Modal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModalDismissal" (
    "userId" TEXT NOT NULL,
    "modalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModalDismissal_pkey" PRIMARY KEY ("userId","modalId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Modal_slug_key" ON "Modal"("slug");

-- AddForeignKey
ALTER TABLE "ModalDismissal" ADD CONSTRAINT "ModalDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModalDismissal" ADD CONSTRAINT "ModalDismissal_modalId_fkey" FOREIGN KEY ("modalId") REFERENCES "Modal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
