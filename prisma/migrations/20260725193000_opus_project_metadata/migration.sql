ALTER TABLE "topic"
ADD COLUMN "advisorRole" TEXT NOT NULL DEFAULT '교수';

ALTER TABLE "team"
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "thumbnailPath" TEXT,
ADD COLUMN "posterPath" TEXT;
