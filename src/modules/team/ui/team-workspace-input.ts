import { z } from "zod";

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((value, context) => {
    const [year, month, day] = value.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth) {
      context.addIssue({ code: "custom", message: "유효하지 않은 날짜입니다." });
      return z.NEVER;
    }
    return new Date(`${value}T23:59:00+09:00`);
  });

export const milestoneInputSchema = z.object({
  teamId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  dueAt: calendarDate,
});

export const milestoneStatusInputSchema = z.object({
  teamId: z.string().uuid(),
  milestoneId: z.string().uuid(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
});

export const progressUpdateInputSchema = z.object({
  teamId: z.string().uuid(),
  content: z.string().trim().min(1).max(5_000),
  risk: z.string().trim().max(2_000),
  nextAction: z.string().trim().max(2_000),
});

export const discussionPostInputSchema = z.object({
  teamId: z.string().uuid(),
  content: z.string().trim().min(1).max(2_000),
});
