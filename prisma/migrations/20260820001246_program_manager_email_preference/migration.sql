-- AlterTable
ALTER TABLE "email_preference" ADD COLUMN     "programActivityEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "program_manager" (
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_manager_pkey" PRIMARY KEY ("programId","userId")
);

-- CreateIndex
CREATE INDEX "program_manager_userId_idx" ON "program_manager"("userId");

-- AddForeignKey
ALTER TABLE "program_manager" ADD CONSTRAINT "program_manager_programId_fkey" FOREIGN KEY ("programId") REFERENCES "project_program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_manager" ADD CONSTRAINT "program_manager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
