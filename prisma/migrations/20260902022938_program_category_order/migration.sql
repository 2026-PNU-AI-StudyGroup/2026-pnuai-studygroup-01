-- CreateTable
CREATE TABLE "program_category_order" (
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_category_order_pkey" PRIMARY KEY ("name")
);
