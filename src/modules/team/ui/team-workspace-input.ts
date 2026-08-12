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

export const taskInputSchema = z.object({
  teamId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  dueAt: calendarDate,
  assigneeIds: z.array(z.string().uuid()).max(100).default([]),
});

export const taskUpdateInputSchema = z.object({
  teamId: z.string().uuid(),
  taskId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  dueAt: calendarDate,
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  assigneeIds: z.array(z.string().uuid()).max(100).default([]),
});

export const taskDeleteInputSchema = z.object({
  teamId: z.string().uuid(),
  taskId: z.string().uuid(),
});

export const taskCompleteInputSchema = z.object({
  teamId: z.string().uuid(),
  taskId: z.string().uuid(),
});

export const discussionPostInputSchema = z.object({
  teamId: z.string().uuid(),
  content: z.string().trim().min(1).max(2_000),
});
