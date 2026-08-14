-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ADVISOR_REGISTERED';
ALTER TYPE "AuditAction" ADD VALUE 'ADVISOR_TOKEN_ISSUED';
ALTER TYPE "AuditAction" ADD VALUE 'ADVISOR_TOKEN_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'ADVISOR_TEAMS_ASSIGNED';
