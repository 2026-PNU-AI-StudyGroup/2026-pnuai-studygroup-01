UPDATE "topic"
SET "requiredSkills" = ARRAY['별도 협의']::TEXT[]
WHERE cardinality("requiredSkills") = 0;

UPDATE "topic"
SET "roleExpectations" = '세부 역할 별도 협의'
WHERE btrim("roleExpectations") = '';

UPDATE "topic"
SET "availabilityRequirement" = '활동 가능 시간 별도 협의'
WHERE btrim("availabilityRequirement") = '';

ALTER TABLE "topic"
  ALTER COLUMN "requiredSkills" SET DEFAULT ARRAY['별도 협의']::TEXT[],
  ALTER COLUMN "roleExpectations" SET DEFAULT '세부 역할 별도 협의',
  ALTER COLUMN "availabilityRequirement" SET DEFAULT '활동 가능 시간 별도 협의';
