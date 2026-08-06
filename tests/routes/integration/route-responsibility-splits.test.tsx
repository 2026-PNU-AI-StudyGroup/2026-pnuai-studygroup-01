import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentActorMock,
  listProfessorAccessMock,
  listProfessorAuditMock,
  getStudentProfileMock,
} = vi.hoisted(() => ({
  getCurrentActorMock: vi.fn(),
  listProfessorAccessMock: vi.fn(),
  listProfessorAuditMock: vi.fn(),
  getStudentProfileMock: vi.fn(),
}));

vi.mock("@/modules/identity/infrastructure/current-actor", () => ({
  getCurrentActor: getCurrentActorMock,
}));
vi.mock("@/modules/identity/application/manage-professor-access", () => ({
  ProfessorAccessService: class {
    list = listProfessorAccessMock;
    listAudit = listProfessorAuditMock;
  },
}));
vi.mock("@/modules/identity/application/manage-student-profile", () => ({
  StudentProfileService: class {
    get = getStudentProfileMock;
  },
}));
vi.mock("@/modules/identity/infrastructure/prisma-professor-access-repository", () => ({ PrismaProfessorAccessRepository: class {} }));
vi.mock("@/modules/identity/infrastructure/prisma-student-profile-repository", () => ({ PrismaStudentProfileRepository: class {} }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock("@/app/_components/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import AccountPage from "@/app/account/page";
import StudentProfilePage from "@/app/account/profile/page";
import ProfessorsPage from "@/app/admin/professors/page";
import ProfessorHistoryPage from "@/app/admin/professors/history/page";
import NewProfessorPage from "@/app/admin/professors/new/page";

const admin = { id: "admin-1", name: "관리자", email: "admin@pusan.ac.kr", role: "ADMIN" as const };
const student = { id: "student-1", name: "학생", email: "student@pusan.ac.kr", role: "STUDENT" as const };
const profile = {
  interests: ["접근성"],
  skills: ["TypeScript"],
  desiredRole: "프론트엔드 개발",
  availability: "평일 저녁",
  bio: "사용하기 좋은 서비스를 만듭니다.",
};

describe("화면 책임 분리", () => {
  beforeEach(() => {
    getCurrentActorMock.mockReset();
    listProfessorAccessMock.mockReset();
    listProfessorAuditMock.mockReset();
    getStudentProfileMock.mockReset();
  });

  it("교수 권한 목록에서 등록과 변경 이력을 독립 화면으로 연결한다", async () => {
    getCurrentActorMock.mockResolvedValue(admin);
    listProfessorAccessMock.mockResolvedValue([]);
    render(await ProfessorsPage());

    expect(screen.queryByRole("link", { name: "교수 이메일 등록" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "첫 교수 이메일 등록" })).toHaveAttribute("href", "/admin/professors/new");
    expect(screen.getByRole("link", { name: "변경 이력" })).toHaveAttribute("href", "/admin/professors/history");
    expect(screen.queryByRole("textbox", { name: "부산대학교 교수 이메일" })).not.toBeInTheDocument();
  });

  it("교수 등록과 변경 이력 화면이 각각 하나의 책임만 제공한다", async () => {
    getCurrentActorMock.mockResolvedValue(admin);
    const newProfessor = render(await NewProfessorPage());
    expect(screen.getByRole("textbox", { name: "부산대학교 교수 이메일" })).toBeInTheDocument();
    newProfessor.unmount();

    listProfessorAuditMock.mockResolvedValue([]);
    render(await ProfessorHistoryPage());
    expect(screen.getByRole("heading", { name: "교수 권한 변경 이력" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "부산대학교 교수 이메일" })).not.toBeInTheDocument();
  });

  it("마이페이지는 프로필 요약만 보여주고 편집은 별도 화면에서 제공한다", async () => {
    getCurrentActorMock.mockResolvedValue(student);
    getStudentProfileMock.mockResolvedValue(profile);
    const account = render(await AccountPage());

    expect(screen.getByRole("link", { name: "지원 정보 수정" })).toHaveAttribute("href", "/account/profile");
    expect(screen.queryByRole("textbox", { name: "관심 분야" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "바로가기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "로그인 세션" })).not.toBeInTheDocument();
    account.unmount();

    const profileEdit = render(await StudentProfilePage());
    expect(screen.getByRole("button", { name: "접근성 삭제" })).toBeInTheDocument();
    expect(profileEdit.container.querySelector<HTMLInputElement>('input[name="interests"]')).toHaveValue("접근성");
    expect(screen.getAllByRole("link", { name: "계정 정보" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "계정 정보" })).toHaveAttribute("href", "/account");
  });
});
