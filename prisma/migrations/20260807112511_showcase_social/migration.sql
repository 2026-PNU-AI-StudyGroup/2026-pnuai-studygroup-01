-- AlterTable
ALTER TABLE "project_showcase" ADD COLUMN     "awardColor" TEXT,
ADD COLUMN     "awardName" TEXT;

-- CreateTable
CREATE TABLE "showcase_like" (
    "id" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showcase_like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcase_comment" (
    "id" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showcase_comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "showcase_like_showcaseId_idx" ON "showcase_like"("showcaseId");

-- CreateIndex
CREATE UNIQUE INDEX "showcase_like_showcaseId_userId_key" ON "showcase_like"("showcaseId", "userId");

-- CreateIndex
CREATE INDEX "showcase_comment_showcaseId_createdAt_idx" ON "showcase_comment"("showcaseId", "createdAt");

-- AddForeignKey
ALTER TABLE "showcase_like" ADD CONSTRAINT "showcase_like_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "project_showcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_comment" ADD CONSTRAINT "showcase_comment_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "project_showcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
