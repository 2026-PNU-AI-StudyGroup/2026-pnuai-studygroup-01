CREATE TYPE "TranslationJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

ALTER TABLE "user"
ADD COLUMN "preferredLocale" TEXT NOT NULL DEFAULT 'ko';

ALTER TABLE "user"
ADD CONSTRAINT "user_preferred_locale_check"
CHECK ("preferredLocale" IN ('ko', 'en'));

CREATE TABLE "translation_source" (
    "hash" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "translation_source_pkey" PRIMARY KEY ("hash")
);

CREATE TABLE "stored_translation" (
    "id" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "targetLocale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "translatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stored_translation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stored_translation_target_locale_check" CHECK ("targetLocale" IN ('ko', 'en')),
    CONSTRAINT "stored_translation_text_not_blank_check" CHECK (length(btrim("text")) > 0)
);

CREATE TABLE "translation_job" (
    "id" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "targetLocale" TEXT NOT NULL,
    "status" "TranslationJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "translation_job_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "translation_job_target_locale_check" CHECK ("targetLocale" IN ('ko', 'en')),
    CONSTRAINT "translation_job_attempts_check" CHECK ("attempts" >= 0)
);

CREATE UNIQUE INDEX "stored_translation_sourceHash_targetLocale_key"
ON "stored_translation"("sourceHash", "targetLocale");
CREATE INDEX "stored_translation_targetLocale_sourceHash_idx"
ON "stored_translation"("targetLocale", "sourceHash");
CREATE UNIQUE INDEX "translation_job_sourceHash_targetLocale_key"
ON "translation_job"("sourceHash", "targetLocale");
CREATE INDEX "translation_job_status_availableAt_createdAt_idx"
ON "translation_job"("status", "availableAt", "createdAt");

ALTER TABLE "stored_translation"
ADD CONSTRAINT "stored_translation_sourceHash_fkey"
FOREIGN KEY ("sourceHash") REFERENCES "translation_source"("hash")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "translation_job"
ADD CONSTRAINT "translation_job_sourceHash_fkey"
FOREIGN KEY ("sourceHash") REFERENCES "translation_source"("hash")
ON DELETE CASCADE ON UPDATE CASCADE;

WITH existing_texts AS (
    SELECT "title" AS text FROM "topic"
    UNION SELECT "description" FROM "topic"
    UNION SELECT unnest("requiredSkills") FROM "topic"
    UNION SELECT unnest("preferredSkills") FROM "topic"
    UNION SELECT "roleExpectations" FROM "topic"
    UNION SELECT "availabilityRequirement" FROM "topic"
    UNION SELECT "label" FROM "topic_application_question"
    UNION SELECT "value" FROM "topic_application_answer"
    UNION SELECT "name" FROM "project_program"
    UNION SELECT "category" FROM "project_program"
    UNION SELECT "description" FROM "project_program"
    UNION SELECT "title" FROM "recruitment_post"
    UNION SELECT "content" FROM "recruitment_post"
    UNION SELECT unnest("requiredSkills") FROM "recruitment_post"
    UNION SELECT "roleNeeded" FROM "recruitment_post"
    UNION SELECT "availability" FROM "recruitment_post"
    UNION SELECT "title" FROM "student_team_recruitment_post"
    UNION SELECT "content" FROM "student_team_recruitment_post"
    UNION SELECT unnest("requiredSkills") FROM "student_team_recruitment_post"
    UNION SELECT "roleNeeded" FROM "student_team_recruitment_post"
    UNION SELECT "availability" FROM "student_team_recruitment_post"
    UNION SELECT "message" FROM "student_team_recruitment_application"
    UNION SELECT unnest("skills") FROM "student_team_recruitment_application"
    UNION SELECT "desiredRole" FROM "student_team_recruitment_application"
    UNION SELECT "availability" FROM "student_team_recruitment_application"
    UNION SELECT "message" FROM "topic_application"
    UNION SELECT unnest("skills") FROM "topic_application"
    UNION SELECT "desiredRole" FROM "topic_application"
    UNION SELECT "availability" FROM "topic_application"
    UNION SELECT "content" FROM "discussion_post"
    UNION SELECT "title" FROM "milestone"
    UNION SELECT unnest("interests") FROM "student_profile"
    UNION SELECT unnest("skills") FROM "student_profile"
    UNION SELECT "desiredRole" FROM "student_profile"
    UNION SELECT "availability" FROM "student_profile"
    UNION SELECT "bio" FROM "student_profile"
),
normalized AS (
    SELECT DISTINCT btrim(text) AS text
    FROM existing_texts
    WHERE text IS NOT NULL AND length(btrim(text)) BETWEEN 1 AND 8000
)
INSERT INTO "translation_source" ("hash", "text")
SELECT encode(sha256(convert_to(text, 'UTF8')), 'hex'), text
FROM normalized
ON CONFLICT ("hash") DO NOTHING;

INSERT INTO "translation_job" (
    "id", "sourceHash", "targetLocale", "status", "attempts",
    "availableAt", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    source."hash",
    locale.target,
    'PENDING'::"TranslationJobStatus",
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "translation_source" AS source
CROSS JOIN (VALUES ('ko'), ('en')) AS locale(target)
ON CONFLICT ("sourceHash", "targetLocale") DO NOTHING;
