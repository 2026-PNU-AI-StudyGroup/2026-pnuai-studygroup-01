-- 사용자 작성 자연어 콘텐츠는 애플리케이션 저장소가 아니라 DB 경계에서 번역 큐에 등록한다.
-- 연락처, URL, 파일명, 식별자, 상태값과 자동 생성 알림은 의도적으로 대상에서 제외한다.
CREATE OR REPLACE FUNCTION "enqueue_translation_content"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  field_name TEXT;
  field_value JSONB;
  source_text TEXT;
  source_hash TEXT;
BEGIN
  FOREACH field_name IN ARRAY TG_ARGV LOOP
    field_value := to_jsonb(NEW) -> field_name;

    FOR source_text IN
      SELECT CASE jsonb_typeof(field_value)
        WHEN 'string' THEN field_value #>> '{}'
        ELSE item
      END
      FROM jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(field_value) = 'array' THEN field_value ELSE '[]'::jsonb END
      ) AS item
      UNION ALL
      SELECT field_value #>> '{}'
      WHERE jsonb_typeof(field_value) = 'string'
    LOOP
      source_text := btrim(source_text);
      IF source_text IS NULL OR char_length(source_text) = 0 OR char_length(source_text) > 8000 THEN
        CONTINUE;
      END IF;

      source_hash := encode(sha256(convert_to(source_text, 'UTF8')), 'hex');
      INSERT INTO "translation_source" ("hash", "text")
      VALUES (source_hash, source_text)
      ON CONFLICT ("hash") DO NOTHING;

      INSERT INTO "translation_job" (
        "id", "sourceHash", "targetLocale", "status", "attempts",
        "availableAt", "createdAt", "updatedAt"
      )
      VALUES
        (gen_random_uuid()::text, source_hash, 'ko'::text, 'PENDING'::"TranslationJobStatus", 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (gen_random_uuid()::text, source_hash, 'en'::text, 'PENDING'::"TranslationJobStatus", 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("sourceHash", "targetLocale") DO NOTHING;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "announcement_translation_enqueue"
AFTER INSERT OR UPDATE ON "announcement"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('title', 'content');

CREATE TRIGGER "program_translation_enqueue"
AFTER INSERT OR UPDATE ON "project_program"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('name', 'category');

CREATE TRIGGER "program_division_translation_enqueue"
AFTER INSERT OR UPDATE ON "program_track"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('name');

CREATE TRIGGER "program_report_definition_translation_enqueue"
AFTER INSERT OR UPDATE ON "program_report_definition"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('title');

CREATE TRIGGER "rubric_definition_translation_enqueue"
AFTER INSERT OR UPDATE ON "rubric_definition"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('title');

CREATE TRIGGER "rubric_criterion_translation_enqueue"
AFTER INSERT OR UPDATE ON "rubric_criterion"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('label');

CREATE TRIGGER "topic_translation_enqueue"
AFTER INSERT OR UPDATE ON "topic"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"(
  'title', 'description', 'advisorRole', 'requiredSkills', 'preferredSkills', 'roleExpectations', 'availabilityRequirement'
);

CREATE TRIGGER "topic_application_translation_enqueue"
AFTER INSERT OR UPDATE ON "topic_application"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('message', 'skills', 'desiredRole', 'availability', 'reviewComment');

CREATE TRIGGER "topic_application_question_translation_enqueue"
AFTER INSERT OR UPDATE ON "topic_application_question"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('label');

CREATE TRIGGER "topic_approval_request_translation_enqueue"
AFTER INSERT OR UPDATE ON "topic_approval_request"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('reviewComment');

CREATE TRIGGER "topic_application_answer_translation_enqueue"
AFTER INSERT OR UPDATE ON "topic_application_answer"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('value');

CREATE TRIGGER "project_team_translation_enqueue"
AFTER INSERT OR UPDATE ON "project_team"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('name', 'showcaseIntro');

CREATE TRIGGER "project_guidance_request_translation_enqueue"
AFTER INSERT OR UPDATE ON "project_guidance_request"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('title', 'content', 'response');

CREATE TRIGGER "student_team_translation_enqueue"
AFTER INSERT OR UPDATE ON "student_team"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('name', 'description');

CREATE TRIGGER "student_team_recruitment_post_translation_enqueue"
AFTER INSERT OR UPDATE ON "student_team_recruitment_post"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('title', 'content', 'requiredSkills', 'roleNeeded', 'availability');

CREATE TRIGGER "student_team_recruitment_application_translation_enqueue"
AFTER INSERT OR UPDATE ON "student_team_recruitment_application"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('message', 'desiredRole');

CREATE TRIGGER "recruitment_post_translation_enqueue"
AFTER INSERT OR UPDATE ON "recruitment_post"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('title', 'content', 'requiredSkills', 'roleNeeded', 'availability');

CREATE TRIGGER "task_translation_enqueue"
AFTER INSERT OR UPDATE ON "task"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('title');

CREATE TRIGGER "progress_update_translation_enqueue"
AFTER INSERT OR UPDATE ON "progress_update"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('content', 'risk', 'nextAction');

CREATE TRIGGER "discussion_post_translation_enqueue"
AFTER INSERT OR UPDATE ON "discussion_post"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('content');

CREATE TRIGGER "advisor_feedback_translation_enqueue"
AFTER INSERT OR UPDATE ON "advisor_feedback"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('body');

CREATE TRIGGER "report_translation_enqueue"
AFTER INSERT OR UPDATE ON "report"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('titleSnapshot');

CREATE TRIGGER "report_feedback_translation_enqueue"
AFTER INSERT OR UPDATE ON "report_feedback"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('body');

CREATE TRIGGER "report_version_translation_enqueue"
AFTER INSERT OR UPDATE ON "report_version"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('description');

CREATE TRIGGER "approval_decision_translation_enqueue"
AFTER INSERT OR UPDATE ON "approval_decision"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('comment');

CREATE TRIGGER "artifact_translation_enqueue"
AFTER INSERT OR UPDATE ON "artifact"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('title');

CREATE TRIGGER "feedback_post_translation_enqueue"
AFTER INSERT OR UPDATE ON "feedback_post"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('title', 'body');

CREATE TRIGGER "feedback_status_change_translation_enqueue"
AFTER INSERT OR UPDATE ON "feedback_status_change"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('note');

CREATE TRIGGER "feedback_comment_translation_enqueue"
AFTER INSERT OR UPDATE ON "feedback_comment"
FOR EACH ROW EXECUTE FUNCTION "enqueue_translation_content"('body');

WITH existing_texts AS (
  SELECT "title" AS text FROM "announcement"
  UNION SELECT "content" FROM "announcement"
  UNION SELECT "name" FROM "project_program"
  UNION SELECT "category" FROM "project_program"
  UNION SELECT "name" FROM "program_track"
  UNION SELECT "title" FROM "program_report_definition"
  UNION SELECT "title" FROM "rubric_definition"
  UNION SELECT "label" FROM "rubric_criterion"
  UNION SELECT "title" FROM "topic"
  UNION SELECT "description" FROM "topic"
  UNION SELECT "advisorRole" FROM "topic"
  UNION SELECT unnest("requiredSkills") FROM "topic"
  UNION SELECT unnest("preferredSkills") FROM "topic"
  UNION SELECT "roleExpectations" FROM "topic"
  UNION SELECT "availabilityRequirement" FROM "topic"
  UNION SELECT "message" FROM "topic_application"
  UNION SELECT unnest("skills") FROM "topic_application"
  UNION SELECT "desiredRole" FROM "topic_application"
  UNION SELECT "availability" FROM "topic_application"
  UNION SELECT "reviewComment" FROM "topic_application"
  UNION SELECT "label" FROM "topic_application_question"
  UNION SELECT "reviewComment" FROM "topic_approval_request"
  UNION SELECT "value" FROM "topic_application_answer"
  UNION SELECT "name" FROM "project_team"
  UNION SELECT "showcaseIntro" FROM "project_team"
  UNION SELECT "title" FROM "project_guidance_request"
  UNION SELECT "content" FROM "project_guidance_request"
  UNION SELECT "response" FROM "project_guidance_request"
  UNION SELECT "name" FROM "student_team"
  UNION SELECT "description" FROM "student_team"
  UNION SELECT "title" FROM "student_team_recruitment_post"
  UNION SELECT "content" FROM "student_team_recruitment_post"
  UNION SELECT unnest("requiredSkills") FROM "student_team_recruitment_post"
  UNION SELECT "roleNeeded" FROM "student_team_recruitment_post"
  UNION SELECT "availability" FROM "student_team_recruitment_post"
  UNION SELECT "message" FROM "student_team_recruitment_application"
  UNION SELECT "desiredRole" FROM "student_team_recruitment_application"
  UNION SELECT "title" FROM "recruitment_post"
  UNION SELECT "content" FROM "recruitment_post"
  UNION SELECT unnest("requiredSkills") FROM "recruitment_post"
  UNION SELECT "roleNeeded" FROM "recruitment_post"
  UNION SELECT "availability" FROM "recruitment_post"
  UNION SELECT "title" FROM "task"
  UNION SELECT "content" FROM "progress_update"
  UNION SELECT "risk" FROM "progress_update"
  UNION SELECT "nextAction" FROM "progress_update"
  UNION SELECT "content" FROM "discussion_post"
  UNION SELECT "body" FROM "advisor_feedback"
  UNION SELECT "titleSnapshot" FROM "report"
  UNION SELECT "body" FROM "report_feedback"
  UNION SELECT "description" FROM "report_version"
  UNION SELECT "comment" FROM "approval_decision"
  UNION SELECT "title" FROM "artifact"
  UNION SELECT "title" FROM "feedback_post"
  UNION SELECT "body" FROM "feedback_post"
  UNION SELECT "note" FROM "feedback_status_change"
  UNION SELECT "body" FROM "feedback_comment"
), normalized AS (
  SELECT DISTINCT btrim(text) AS text
  FROM existing_texts
  WHERE text IS NOT NULL AND char_length(btrim(text)) BETWEEN 1 AND 8000
), sources AS (
  INSERT INTO "translation_source" ("hash", "text")
  SELECT encode(sha256(convert_to(text, 'UTF8')), 'hex'), text
  FROM normalized
  ON CONFLICT ("hash") DO NOTHING
)
INSERT INTO "translation_job" (
  "id", "sourceHash", "targetLocale", "status", "attempts",
  "availableAt", "createdAt", "updatedAt"
)
SELECT gen_random_uuid()::text, source."hash", locale.target, 'PENDING'::"TranslationJobStatus", 0,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "translation_source" AS source
JOIN normalized ON normalized.text = source."text"
CROSS JOIN (VALUES ('ko'::text), ('en'::text)) AS locale(target)
ON CONFLICT ("sourceHash", "targetLocale") DO NOTHING;
