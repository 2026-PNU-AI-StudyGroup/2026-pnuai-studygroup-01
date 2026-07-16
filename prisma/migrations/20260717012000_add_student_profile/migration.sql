CREATE TABLE "student_profile" (
  "userId" TEXT NOT NULL,
  "interests" TEXT[],
  "skills" TEXT[],
  "desiredRole" TEXT NOT NULL,
  "availability" TEXT NOT NULL,
  "bio" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_profile_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "student_profile"
ADD CONSTRAINT "student_profile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
