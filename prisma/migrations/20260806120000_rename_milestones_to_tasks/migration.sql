ALTER TYPE "MilestoneStatus" RENAME TO "TaskStatus";

ALTER TABLE "milestone" RENAME TO "task";
ALTER TABLE "milestone_assignee" RENAME TO "task_assignee";
ALTER TABLE "task_assignee" RENAME COLUMN "milestoneId" TO "taskId";

ALTER TABLE "task" RENAME CONSTRAINT "milestone_pkey" TO "task_pkey";
ALTER TABLE "task" RENAME CONSTRAINT "milestone_teamId_fkey" TO "task_teamId_fkey";
ALTER TABLE "task" RENAME CONSTRAINT "milestone_createdById_fkey" TO "task_createdById_fkey";
ALTER TABLE "task" RENAME CONSTRAINT "milestone_title_length" TO "task_title_length";

ALTER TABLE "task_assignee" RENAME CONSTRAINT "milestone_assignee_pkey" TO "task_assignee_pkey";
ALTER TABLE "task_assignee" RENAME CONSTRAINT "milestone_assignee_milestoneId_fkey" TO "task_assignee_taskId_fkey";
ALTER TABLE "task_assignee" RENAME CONSTRAINT "milestone_assignee_userId_fkey" TO "task_assignee_userId_fkey";

ALTER INDEX "milestone_teamId_dueAt_idx" RENAME TO "task_teamId_dueAt_idx";
ALTER INDEX "milestone_assignee_userId_idx" RENAME TO "task_assignee_userId_idx";

UPDATE "notification"
SET "title" = replace("title", '마일스톤', '할 일'),
    "body" = replace("body", '마일스톤', '할 일'),
    "href" = replace("href", '/milestones', '/tasks'),
    "dedupeKey" = replace("dedupeKey", 'deadline:milestone:', 'deadline:task:')
WHERE "dedupeKey" LIKE 'deadline:milestone:%';
