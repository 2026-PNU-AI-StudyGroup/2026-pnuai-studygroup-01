import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/onboarding/_actions/complete-onboarding-action", () => ({
  completeOnboardingAction: vi.fn(),
}));

import { StudentOnboardingForm } from "@/app/onboarding/_components/student-onboarding-form";

describe("신규 학생 가입 정보 폼", () => {
  it("최초 가입에 필요한 여섯 가지 정보를 모두 받는다", () => {
    render(<StudentOnboardingForm defaultName="김학생" />);

    expect(screen.getByLabelText("이름")).toHaveValue("김학생");
    expect(screen.getByLabelText("학과")).toBeRequired();
    expect(screen.getByLabelText("학번")).toBeRequired();
    expect(screen.getByLabelText("학년")).toBeRequired();
    expect(screen.getByLabelText("휴대폰 번호")).toBeRequired();
    expect(screen.getByLabelText("자주 쓰는 이메일 주소")).toHaveAttribute("type", "email");
    expect(screen.getByRole("button", { name: "가입 정보 저장" })).toBeInTheDocument();
  });
});
