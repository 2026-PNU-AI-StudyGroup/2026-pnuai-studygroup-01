import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruitmentPostForm } from "@/app/recruitments/_components/recruitment-post-form";
import { createRecruitmentPostAction } from "@/app/recruitments/_actions/recruitment-actions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: {},
}));

vi.mock("@/app/recruitments/_actions/recruitment-actions", () => ({
  createRecruitmentPostAction: vi.fn(),
}));

describe("RecruitmentPostForm", () => {
  beforeEach(() => {
    vi.mocked(createRecruitmentPostAction).mockReset();
  });

  it("서버 오류 후에도 입력한 모집 정보와 마감 시간을 유지한다", async () => {
    vi.mocked(createRecruitmentPostAction).mockResolvedValue({
      status: "error",
      message: "모집 정보를 확인해 주세요.",
    });
    const { container } = render(
      <RecruitmentPostForm
        teams={[{ id: "team-1", name: "AI 스터디", memberCount: 3 }]}
      />
    );

    const titleInput = screen.getByLabelText("모집 제목");
    const contentInput = screen.getByLabelText("모집 내용");
    const roleInput = screen.getByLabelText("맡을 역할");
    const availabilityInput = screen.getByLabelText("활동 가능 시간");
    const capacityInput = screen.getByLabelText("팀 정원");

    fireEvent.change(titleInput, { target: { value: "백엔드 개발자 모집합니다" } });
    fireEvent.change(contentInput, { target: { value: "Next.js와 Spring Boot로 진행하는 프로젝트입니다." } });
    fireEvent.change(roleInput, { target: { value: "백엔드 API 구현" } });
    fireEvent.change(availabilityInput, { target: { value: "주 2회 저녁 모임" } });
    fireEvent.change(capacityInput, { target: { value: "6" } });
    fireEvent.click(screen.getByLabelText("모집 마감"));
    fireEvent.change(screen.getByLabelText("시간"), { target: { value: "18:30" } });

    const form = container.querySelector("form")!;
    const deadlineAt = new FormData(form).get("deadlineAt");
    fireEvent.submit(form);

    expect(await screen.findByRole("alert")).toHaveTextContent("모집 정보를 확인해 주세요.");

    expect(titleInput).toHaveValue("백엔드 개발자 모집합니다");
    expect(contentInput).toHaveValue("Next.js와 Spring Boot로 진행하는 프로젝트입니다.");
    expect(roleInput).toHaveValue("백엔드 API 구현");
    expect(availabilityInput).toHaveValue("주 2회 저녁 모임");
    expect(capacityInput).toHaveValue(6);
    expect(new FormData(form).get("teamId")).toBe("team-1");
    expect(new FormData(form).get("deadlineAt")).toBe(deadlineAt);
  });
});
