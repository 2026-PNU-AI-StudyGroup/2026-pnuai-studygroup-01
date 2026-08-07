-- AlterTable
ALTER TABLE "topic" ADD COLUMN     "trackId" TEXT;

-- CreateTable
CREATE TABLE "program_track" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_track_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "program_track_programId_position_idx" ON "program_track"("programId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "program_track_programId_name_key" ON "program_track"("programId", "name");

-- AddForeignKey
ALTER TABLE "program_track" ADD CONSTRAINT "program_track_programId_fkey" FOREIGN KEY ("programId") REFERENCES "project_program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic" ADD CONSTRAINT "topic_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "program_track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
