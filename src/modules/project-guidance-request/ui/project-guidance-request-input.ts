import { z } from "zod";

const koreanLocalDateTime = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  .transform((value, context) => {
    const [datePart, timePart] = value.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);
    const daysInMonth = month >= 1 && month <= 12
      ? new Date(Date.UTC(year, month, 0)).getUTCDate()
      : 0;

    if (
      year < 1 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > daysInMonth ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      context.addIssue({ code: "custom", message: "유효하지 않은 날짜와 시간입니다." });
      return z.NEVER;
    }

    return new Date(`${value}:00+09:00`);
  });

const optionalKoreanLocalDateTime = z.preprocess(
  (value) => value === "" ? undefined : value,
  koreanLocalDateTime.optional(),
);

const optionalHttpUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string()
    .trim()
    .pipe(z.url())
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, "HTTP 또는 HTTPS URL을 입력해 주세요.")
    .optional(),
);

export const createProjectGuidanceRequestSchema = z.object({
  teamId: z.string().uuid(),
  kind: z.enum(["MEETING", "REVIEW"]),
  title: z.string().trim().min(2).max(100),
  content: z.string().trim().min(5).max(2_000),
  referenceUrl: optionalHttpUrl,
  preferredAt: optionalKoreanLocalDateTime,
});

export const respondProjectGuidanceRequestSchema = z.object({
  teamId: z.string().uuid(),
  requestId: z.string().uuid(),
  response: z.string().trim().min(2).max(2_000),
  scheduledAt: optionalKoreanLocalDateTime,
});

export const cancelProjectGuidanceRequestSchema = z.object({
  teamId: z.string().uuid(),
  requestId: z.string().uuid(),
});
