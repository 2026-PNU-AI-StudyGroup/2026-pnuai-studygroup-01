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
  type: z.enum(["SOURCE_CODE", "OTHER"]),
  title: z.string().trim().min(1).max(200),
  uploadId: z.string().uuid().optional(),
  externalUrl: z.url().optional(),
}).refine((value) => !!value.uploadId !== !!value.externalUrl);

export const showcaseImageSchema = z.object({
  teamId: z.string().uuid(),
  type: z.literal("IMAGE"),
  title: z.string().trim().min(1).max(200),
  uploadId: z.string().uuid(),
});

export const artifactUpdateSchema = z.object({
  teamId: z.string().uuid(),
  artifactId: z.string().uuid(),
  type: z.enum(["SOURCE_CODE", "POSTER", "OTHER", "IMAGE"]),
  title: z.string().trim().min(1).max(200),
});

export const artifactRemovalSchema = z.object({
  teamId: z.string().uuid(),
  artifactId: z.string().uuid(),
});

export const showcaseVideoSchema = z.object({
  teamId: z.string().uuid(),
  type: z.literal("PRESENTATION_VIDEO"),
  externalUrl: z.string().trim().min(1).max(2_048),
});

export const artifactReorderSchema = z.object({
  teamId: z.string().uuid(),
  orderedIds: z
    .string()
    .transform((value) => value.split(",").filter(Boolean))
    .pipe(z.array(z.string().uuid()).min(1)),
});

export const showcaseIntroSchema = z.object({
  teamId: z.string().uuid(),
  intro: z.string().max(20_000),
});

// 결과물 화면의 "전체 저장"은 소개 글과 영상 링크를 한 번에 받는다. 둘 다 비어 있을 수 있다.
export const showcaseBasicsSchema = z.object({
  teamId: z.string().uuid(),
  intro: z.string().max(20_000).optional(),
  externalUrl: z.string().trim().max(2_048).optional(),
});

export const teamThumbnailSchema = z.object({
  teamId: z.string().uuid(),
  uploadId: z.string().uuid().optional(),
});
