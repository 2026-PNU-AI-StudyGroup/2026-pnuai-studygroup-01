import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProjectApprovalDetailPage from "@/app/project-approvals/[requestId]/page";

const { getApproval, getCurrentActor } = vi.hoisted(() => ({
  getApproval: vi.fn(),
  getCurrentActor: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({ getLocalizedMetadata: vi.fn() }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor }));
vi.mock("@/modules/topic-approval/application/manage-topic-approvals", () => ({ TopicApprovalService: class { get = getApproval; } }));
vi.mock("@/modules/topic-approval/infrastructure/prisma-topic-approval-repository", () => ({ PrismaTopicApprovalRepository: class {} }));
vi.mock("@/modules/project-program/infrastructure/prisma-project-program-repository", () => ({ PrismaProjectProgramRepository: class {} }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock("@/app/_components/app-shell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/app/_components/admin-workspace", () => ({ AdminWorkspace: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/app/_components/professor-workspace", () => ({ ProfessorWorkspace: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/app/_components/topic-approval-decision-form", () => ({ TopicApprovalDecisionForm: () => <form aria-label="승인 결정 폼" /> }));

const request = {
  id: "request-1",
  topicId: "topic-1",
  topicTitle: "접근성 지도 프로젝트",
  requesterId: "student-1",
  requesterName: "김학생",
  route: "PROFESSOR" as const,
  requestedProfessorId: "professor-1",
  requestedProfessorName: "박교수",
  status: "PENDING" as const,
  reviewComment: "",
  createdAt: new Date("2026-08-01T00:00:00Z"),
  decidedAt: null,
  programName: "2026 캡스톤",
  programCategory: "교과",
  description: "휠체어 사용자를 위한 실내 길찾기를 만듭니다.",
  requiredSkills: ["TypeScript"],
  preferredSkills: ["Figma"],
  roleExpectations: "사용자 조사와 개발",
  availabilityRequirement: "주 1회 대면 회의",
  applicationMode: "INDIVIDUAL_OR_TEAM" as const,
  capacity: 4,
  recruitmentStartsAt: new Date("2026-08-01T00:00:00Z"),
  recruitmentEndsAt: new Date("2026-08-10T00:00:00Z"),
  executionStartsAt: new Date("2026-08-11T00:00:00Z"),
  executionEndsAt: new Date("2026-09-10T00:00:00Z"),
  submissionStartsAt: new Date("2026-09-01T00:00:00Z"),
  submissionEndsAt: new Date("2026-09-20T00:00:00Z"),
  applicationQuestions: [{ id: "question-1", label: "지원 동기", maxLength: 500, required: true }],
};

describe("프로젝트 승인 요청 상세", () => {
  beforeEach(() => {
    getApproval.mockReset().mockResolvedValue(request);
    getCurrentActor.mockReset();
  });

  it("지정 교수에게 제안 본문, 조건, 일정과 상세 전용 결정 폼을 보여준다", async () => {
    getCurrentActor.mockResolvedValue({ id: "professor-1", name: "박교수", role: "PROFESSOR" });

    render(await ProjectApprovalDetailPage({ params: Promise.resolve({ requestId: "request-1" }) }));

    expect(screen.getByRole("heading", { name: "접근성 지도 프로젝트" })).toBeInTheDocument();
    expect(screen.getByText("휠체어 사용자를 위한 실내 길찾기를 만듭니다.")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("지원 동기")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "프로젝트 일정" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "승인 결정 폼" })).toBeInTheDocument();
  });

  it("학생에게 처리 결과는 보여주되 결정 폼은 노출하지 않는다", async () => {
    getCurrentActor.mockResolvedValue({ id: "student-1", name: "김학생", role: "STUDENT" });
    getApproval.mockResolvedValue({ ...request, status: "APPROVED", reviewComment: "공개 승인", decidedAt: new Date("2026-08-02T00:00:00Z") });

    render(await ProjectApprovalDetailPage({ params: Promise.resolve({ requestId: "request-1" }) }));

    expect(screen.getByRole("heading", { name: "검토 결과" })).toBeInTheDocument();
    expect(screen.getByText("공개 승인")).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "승인 결정 폼" })).not.toBeInTheDocument();
  });
});
