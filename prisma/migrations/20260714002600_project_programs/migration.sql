CREATE TYPE "ProjectProgramStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

CREATE TABLE "project_program" (
  "id" TEXT NOT NULL,
  "academicCycleId" TEXT NOT NULL,
  "createdById" TEXT,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "ProjectProgramStatus" NOT NULL DEFAULT 'DRAFT',
  "openedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_program_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_program_academicCycleId_name_key" ON "project_program"("academicCycleId", "name");
CREATE UNIQUE INDEX "project_program_id_academicCycleId_key" ON "project_program"("id", "academicCycleId");
CREATE INDEX "project_program_status_startsAt_endsAt_idx" ON "project_program"("status", "startsAt", "endsAt");
ALTER TABLE "project_program" ADD CONSTRAINT "project_program_academicCycleId_fkey" FOREIGN KEY ("academicCycleId") REFERENCES "academic_cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_program" ADD CONSTRAINT "project_program_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "project_program" (
  "id", "academicCycleId", "createdById", "name", "category", "description",
  "startsAt", "endsAt", "status", "openedAt", "createdAt", "updatedAt"
)
SELECT
  'legacy-' || "academic_cycle"."id", "academic_cycle"."id", NULL,
  '기존 프로젝트', '기존 운영', '프로그램 기능 도입 전에 등록된 프로젝트',
  min("topic"."recruitmentStartsAt"), max("topic"."submissionEndsAt"),
  CASE WHEN bool_or("topic"."status" = 'PUBLISHED') THEN 'OPEN'::"ProjectProgramStatus" ELSE 'CLOSED'::"ProjectProgramStatus" END,
  min("topic"."publishedAt"), min("topic"."createdAt"), CURRENT_TIMESTAMP
FROM "academic_cycle" JOIN "topic" ON "topic"."academicCycleId" = "academic_cycle"."id"
GROUP BY "academic_cycle"."id";

ALTER TABLE "topic" ADD COLUMN "programId" TEXT;
UPDATE "topic" SET "programId" = 'legacy-' || "academicCycleId";
ALTER TABLE "topic" ALTER COLUMN "programId" SET NOT NULL;
CREATE INDEX "topic_programId_status_idx" ON "topic"("programId", "status");
ALTER TABLE "topic" ADD CONSTRAINT "topic_programId_academicCycleId_fkey" FOREIGN KEY ("programId", "academicCycleId") REFERENCES "project_program"("id", "academicCycleId") ON DELETE RESTRICT ON UPDATE CASCADE;
