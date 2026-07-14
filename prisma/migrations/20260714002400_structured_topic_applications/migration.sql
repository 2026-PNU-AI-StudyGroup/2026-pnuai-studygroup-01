ALTER TABLE "topic"
  ADD COLUMN "requiredSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "preferredSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "roleExpectations" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "availabilityRequirement" TEXT NOT NULL DEFAULT '';

ALTER TABLE "topic_application"
  ADD COLUMN "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "desiredRole" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "availability" TEXT NOT NULL DEFAULT '';
