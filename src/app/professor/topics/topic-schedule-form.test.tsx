import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TopicScheduleForm } from "@/app/professor/topics/topic-schedule-form";

vi.mock("@/app/professor/topics/actions", () => ({ updateTopicScheduleAction: vi.fn() }));

describe("주제 일정 변경 흐름", () => {
  it("독립 일정 페이지에서 여섯 기간을 한 흐름으로 편집한다", () => {
    render(<TopicScheduleForm topicId="topic" values={{
      recruitmentStartsAt: "2026-08-01T09:00",
      recruitmentEndsAt: "2026-08-31T18:00",
      executionStartsAt: "2026-09-01T09:00",
      executionEndsAt: "2026-12-01T18:00",
      submissionStartsAt: "2026-11-01T09:00",
      submissionEndsAt: "2026-12-15T18:00",
    }} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("제출 종료")).toHaveValue("2026-12-15T18:00");
    expect(screen.getByRole("button", { name: "일정 저장" })).toBeInTheDocument();
  });
});
