-- CreateTable
CREATE TABLE "project_showcase" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "githubUrl" TEXT,
    "youtubeUrl" TEXT,
    "demoUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_showcase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcase_image" (
    "id" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showcase_image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_showcase_teamId_key" ON "project_showcase"("teamId");

-- CreateIndex
CREATE INDEX "project_showcase_isPublished_publishedAt_idx" ON "project_showcase"("isPublished", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "showcase_image_fileId_key" ON "showcase_image"("fileId");

-- CreateIndex
CREATE INDEX "showcase_image_showcaseId_position_idx" ON "showcase_image"("showcaseId", "position");

-- AddForeignKey
ALTER TABLE "showcase_image" ADD CONSTRAINT "showcase_image_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "project_showcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
