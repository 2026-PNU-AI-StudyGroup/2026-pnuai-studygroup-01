DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "artifact"
    WHERE "type" = 'PRESENTATION_VIDEO'
    GROUP BY "projectTeamId"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'A project team can have only one showcase video.';
  END IF;
END $$;

CREATE UNIQUE INDEX "artifact_one_presentation_video_per_team"
  ON "artifact" ("projectTeamId")
  WHERE "type" = 'PRESENTATION_VIDEO';
