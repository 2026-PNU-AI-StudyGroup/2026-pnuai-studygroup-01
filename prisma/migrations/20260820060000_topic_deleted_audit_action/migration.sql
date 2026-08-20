-- 관리자가 프로젝트를 삭제한 기록을 관리 이력에 남긴다.
ALTER TYPE "AuditAction" ADD VALUE 'TOPIC_DELETED';
