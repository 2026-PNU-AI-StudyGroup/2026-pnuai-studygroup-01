-- StudentProfile: 지원 정보 → 연락처
ALTER TABLE "student_profile" DROP COLUMN "interests";
ALTER TABLE "student_profile" DROP COLUMN "skills";
ALTER TABLE "student_profile" DROP COLUMN "desiredRole";
ALTER TABLE "student_profile" DROP COLUMN "availability";
ALTER TABLE "student_profile" DROP COLUMN "bio";
ALTER TABLE "student_profile" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "student_profile" ADD COLUMN "kakao" TEXT NOT NULL DEFAULT '';
ALTER TABLE "student_profile" ADD COLUMN "github" TEXT NOT NULL DEFAULT '';
ALTER TABLE "student_profile" ADD COLUMN "instagram" TEXT NOT NULL DEFAULT '';

-- 팀원 모집 지원: 기술/가능시간 제거
ALTER TABLE "student_team_recruitment_application" DROP COLUMN "skills";
ALTER TABLE "student_team_recruitment_application" DROP COLUMN "availability";
