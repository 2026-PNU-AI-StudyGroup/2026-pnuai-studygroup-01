import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReceivedRecruitmentApplicationsView } from "@/app/recruitments/_components/received-recruitment-applications-view";

vi.mock("@/app/recruitments/_components/recruitment-decision-form", () => ({
  RecruitmentDecisionForm: ({ decision }: { decision: string }) => <button>{decision}</button>,
}));
vi.mock("@/app/_components/translated-text", () => ({
  TranslatedText: ({ text }: { text: string }) => <p>{text}</p>,
}));

describe("ReceivedRecruitmentApplicationsView", () => {
  it("공고를 거치지 않고 받은 지원을 바로 검토한다", () => {
    render(<ReceivedRecruitmentApplicationsView applications={[{
      id: "application-1",
      studentName: "김지원",
      message: "API 개발 경험을 프로젝트에 보태고 싶습니다.",
      desiredRole: "백엔드 개발",
      createdAt: new Date("2026-08-16"),
      postId: "post-1",
      postTitle: "백엔드 팀원 모집",
      teamId: "team-1",
      teamName: "코드웨이브",
      memberCount: 2,
      capacity: 4,
      sharedContacts: { kakao: "pnu-ai", github: "https://github.com/pnu-ai" },
    }]} />);

    expect(screen.getByRole("heading", { name: "받은 지원" })).toBeInTheDocument();
    expect(screen.getByText("김지원")).toBeInTheDocument();
    expect(screen.getByText("코드웨이브 · 백엔드 팀원 모집")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ACCEPT" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "REJECT" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "공유 연락처" })).toBeInTheDocument();
    expect(screen.getByText("pnu-ai")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://github.com/pnu-ai" })).toHaveAttribute("href", "https://github.com/pnu-ai");
  });
});
