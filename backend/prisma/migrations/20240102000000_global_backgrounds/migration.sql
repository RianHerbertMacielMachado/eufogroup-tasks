-- CreateEnum
CREATE TYPE "GlobalBgScope" AS ENUM ('LOGIN', 'CITY_SELECT');

-- CreateTable
CREATE TABLE "global_backgrounds" (
    "id" TEXT NOT NULL,
    "scope" "GlobalBgScope" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_backgrounds_pkey" PRIMARY KEY ("id")
);
