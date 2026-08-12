import { z } from "zod";

export const reportSubmissionSchema = z.object({
  teamId: z.string().uuid(),
  reportId: z.string().uuid(),
  uploadId: z.string().uuid(),
  description: z.string().max(2_000),
});

export const reportDecisionSchema = z.object({
  teamId: z.string().uuid(),
  reportVersionId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REVISION_REQUESTED"]),
  comment: z.string().max(2_000),
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

export const artifactUpdateSchema = z.object({
  teamId: z.string().uuid(),
  artifactId: z.string().uuid(),
  type: z.enum(["PRESENTATION_VIDEO", "SOURCE_CODE", "POSTER", "OTHER"]),
  title: z.string().trim().min(1).max(200),
});

export const artifactRemovalSchema = z.object({
  teamId: z.string().uuid(),
  artifactId: z.string().uuid(),
});
