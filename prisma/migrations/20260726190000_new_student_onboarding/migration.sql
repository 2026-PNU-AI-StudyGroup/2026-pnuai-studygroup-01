ALTER TABLE "user"
ADD COLUMN "department" TEXT,
ADD COLUMN "studentNumber" TEXT,
ADD COLUMN "grade" INTEGER,
ADD COLUMN "phoneNumber" TEXT,
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "onboardingRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "user_studentNumber_key" ON "user"("studentNumber");
