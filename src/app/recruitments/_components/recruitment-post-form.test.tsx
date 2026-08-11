import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
  it("입력한 모집 제목, 내용, 역할, 시간 데이터가 컴포넌트 상태로 유지된다", () => {
    render(
      <RecruitmentPostForm
        teams={[{ id: "team-1", name: "AI 스터디", memberCount: 3 }]}
      />
    );

    const titleInput = screen.getByLabelText("모집 제목");
    const contentInput = screen.getByLabelText("모집 내용");
    const roleInput = screen.getByLabelText("맡을 역할");
    const availabilityInput = screen.getByLabelText("활동 가능 시간");

    fireEvent.change(titleInput, { target: { value: "백엔드 개발자 모집합니다" } });
    fireEvent.change(contentInput, { target: { value: "Next.js와 Spring Boot로 진행하는 프로젝트입니다." } });
    fireEvent.change(roleInput, { target: { value: "백엔드 API 구현" } });
    fireEvent.change(availabilityInput, { target: { value: "주 2회 저녁 모임" } });

    expect(titleInput).toHaveValue("백엔드 개발자 모집합니다");
    expect(contentInput).toHaveValue("Next.js와 Spring Boot로 진행하는 프로젝트입니다.");
    expect(roleInput).toHaveValue("백엔드 API 구현");
    expect(availabilityInput).toHaveValue("주 2회 저녁 모임");
  });
});
