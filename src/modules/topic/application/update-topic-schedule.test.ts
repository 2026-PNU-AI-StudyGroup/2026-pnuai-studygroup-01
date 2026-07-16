import { describe, expect, it, vi } from "vitest";

import {
  TopicScheduleUpdateForbiddenError,
  TopicScheduleUpdateUnavailableError,
  UpdateTopicScheduleService,
} from "@/modules/topic/application/update-topic-schedule";

const schedule = {
  recruitmentStartsAt: new Date("2026-03-01T00:00:00Z"),
  recruitmentEndsAt: new Date("2026-03-31T00:00:00Z"),
  executionStartsAt: new Date("2026-03-15T00:00:00Z"),
  executionEndsAt: new Date("2026-06-30T00:00:00Z"),
  submissionStartsAt: new Date("2026-06-01T00:00:00Z"),
  submissionEndsAt: new Date("2026-07-15T00:00:00Z"),
};

describe("주제 일정 변경", () => {
  it("교수의 겹치는 모집·수행·제출 기간을 저장한다", async () => {
    const updater = { updateSchedule: vi.fn(async () => true) };
    await new UpdateTopicScheduleService(updater).execute(
      { id: "professor-1", role: "PROFESSOR" },
      "topic-1",
      schedule,
    );
    expect(updater.updateSchedule).toHaveBeenCalledWith(
      "topic-1",
      { id: "professor-1", role: "PROFESSOR" },
      schedule,
    );
  });

  it("학생과 저장 불가능한 주제를 거절한다", async () => {
    const updater = { updateSchedule: vi.fn(async () => false) };
    const service = new UpdateTopicScheduleService(updater);
    await expect(service.execute({ id: "student-1", role: "STUDENT" }, "topic-1", schedule))
      .rejects.toBeInstanceOf(TopicScheduleUpdateForbiddenError);
    await expect(service.execute({ id: "professor-1", role: "PROFESSOR" }, "topic-1", schedule))
      .rejects.toBeInstanceOf(TopicScheduleUpdateUnavailableError);
  });
});
