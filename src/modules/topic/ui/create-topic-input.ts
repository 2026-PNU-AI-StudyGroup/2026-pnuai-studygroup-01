import { z } from "zod";

const KOREAN_LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function isValidCalendarDateTime(value: string): boolean {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

const koreanLocalDateTime = z
  .string()
  .regex(KOREAN_LOCAL_DATE_TIME)
  .transform((value, context) => {
    if (!isValidCalendarDateTime(value)) {
      context.addIssue({ code: "custom", message: "유효하지 않은 날짜입니다." });
      return z.NEVER;
    }

    const date = new Date(`${value}:00+09:00`);

    if (!Number.isFinite(date.getTime())) {
      context.addIssue({ code: "custom", message: "유효하지 않은 날짜입니다." });
      return z.NEVER;
    }

    return date;
  });

export const createTopicInputSchema = z.object({
  academicCycleId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10_000),
  capacity: z.coerce.number().int().min(1).max(100),
  recruitmentStartsAt: koreanLocalDateTime,
  recruitmentEndsAt: koreanLocalDateTime,
  executionStartsAt: koreanLocalDateTime,
  executionEndsAt: koreanLocalDateTime,
  submissionStartsAt: koreanLocalDateTime,
  submissionEndsAt: koreanLocalDateTime,
});
