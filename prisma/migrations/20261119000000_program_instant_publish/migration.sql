ALTER TABLE "project_program"
  ADD COLUMN "studentProjectInstantPublish" BOOLEAN NOT NULL DEFAULT false;

-- 바로 올리기는 학생이 등록하는 방식에서만 뜻이 있다.
ALTER TABLE "project_program"
  ADD CONSTRAINT "project_program_instant_publish_requires_student_registration"
  CHECK (NOT "studentProjectInstantPublish" OR "studentProjectCreationEnabled");
