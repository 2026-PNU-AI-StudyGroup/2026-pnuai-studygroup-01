-- 프로젝트 등록 승인·반려를 관리 이력에 남긴다. 누가 왜 반려했는지 추적이 안 되던 구멍을 막는다.
ALTER TYPE "AuditAction" ADD VALUE 'TOPIC_APPROVAL_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'TOPIC_APPROVAL_REJECTED';
