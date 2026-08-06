import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/professor/applications/_actions/received-application-actions", () => ({
  decideTopicApplicationAction: vi.fn(),
}));

import { ApplicationDecisionForm } from "@/app/professor/applications/_components/decision-form";

describe("교수 지원 결정 입력", () => {
  it("결정 전에 학생에게 전달할 검토 의견을 입력할 수 있다", () => {
    render(<ApplicationDecisionForm applicationId="60000000-0000-4000-8000-000000000001" impact={{
      acceptedMemberCount: 1,
      currentMemberCount: 2,
      capacity: 4,
      automaticallyRejectedApplicationCount: 0,
      closesRecruitment: false,
    }} />);

    expect(screen.getByRole("textbox", { name: /검토 의견/ })).toHaveAttribute("maxlength", "2000");
    expect(screen.getByRole("button", { name: "선정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "미선정" })).toBeInTheDocument();
  });
});
