import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TopicScheduleForm } from "@/app/professor/topics/topic-schedule-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/professor/topics/actions", () => ({ updateTopicScheduleAction: vi.fn() }));

describe("주제 일정 변경 흐름", () => {
  it("주제 행을 펼치지 않고 별도 모달에서 여섯 기간을 편집한다", () => {
    const { container } = render(<TopicScheduleForm topicId="topic" topicTitle="캡스톤 플랫폼" values={{
      recruitmentStartsAt: "2026-08-01T09:00",
      recruitmentEndsAt: "2026-08-31T18:00",
      executionStartsAt: "2026-09-01T09:00",
      executionEndsAt: "2026-12-01T18:00",
      submissionStartsAt: "2026-11-01T09:00",
      submissionEndsAt: "2026-12-15T18:00",
    }} />);

    expect(container.querySelector("details")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "일정 변경" }));
    expect(screen.getByRole("dialog", { name: "캡스톤 플랫폼" })).toHaveAttribute("open");
    expect(screen.getByLabelText("제출 종료")).toHaveValue("2026-12-15T18:00");
  });
});
