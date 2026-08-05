import { z } from "zod";

export const reportSubmissionSchema = z.object({
  teamId: z.string().uuid(),
  type: z.enum(["START", "MIDTERM", "FINAL"]),
  uploadId: z.string().uuid(),
  description: z.string().max(2_000),
});

const koreanLocalDateTime = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  .transform((value, context) => {
    const date = new Date(`${value}:00+09:00`);
    if (Number.isNaN(date.getTime())) {
      context.addIssue({ code: "custom", message: "보고서 기한을 확인해 주세요." });
      return z.NEVER;
    }
    return date;
  });

export const reportRequirementSchema = z.object({
  teamId: z.string().uuid(),
  type: z.enum(["START", "MIDTERM", "FINAL"]),
  dueAt: koreanLocalDateTime,
});

export const reportRequirementRemovalSchema = z.object({
  teamId: z.string().uuid(),
  type: z.enum(["START", "MIDTERM", "FINAL"]),
});

export const reportDecisionSchema = z.object({
  teamId: z.string().uuid(),
  reportVersionId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REVISION_REQUESTED"]),
  comment: z.string().max(2_000),
});

export const reportScoreSchema = z.object({
  teamId: z.string().uuid(),
  reportId: z.string().uuid(),
  score: z.coerce.number().int().min(0).max(100),
  comment: z.string().max(2_000).optional().default(""),
});

export const reportFeedbackSchema = z.object({
  teamId: z.string().uuid(),
  reportId: z.string().uuid(),
  body: z.string().trim().min(1).max(2_000),
});

export const artifactRegistrationSchema = z.object({
  teamId: z.string().uuid(),
  type: z.enum(["PRESENTATION_VIDEO", "SOURCE_CODE", "POSTER", "OTHER"]),
  title: z.string().trim().min(1).max(200),
  uploadId: z.string().uuid().optional(),
  externalUrl: z.url().optional(),
}).refine((value) => !!value.uploadId !== !!value.externalUrl);
