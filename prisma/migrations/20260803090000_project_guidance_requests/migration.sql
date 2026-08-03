CREATE TYPE "ProjectGuidanceRequestKind" AS ENUM (
  'MEETING',
  'REVIEW'
);

CREATE TYPE "ProjectGuidanceRequestStatus" AS ENUM (
  'PENDING',
  'ANSWERED',
  'CANCELED'
);

ALTER TYPE "NotificationType" ADD VALUE 'PROJECT_REQUEST';

CREATE TABLE "project_guidance_request" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "kind" "ProjectGuidanceRequestKind" NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "referenceUrl" TEXT,
  "preferredAt" TIMESTAMP(3),
  "status" "ProjectGuidanceRequestStatus" NOT NULL DEFAULT 'PENDING',
  "response" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "responderId" TEXT,
  "respondedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_guidance_request_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_guidance_request_kind_fields_check" CHECK (
    ("kind" = 'MEETING' AND "preferredAt" IS NOT NULL)
    OR ("kind" = 'REVIEW' AND "preferredAt" IS NULL)
  ),
  CONSTRAINT "project_guidance_request_status_fields_check" CHECK (
    (
      "status" = 'PENDING'
      AND "response" IS NULL
      AND "scheduledAt" IS NULL
      AND "responderId" IS NULL
      AND "respondedAt" IS NULL
      AND "canceledAt" IS NULL
    )
    OR (
      "status" = 'ANSWERED'
      AND "response" IS NOT NULL
      AND "responderId" IS NOT NULL
      AND "respondedAt" IS NOT NULL
      AND "canceledAt" IS NULL
    )
    OR (
      "status" = 'CANCELED'
      AND "response" IS NULL
      AND "scheduledAt" IS NULL
      AND "responderId" IS NULL
      AND "respondedAt" IS NULL
      AND "canceledAt" IS NOT NULL
    )
  ),
  CONSTRAINT "project_guidance_request_schedule_kind_check" CHECK (
    "scheduledAt" IS NULL OR "kind" = 'MEETING'
  )
);

CREATE INDEX "project_guidance_request_teamId_status_createdAt_idx"
  ON "project_guidance_request"("teamId", "status", "createdAt");
CREATE INDEX "project_guidance_request_requesterId_createdAt_idx"
  ON "project_guidance_request"("requesterId", "createdAt");
CREATE UNIQUE INDEX "project_guidance_request_pending_kind_key"
  ON "project_guidance_request"("teamId", "requesterId", "kind")
  WHERE "status" = 'PENDING';

ALTER TABLE "project_guidance_request"
  ADD CONSTRAINT "project_guidance_request_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_guidance_request"
  ADD CONSTRAINT "project_guidance_request_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_guidance_request"
  ADD CONSTRAINT "project_guidance_request_responderId_fkey"
  FOREIGN KEY ("responderId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
